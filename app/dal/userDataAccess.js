"use strict";
var mongodb = require('mongodb');
var assert = require('assert');
var Mdb = require('../db/dbClient');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var UserDataAccess = (function () {
    function UserDataAccess() {
    }
    UserDataAccess.prototype.getDeviceTokens = function (members, callback) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);
            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.find({ _id: { $in: members } }).project({ deviceTokens: 1, _id: 0 }).toArray(function (err, results) {
                if (err || results === null) {
                    callback(err, null);
                }
                else {
                    callback(null, results);
                }
                db.close();
            });
        });
    };
    UserDataAccess.prototype.removeRegistrationId = function (uid, registrationId) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);
            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { deviceTokens: registrationId } }, function (err, res) {
                assert.equal(1, res.result.n);
                db.close();
            });
        });
    };
    UserDataAccess.prototype.removeAllRegistrationId = function (uid) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);
            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $set: { deviceTokens: [] } }, function (err, res) {
                assert.equal(0, res.result.n);
                db.close();
            });
        });
    };
    UserDataAccess.prototype.addRegistrationId = function (uid, registrationId) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);
            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { deviceTokens: registrationId } }, function (err, result) {
                console.debug("saveRegistrationId: ", err, result.result);
                db.close();
            });
        });
    };
    UserDataAccess.prototype.saveRegistrationId = function (uid, registrationId) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, function (err, db) {
            if (err) {
                return console.dir(err);
            }
            assert.equal(null, err);
            // Get the documents collection
            var collection = db.collection(Mdb.DbController.userColl);
            // Find some documents
            collection.updateOne({ _id: new ObjectID(uid) }, { $set: { deviceTokens: [registrationId] } }, function (err, result) {
                console.debug("saveRegistrationId: ", err, result.result);
                db.close();
            });
        });
    };
    return UserDataAccess;
}());
module.exports = UserDataAccess;
