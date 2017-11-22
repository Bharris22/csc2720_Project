//system modules
import mongoose from 'mongoose';
import colors from 'colors';
import {ObjectId} from 'mongodb';
import _ from 'underscore';




//custom modules
import Util from '../utilities/util';
const  myUtil = new Util();


//-----------------------------------



if(process.env.NODE_ENV == "production")
{
	//...mongoLab URL...
	mongoose.connect("mongodb://WiseNN:Bladerz1@ds113606.mlab.com:13606/chatappproject");
	console.log("production...".green)
}else{
	mongoose.connect('mongodb://localhost/chatAppProject');	
	console.log("development...".green)
}


const db = mongoose.connection;


db.once('open', () => {console.log("database is connected!...".red);});

db.on('error', (err) => {console.log(("There was an error connecting to the database: "+err).red);});
var callNum = 0;

import dbSchema from './dbSchema';
//get Models from mongoose Schema 
const userPrivateConvos = mongoose.model('UserPrivateConvos');
// const privateConvo = mongoose.model('PrivateConvo');
const message = mongoose.model('Message');
const users = mongoose.model('Users');


//partial Filter Expressions
// privateConvo.collection.createIndex({"recipientId" : 1 } , {partialFilterExpression: { recipientId: {$exists:true}}}, function(err , result){
     
//      console.log(("Partial Filter Expression Logger: \nERR: "+err+"\nResults: "+result).black.bgYellow);
//  });


export default class chatAppDb
{
	
	constructor()
	{
		//binding scope of class
		this.createPrivateConvo = this.createPrivateConvo.bind(this);
		this.deletePrivateConvo = this.deletePrivateConvo.bind(this);
		this.addUser = this.addUser.bind(this);
		this.addVoiceRecognitionId = this.addVoiceRecognitionId.bind(this);
		this.removeUser = this.removeUser.bind(this);
		this.addMessage = this.addMessage.bind(this);
		this.readDb = this.readDb.bind(this);
		this.saveDb = this.saveDb.bind(this);
		this.sendJSONorSocketresponse = this.sendJSONorSocketresponse.bind(this);
	}
	

