/**
 *  friend Manager.
 */

import User = require('../dataLayer/bolAccount');
import Mdb = require('../../app/db/dbClient');
import mongodb = require('mongodb');
import async = require('async');
const MongoClient = mongodb.MongoClient;
const ObjectID = mongodb.ObjectID;
import assert = require('assert');
const DbClient = Mdb.DbController.DbClient.GetInstance();

export default class FriendManager {
    constructor() {

    }

    addFriends(myUid: string, targetId: string, next) {
        MongoClient.connect(Mdb.DbController.spartanChatDb_URL, (err, db) => {
            if (err) {
                next(err, null);
            }
            assert.equal(null, err);

            // Get the documents collection
            let userCollection = db.collection(Mdb.DbController.userColl);

            userCollection.find({ _id: new ObjectID(targetId) }).limit(1).toArray(function (err, docs) {
                if (err) {
                    next(err, null);

                    db.close();
                }
                else {
                    if (docs.length != 0) {
                        let user: User.BOLAccount = JSON.parse(JSON.stringify(docs[0]));
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

                        userCollection.updateOne({ _id: new ObjectID(user._id) },
                            { $set: { link_requests: linkRequests } },
                            { upsert: true })
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
                }
            });
        });
    }
}