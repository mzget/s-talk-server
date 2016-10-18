/**
 *  friend Manager.
 */
"use strict";
var Mdb = require('../../app/db/dbClient');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var DbClient = Mdb.DbController.DbClient.GetInstance();
var FriendManager = (function () {
    function FriendManager() {
    }
    FriendManager.prototype.addFriends = function (myUid, targetId, next) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL).then(function (db) {
            // Get the documents collection
            var userCollection = db.collection(Mdb.DbController.userColl);
            userCollection.find({ _id: new ObjectID(targetId) }).limit(1).toArray().then(function (docs) {
                if (docs.length != 0) {
                    var user = JSON.parse(JSON.stringify(docs[0]));
                    var linkRequests = user.link_requests;
                    if (!linkRequests)
                        linkRequests = [];
                    var _hasMyLinkRequest = linkRequests.some(function (val, id, arr) {
                        if (val === myUid)
                            return true;
                    });
                    if (_hasMyLinkRequest) {
                        next(new Error("Target user already have your request."), docs);
                        db.close();
                        return;
                    }
                    linkRequests.push(myUid);
                    userCollection.updateOne({ _id: new ObjectID(user._id) }, { $set: { link_requests: linkRequests } }, { upsert: true })
                        .then(function (r) {
                        next(null, r);
                        db.close();
                    }).catch(function (error) {
                        next(error, null);
                        db.close();
                    });
                }
                else {
                    next(new Error("No have target user."), null);
                    db.close();
                }
            }).catch(function (err) {
                db.close();
                next(new Error("No have target user."), null);
            });
        }).catch(function (err) {
            next(new Error("Cannot connect database."), null);
        });
    };
    return FriendManager;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FriendManager;