	addUser(userId, response)
	{
		if(typeof userId != undefined)
		{
			const newUser = new users({_id:userId, isActive:true});
			const newUserPrivateConvos = new userPrivateConvos({_id: userId, privateConvos: []});
			
			debugger;
			const that = this;
			//save privateConvos Collection, then callback users Collection, pass null 'response' to avoid setting http headers twice
			this.saveDb(newUserPrivateConvos,null,null,function(){

				debugger;
				that.saveDb(newUser,response,null,null);		
			});
			
		}else{
			const responseMsg = "There is no userName to add";
			console.log(responseMsg.magenta.bgBlack);
			this.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg});
		}
		
	}

	removeUser(userId, response)
	{
			debugger;
		if(typeof userId != 'undefined')
		{

			const that = this;
			userPrivateConvos.findByIdAndRemove(userId, (err,doc) => {
				const responseMsg = "";
				if(doc && !err)
				{
					that.saveDb(doc,response);
				}
				else if(err)
				{
					const responseMsg = "ERR: "+err;
					console.log(responseMsg.red);
					that.sendJSONorSocketresponse(response, 400, {error:true, success: false, msg: responseMsg});
				}
				else if(!doc)
				{
					const responseMsg = "No user with the username: "+userId+" exists";
					console.log(responseMsg.red);
					that.sendJSONorSocketresponse(response, 200, {error: true, success: false, msg: responseMsg});
				}
				
			});
		}
		else
		{
			const responseMsg = "no UserId was specified"
			this.sendJSONorSocketresponse(response, 404, {error:true, success: false, msg: responseMsg});
		}
	}

	addVoiceRecognitionId(userId,voiceId,response)
	{
		const that = this;
		users.findById(userId, function(err,doc){
			if(typeof doc != 'undefined')
			{
				doc.voiceId = voiceId;
				that.saveDb(doc, response);
			}
			else
			{
				const responseMsg = "Voice recognition cannot be setup for a user in this document because it does not exist ERROR: "+err;
				that.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg});
			}
			
		});
	}

	//creates one private convo with a given recipient
	createPrivateConvo(sender, recipient, response, callback)
	{debugger;
		const that = this;
		
		
		users.count({_id: recipient}, function (err, count){ 
		    debugger;
		    if(!(count>0))
		    {
		        const responseMsg = "The recipient: "+recipient+" does not exist";
		         that.sendJSONorSocketresponse(response, 200, {error:false, success:true, msg:responseMsg});

		    }else
		    {
		    	//search for user in userPrivateConvos Schema
				userPrivateConvos.findById(sender, function(err,doc){
						debugger;
							console.log("doc in userPrivateConvos: "+JSON.stringify(doc,null,3));

					//doc error checking, then handle data
					if(doc != null && err == null)
					{
						//see if recipient and user already have a convo in userPrivateConvos Schema, if not create & save convo
						const result = _.findWhere(doc.privateConvos, {recipientId: recipient});
						if(typeof result == "undefined")
						{
							
							//creation
							const newConvo = {
								_id: sender,
								recipientId: recipient,
							};
							//           {doc}
							//add to userPrivateConvos.privateConvos array in Schema & save
							//             ^
							doc.privateConvos.push(newConvo);
							
							that.saveDb(doc,response,null,callback);

						}
						//if there is a doc, report that it exists
						else if (typeof result != "undefined")
						{
							const responseMsg = "convo in "+doc.constructor.modelName+" between sender: "+sender+" & recipient: "+recipient+" has already been created";
							console.log(responseMsg.magenta.bgWhite);
							that.sendJSONorSocketresponse(response, 204, {error:false, success: true, msg: responseMsg});
						}
						//else report that there is a serious error creating userPrivateConvos
						else{
							const responseMsg = "Serious ERROR in Schema: "+doc.constructor.modelName+" check createPrivateConvo() function";
							console.log(responseMsg.magenta.bgWhite);
							that.sendJSONorSocketresponse(response, 500, {error:true, success: false, msg: responseMsg});

						}

						


					}
					else if (doc == null){
						const responseMsg = "There is no user by that username: "+newConvo._id;
						console.log(responseMsg);
						//interaal server error code because client is not responsible for error
						that.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg});

					}
					else if(err)
					{
						const responseMsg = "createPrivateConvo() ERROR: "+err;
						//internal server error code because client is not responsible for error
						that.sendJSONorSocketresponse(response, 500, {error:true, success:false, msg:responseMsg});

					}	
				});	


		    }
				
		});
	}

	


	deletePrivateConvo(sender, recipient, response)
	{
		userPrivateConvos.findById(sender,function(err,doc){
			
			if(doc != null && err == null)
			{
				const that = this;
				doc.privateConvos.findOneAndRemoveOne({recipientId: recipient},{new: true}, function(subErr, subDoc){
					if(subDoc != null && subErr == nul)
					{
						const responseMsg = sender+" privateConvos After recipient: "+recipient+" Deletion: "+subDoc;
						console.log((responseMsg).green.bgBlack);

						that.sendJSONorSocketresponse(response,204,{error:false, success:true, msg:responseMsg});

					}
					else{
						const responseMsg = "deletePrivateConvo ERR >> findOneAndRemove SubERR: "+subErr;
						console.log((responseMsg).red);

						that.sendJSONorSocketresponse(response,404, {error:true, success:false, msg:responseMsg});
					}
				});	
			}
			else{
				console.log(("deletePrivateConvo ERR: "+err).red);
			}
		});
	}
	

	
		
	//adds a message to the privateConvo
	addMessage(sender, recipient, msg,response, socketDic,swapped, callback)
	{
		const that = this;
		//printing arguments
		console.log("args: ",sender, recipient, msg,response, socketDic);
		
		
		//check if recipient exists, if not send error
		users.count({_id: recipient}, function (err, count){ 
		    debugger;
		    if(!(count>0))
		    {
		        const responseMsg = "The recipient: "+recipient+" does not exist";
		         that.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg});
		    }
		    //if recipient exists, continue
		    else
		    {
				 debugger;
				//search for sender in userPrivateConvos Schema
				userPrivateConvos.findById(sender,function(err,senderDoc){


					const dateTime = myUtil.getDateAndTime();
					
					
				
					

						debugger;
						console.log(("err: "+JSON.stringify(err,null,3)+"\n doc: "+JSON.stringify(senderDoc,null,3)).bgBlack);

						//doc error handling, check if user exists, if does, check if user's PrivateConvo Exists between recipient and sender
						if(senderDoc != null && err == null)
						{

							//search for recipient in user's privateConvos
							const result = _.findWhere(senderDoc.privateConvos, {recipientId: recipient});


							//if recipient and sender have privateConvo, add message
							if(typeof result != 'undefined')
							{
								debugger;

								
								//if sender & recipient has been reversed in param (for recursive call), put correct sender in object
								if(swapped != null && swapped == true)
								{
									 	const newMsg = new message({
										date: dateTime.date,
										time: dateTime.time,
										text: msg,
										sender: recipient
									});
									 	result.messages.push(newMsg);
									
								}
								else{
										const newMsg = new message({
										date: dateTime.date,
										time: dateTime.time,
										text: msg,
										sender: sender
									});
										result.messages.push(newMsg);
								}
								
								console.log(JSON.stringify(result).black.bgWhite);

								
								debugger;
								//after newMsg push, save the 'result' (derived from userPrivateConvo Schema)
								const shouldRespond = (swapped) ? response : null;
								that.saveDb(senderDoc, shouldRespond, socketDic, function(){
									debugger;

									//if we have added the msg to recipient's thread do that now
									if(swapped == null)
									{
										//dont send response to server, one has already been sent, THIS IS UNSAFE!
										that.addMessage(recipient, sender, msg, response,socketDic, true);	
									}
									
								});
								
								
										// //send message to the recipient's convo thread
										// userPrivateConvos.findById(recipient,function(err,recipientDoc){
										// 	debugger;
										// 	console.log(("err: "+JSON.stringify(err)+"\n doc: "+JSON.stringify(recipientDoc)).bgBlack);

										// 	//doc error handling, check if recipient exists, if does, check if user's PrivateConvo Exists between recipient and sender 
										// 	if(recipientDoc != null && err == null)
										// 	{

										// 		//look for the sender inside of recipient's privateConvos
										// 		const result = _.findWhere(recipientDoc.privateConvos, {recipientId: sender});
										// 		if(typeof result != 'undefined')
										// 		{
										// 			result.messages.push(newMsg);
										// 			console.log(JSON.stringify(result).black.bgWhite);

										// 			that.saveDb(senderDoc, null, socketDic, function(){

										// 				that.saveDb(recipientDoc, response,socketDic)
										// 			});
										// 		}
										// 		else if (typeof result == 'undefined')
										// 		{//if sender is not in recipient's privateConvos, create a private convo in userPrivateConvo Schema
																
														
										// 			debugger;


										// 		}			
										// 	}
										// 	else if(err)
										// 	{
										// 		debugger;
										// 		const responseMsg = "ERROR: "+err;
										// 		that.sendJSONorSocketresponse(response, 400, {error:true, success:false, msg:responseMsg});
										// 	}
										// 	else if(recipientDoc == null)
										// 	{
										// 		debugger;
										// 		const responseMsg = "The User: "+recipient+" Does not Exist";
										// 		that.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg});
										// 	}
										// });
							}
							//if sender and recipient do not have a private convo, create privateConvo in userPrivateConvo Schema
							else if (typeof result == 'undefined')
							{
									
									const responseMsg = "The recipient: "+recipient+" does not exist...creating convo";
									debugger;
									that.createPrivateConvo(sender, recipient,null,function(){
										debugger;

										
										//*** MARK SWAPPED FLAG TO AVOID WRONG SENDER ERROR!
										that.addMessage(sender,recipient, msg, response, socketDic, true);
										debugger;
									});
									// that.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg})
							}	


								
						}
						else if(err)
						{
							debugger;
							const responseMsg = "ERROR: "+err;
							that.sendJSONorSocketresponse(response, 400, {error:true, success:false, msg:responseMsg});
						}
						else if(senderDoc == null)
						{
							debugger;
							const responseMsg = "This User: "+sender+" does not Exist";
							that.sendJSONorSocketresponse(response, 404, {error:true, success:false, msg:responseMsg});
						}
				});	
		    }
		});
}
	//Sends a request to java server to encrpt data
	encodeHelper(msgObj, response)
	{
		const requestOptions = {
			url: "https://javachatapp-dataserver.herokuapp.com/",
			method: "GET",
			json:{message: "Hello there from node javascript"},
			qs: {}

		};
		const that = this;
		request(requestOptions, function(err, response, body){
			if(!err && body)
			{
				// response
			}
			else if (err)
			{

			}
			else if (!body)
			{
				const responseMsg = "Something Has went wrong, there is no data. Please contact a Server Administrator Immediately"
				
				that.sendJSONorSocketresponse(response, 500, {error:true, success:false, msg:responseMsg});
			}
		});
	}

	//DB Helper Function
	/******************************************************************************/
	/******************************************************************************/
	
	//not available to call from API
	readDb(db, userId,response)
	{
		if(db)
		{
			db.find((err, doc) => {
				console.log("ReadDB collection named: "+doc.constructor.modelName+":: "+JSON.stringify(doc,null,3));
			});	
		}
		else if (response)
		{
			const that = this;
			userPrivateConvos.findById(userId, function(err, doc){

				
							debugger;
							//if doc is present, do not save newConvo document
							if(doc && !err)
							{
								const responseMsg = "Reading Database";
								that.sendJSONorSocketresponse(response, 200, {error:false, success:true, msg:responseMsg, obj: doc});
							}//if err, send err
							else if(err)
							{
								const responseMsg = "ERR: "+err;
								that.sendJSONorSocketresponse(response, 500, {error:true, success:false, msg:responseMsg});
							}//if doc is not present, save doc and update userPrivateConvos
							else if(!doc)
							{
								const responseMsg = "The user: "+userId+" does ont exist";
								that.sendJSONorSocketresponse(response, 404, {error:false, success:true, msg:responseMsg});
							}
					});
		}
	}
		
	


	saveDb(doc, response, socketDic, callback)
	{
		debugger;
		callNum++;
		console.log("SaveDb DOC: "+JSON.stringify(doc));
		const that = this;
		//if doc is not undefined/null
		if(typeof doc != null)
		{

			const that = this;
			//save dat
			doc.save(function(err,newDoc){
				debugger;
				console.log(("call num: "+callNum+", NEW DOC FROM SAVE: "+newDoc).black.bgWhite);
				//if save returns newDoc, print newDoc in magenta with black background to console
			if(newDoc)
				{
					const responseMsg = "Updated "+doc.constructor.modelName+" Database";
					
					console.log((responseMsg+": "+JSON.stringify(newDoc, null, 3)).magenta.bgBlack);
					debugger;

					that.sendJSONorSocketresponse(response,201, {error: false, success:true, msg:responseMsg, obj: newDoc}, socketDic);

					if(callback != null)
					{
						callback();
					}	

					
				}//if save error, print error 
				else if(err)
				{
					const responseMsg = "There was an error updating an item. ERORR: "+err;

					console.log((responseMsg).red.bgWhite);

					that.sendJSONorSocketresponse(response,400, {error: true, success:false, msg:responseMsg}, socketDic);
					
				}
			});	
		}else{
				const responseMsg = "CANNOT SAVE DOCUMENT FOR"+ doc.constructor.modelName;
				
				console.log((responseMsg).red);
				
				that.sendJSONorSocketresponse(response,500, {error: true, success:false, msg:responseMsg}, socketDic);
		}

		
		
	}

	
	sendJSONorSocketresponse(res, status, content,socketDic)
	{
		if(res != null)
		{
			res.status(status);
			res.json(content);
				
		}
		else if(socketDic != null)
		{
			console.log("CALLED SOCKET-DIC!".green.bgBlack);
			if(socketDic[content.obj._doc._id] != null)
			{
				socketDic[content.obj._doc._id].emit('newMsg', content);
			}else{
				console.log(("USER: "+content.obj._doc._id+" is not online").red.bgWhite);
			}
			

		}
		else{
			console.warn("No JSON response was sent in call".red.bgYellow);
		}
		
		
	};
}

const db1 = new chatAppDb();
// db1.addUser("WiseNN");
// db1.addVoiceRecognitionId("WiseNN","kjdns89d8dshcsiudIWEUHIUWE");
// db1.removeUser("WiseNN");


