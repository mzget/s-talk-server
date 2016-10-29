/**
 *  friend Manager.
 */
"use strict";
const Mdb = require('../../app/db/dbClient');
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
const DbClient = Mdb.DbController.DbClient.GetInstance();
class FriendManager {
    constructor() {
    }
    addFriends(myUid, targetId, next) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL).then(db => {
            // Get the documents collection
            let userCollection = db.collection(Mdb.DbController.userColl);
            userCollection.find({ _id: new ObjectID(targetId) }).limit(1).toArray().then(function (docs) {
                if (docs.length != 0) {
                    let user = JSON.parse(JSON.stringify(docs[0]));
                    let linkRequests = user.link_requests;
                    if (!linkRequests)
                        linkRequests = [];
                    let _hasMyLinkRequest = linkRequests.some((val, id, arr) => {
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
                    }).catch(error => {
                        next(error, null);
                        db.close();
                    });
                }
                else {
                    next(new Error("No have target user."), null);
                    db.close();
                }
            }).catch(err => {
                db.close();
                next(new Error("No have target user."), null);
            });
        }).catch(err => {
            next(new Error("Cannot connect database."), null);
        });
    }
}
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FriendManager;
