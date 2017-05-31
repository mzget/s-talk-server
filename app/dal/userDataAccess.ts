
import mongodb = require("mongodb");
import async = require("async");
import assert = require("assert");
import Mdb = require("../db/dbClient");

let MongoClient = mongodb.MongoClient;
let ObjectID = mongodb.ObjectID;

export class UserDataAccess {
    public removeRegistrationId(uid: string, registrationId: string) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            let collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { deviceTokens: registrationId } }, (err, res) => {
                assert.equal(1, res.result.n);

                db.close();
            });
        });
    }

    public removeAllRegistrationId(uid: string) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            let collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $set: { deviceTokens: [] } }, (err, res) => {
                assert.equal(0, res.result.n);

                db.close();
            });
        });
    }

    public addRegistrationId(uid: string, registrationId: string) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            let collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { deviceTokens: registrationId } }, (err, result) => {
                console.log("saveRegistrationId: ", err, result.result);

                db.close();
            });
        });
    }

    public saveRegistrationId(uid: string, registrationId: string) {
        MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            let collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $set: { deviceTokens: [registrationId] } }, (err, result) => {
                console.debug("saveRegistrationId: ", err, result.result);

                db.close();
            });
        });
    }
}