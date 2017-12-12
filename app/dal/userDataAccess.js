"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongodb = require("mongodb");
const assert = require("assert");
const Mdb = require("../db/dbClient");
let MongoClient = mongodb.MongoClient;
let ObjectID = mongodb.ObjectID;
class UserDataAccess {
    removeRegistrationId(uid, registrationId) {
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
    removeAllRegistrationId(uid) {
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
    addRegistrationId(uid, registrationId) {
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
    saveRegistrationId(uid, registrationId) {
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
exports.UserDataAccess = UserDataAccess;
