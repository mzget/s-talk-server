
import mongodb = require('mongodb');
import async = require('async');
import assert = require('assert');
import Mdb = require('../db/dbClient');

var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;

class UserDataAccess {
    public getDeviceTokens(members: mongodb.ObjectID[], callback: Function) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.find({ _id: { $in: members } }, { deviceTokens: 1, _id: 0 }).toArray((err, result) => {
                if (err || result === null) {
                    callback(err, null);
                }
                else {
                    callback(null, result);
                }

                db.close();
            });
        });
    }

    public removeRegistrationId(uid: string, registrationId: string) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { deviceTokens: registrationId } }, (err, res) => {
                assert.equal(1, res.result.n);

                db.close();
            });
        });
    }
    
    public removeAllRegistrationId(uid:string) {
         MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $set: { deviceTokens: [] } }, (err, res) => {
                assert.equal(0, res.result.n);

                db.close();
            });
        });
    }

    public addRegistrationId(uid: string, registrationId: string) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { deviceTokens: registrationId } }, (err, result) => {
                console.debug("saveRegistrationId: ", err, result.result);

                db.close();
            });
        });
    }

    public saveRegistrationId(uid: string, registrationId: string) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);

            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $set: { deviceTokens: [registrationId] } }, (err, result) => {
                console.debug("saveRegistrationId: ", err, result.result);

                db.close();
            });
        });
    }
}
export = UserDataAccess;