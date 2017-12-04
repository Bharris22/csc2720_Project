import chatAppDb from '../mongoDb/db';


// Database function Tests
// (cannot test the sendJSONresponse function)

const db from new chatAppDb();
db.addVoiceRecognitionId("WiseNN","kjdns89d8dshcsiudIWEUHIUWE");
db.readDb(users);
db.addUser("WiseNN");
db.createPrivateConvo("WiseNN", "TaslimD")
db.deletePrivateConvo("WiseNN", "TaslimD", null);
db.removeUser("WiseNN", null);
db.addMessage("WiseNN", "TaslimD", "Hey What's Up!");
db.readDb(users);
db.saveDb(users, null)


