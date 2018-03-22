"use strict";
// import * as  User from '../model/User';
// import *as Room from '../model/Room';
// import RoomAccessData from '../model/RoomAccessData';
// import mongodb = require('mongodb');
// import async = require('async');
// import assert = require('assert');
// const MongoClient = mongodb.MongoClient;
// const ObjectID = mongodb.ObjectID;
// export interface IUserDict {
//     [id: string]: User.StalkAccount;
// };
// export class UserManager {
//     private static _instance: UserManager;
//     private userDataAccess: UserDataAccessService = new UserDataAccessService();
//     constructor() {
//         if (UserManager._instance) {
//             console.warn("Error: Instantiation failed: Use SingletonDemo.getInstance() instead of new.");
//         }
//         UserManager._instance = this;
//     }
//     public static getInstance(): UserManager {
//         if (!UserManager._instance) {
//             UserManager._instance = new UserManager();
//         }
//         return UserManager._instance;
//     }
//     public getLastProfileChanged(uid: string, callback: (err, res) => void) {
//         this.userDataAccess.getLastProfileChanged(uid, callback);
//     }
//     public updateImageProfile(uid: string, newUrl: string, callback: (err, res) => void) {
//         this.userDataAccess.updateImageProfile(uid, newUrl, callback);
//     }
//     public getRoomAccessOfRoom(uid: string, rid: string, callback: (err, res: Array<User.StalkAccount>) => void) {
//         this.userDataAccess.getRoomAccessOfRoom(uid, rid, callback);
//     }
//     public updateLastAccessTimeOfRoom(uid: string, rid: string, date: Date, callback: (err: any, res: any) => void) {
//         let self = this;
//         async.waterfall([function (cb) {
//             MongoClient.connect(Mdb.DbController.chatDB).then(db => {
//                 let collection = db.collection(Mdb.DbController.userColl);
//                 collection.find({ _id: new ObjectID(uid) }).limit(1).project({ roomAccess: 1 }).toArray().then(docs => {
//                     cb(null, docs[0]);
//                     db.close();
//                 }).catch(error => {
//                     cb(new Error("cannot find roomAccess info of target uid."), null);
//                     db.close();
//                 });
//             }).catch(err => {
//                 console.error("Cannot connect database", err);
//             });
//         }
//             , function (arg, cb) {
//                 if (arg && arg.roomAccess) {
//                     self.userDataAccess.findRoomAccessDataMatchWithRoomId(uid, rid, date, cb);
//                 }
//                 else {
//                     //<!-- insert roomAccess info field in user data collection.
//                     self.userDataAccess.insertRoomAccessInfoField(uid, rid, cb);
//                 }
//             }],
//             function done(err, result) {
//                 callback(err, result);
//             });
//     }
//     onInsertRoomAccessInfoDone = function (uid: string, rid: string, callback): void {
//         MongoClient.connect(Mdb.DbController.chatDB).then(db => {
//             let collection = db.collection(Mdb.DbController.userColl);
//             collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: 1 }).limit(1).toArray().then(docs => {
//                 console.log("find roomAccessInfo of uid %s", uid, docs[0]);
//                 collection.updateOne({ _id: new ObjectID(docs[0]._id), "roomAccess.roomId": rid }, { $set: { "roomAccess.$.accessTime": new Date() } }, { w: 1 }).then(result => {
//                     console.log("updated roomAccess.accessTime: ", result.result);
//                     db.close();
//                     callback(null, result);
//                 }).catch(err => {
//                     db.close();
//                     callback(new Error("cannot update roomAccess.accessTime."), null);
//                 });
//             }).catch(err => {
//                 db.close();
//                 callback(new Error("cannot find roomAccess info of target uid."), null);
//             })
//         }).catch(err => {
//             console.error("Cannot connect database", err);
//         });
//     }
//     public AddRoomIdToRoomAccessField(roomId: string, memberIds: string[], date: Date, callback: (err, res: boolean) => void) {
//         var self = this;
//         async.each(memberIds, function (element: string, cb) {
//             self.userDataAccess.AddRidToRoomAccessField(element, roomId, date, (error, response) => {
//                 cb();
//             });
//         }, function (errCb) {
//             if (!errCb) {
//                 callback(null, true);
//             }
//         });
//     }
//     public AddRoomIdToRoomAccessFieldForUser(roomId: string, userId: string, date: Date, callback: (err, res) => void) {
//         this.userDataAccess.AddRidToRoomAccessField(userId, roomId, date, callback);
//     }
//     public updateFavoriteMembers(editType: string, member: string, uid: string, callback: (err, res) => void) {
//         if (editType === "add") {
//             this.userDataAccess.addFavoriteMembers(member, uid, callback);
//         }
//         else if (editType === "remove") {
//             this.userDataAccess.removeFavoriteMembers(member, uid, callback);
//         }
//     }
//     public updateFavoriteGroups(editType: string, group: string, uid: string, callback: (err, res) => void) {
//         if (editType === "add") {
//             this.userDataAccess.addFavoriteGroup(group, uid, callback);
//         }
//         else if (editType === "remove") {
//             this.userDataAccess.removeFavoriteGroup(group, uid, callback);
//         }
//     }
//     public updateClosedNoticeUsersList(editType: string, member: string, uid: string, callback: (err, res) => void) {
//         if (editType === "add") {
//             this.userDataAccess.addClosedNoticeUsersList(member, uid, callback);
//         }
//         else if (editType === "remove") {
//             this.userDataAccess.removeClosedNoticeUsersList(member, uid, callback);
//         }
//     }
//     public updateClosedNoticeGroups(editType: string, group: string, uid: string, callback: (err, res) => void) {
//         if (editType === "add") {
//             this.userDataAccess.addClosedNoticeGroupList(group, uid, callback);
//         }
//         else if (editType === "remove") {
//             this.userDataAccess.removeClosedNoticeGroupList(group, uid, callback);
//         }
//     }
//     /**
//     * Check creator permission for create ProjectBase Group requesting.
//     * res will return { _id, role } of user model.
//     */
//     public getCreatorPermission(creator: string, callback: (err, res) => void) {
//         this.userDataAccess.getRole(creator, (err, res) => {
//             //<!-- res will return { _id, role } of user model.
//             if (err || res === null) {
//                 callback(err, null);
//             }
//             else {
//                 callback(null, res);
//             }
//         });
//     }
//     public checkUnsubscribeRoom(userId: string, roomType: Room.RoomType, roomId: string, callback: Function) {
//         if (roomType === Room.RoomType.privateGroup) {
//             MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//                 if (err) {
//                     return console.dir(err);
//                 }
//                 assert.equal(null, err);
//                 // Get the documents collection
//                 var user = db.collection(Mdb.DbController.userColl);
//                 user.find({ _id: new ObjectID(userId), closedNoticeGroups: roomId }).limit(1).toArray(function (err, results) {
//                     if (err || results === null) {
//                         callback(err, null);
//                     }
//                     else {
//                         callback(null, results);
//                     }
//                     db.close();
//                 });
//             });
//         }
//         else if (roomType === Room.RoomType.privateChat) {
//             MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//                 if (err) {
//                     return console.dir(err);
//                 }
//                 assert.equal(null, err);
//                 // Get the documents collection
//                 var user = db.collection(Mdb.DbController.userColl);
//                 user.find({ _id: new ObjectID(userId), closedNoticeUsers: roomId }).limit(1).toArray((err, docs) => {
//                     if (err || docs === null) {
//                         callback(err, null);
//                     }
//                     else {
//                         callback(null, docs);
//                     }
//                     db.close();
//                 });
//             });
//         }
//     }
// }
// export class UserDataAccessService {
//     constructor() {
//     }
//     public getLastProfileChanged(uid: string, callback: (err, res) => void) {
//         DbClient.FindDocument(Mdb.DbController.userColl, function (result) {
//             callback(null, result);
//         }, { _id: new ObjectID(uid) }, { lastEditProfile: 1 });
//     }
//     AddRidToRoomAccessField(uid: string, roomId: string, date: Date, callback: (err, res) => void) {
//         let self = this;
//         mongodb.MongoClient.connect(Mdb.DbController.chatDB).then(db => {
//             let userCollection = db.collection(Mdb.DbController.userColl);
//             userCollection.find({ _id: new ObjectID(uid) }, { roomAccess: 1 }).limit(1).toArray().then(docs => {
//                 if (docs.length > 0 && !!docs[0].roomAccess) {
//                     //<!-- add rid to MembersFields.
//                     self.findRoomAccessDataMatchWithRoomId(uid, roomId, date, (err, res) => {
//                         if (err) {
//                             console.warn("findRoomAccessDataMatchWithRoomId: ", err);
//                             db.close();
//                             if (callback !== null)
//                                 callback(err, null);
//                         }
//                         else {
//                             console.log("findRoomAccessDataMatchWithRoomId: ", res.result);
//                             db.close();
//                             if (callback !== null)
//                                 callback(null, res);
//                         }
//                     });
//                 }
//                 else {
//                     db.close();
//                     self.InsertMembersFieldsToUserModel(uid, roomId, date, callback);
//                 }
//             }).catch(err => {
//                 console.warn("cannot find item .", err);
//                 db.close();
//                 if (callback !== null)
//                     callback(err, null);
//             });
//         }).catch(err => {
//             console.warn("cannot connect db.", err);
//             if (!!callback)
//                 callback(err, null);
//         });
//     }
//     private InsertMembersFieldsToUserModel(uid: string, roomId: string, date: Date, callback: (err: any, res: any) => void) {
//         var newRoomAccessInfos: RoomAccessData[] = new Array<RoomAccessData>();
//         newRoomAccessInfos[0] = new RoomAccessData();
//         newRoomAccessInfos[0].roomId = roomId;
//         newRoomAccessInfos[0].accessTime = date;
//         DbClient.UpdateDocument(Mdb.DbController.userColl, (res) => {
//             console.log("InsertMembersFieldsToUserModel: ", res.result);
//             if (callback !== null)
//                 callback(null, res);
//         }, { _id: new ObjectID(uid) }, { $set: { roomAccess: newRoomAccessInfos } });
//     }
//     findRoomAccessDataMatchWithRoomId = function (uid: string, rid: string, date: Date, callback: (err: any, res: any) => void) {
//         if (rid === null) {
//             console.warn("rid is invalid: careful for use this func: ", rid);
//         }
//         MongoClient.connect(Mdb.DbController.chatDB, function (err, db) {
//             let collection = db.collection(Mdb.DbController.userColl);
//             // Peform a simple find and return all the documents
//             collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid.toString() } } }).toArray(function (err, docs) {
//                 let printR = (docs) ? docs : null;
//                 console.log("find roomAccessInfo of uid: %s match with rid: %s :: ", uid, rid, printR);
//                 if (!docs || !docs[0].roomAccess) {
//                     //<!-- Push new roomAccess data. 
//                     let newRoomAccessInfo = new RoomAccessData();
//                     newRoomAccessInfo.roomId = rid.toString();
//                     newRoomAccessInfo.accessTime = date;
//                     collection.updateOne({ _id: new ObjectID(uid) }, { $push: { roomAccess: newRoomAccessInfo } }, { w: 1 }).then(result => {
//                         console.log("Push new roomAccess.: ", result.result);
//                         db.close();
//                         callback(null, result);
//                     }).catch(err => {
//                         db.close();
//                         callback(new Error("cannot update roomAccess.accessTime."), null);
//                     });
//                 }
//                 else {
//                     //<!-- Update if data exist.
//                     collection.updateOne({ _id: new ObjectID(uid), "roomAccess.roomId": rid }, { $set: { "roomAccess.$.accessTime": date } }, { w: 1 }).then(result => {
//                         console.log("Updated roomAccess.accessTime: ", result.result);
//                         db.close();
//                         callback(null, result);
//                     }).catch(err => {
//                         db.close();
//                         callback(new Error("cannot update roomAccess.accessTime."), null);
//                     });
//                 }
//             });
//         });
//     }
//     insertRoomAccessInfoField = function (uid: string, rid: string, callback): void {
//         let newRoomAccessInfos: RoomAccessData[] = new Array<RoomAccessData>();
//         newRoomAccessInfos[0] = new RoomAccessData();
//         newRoomAccessInfos[0].roomId = rid;
//         newRoomAccessInfos[0].accessTime = new Date();
//         MongoClient.connect(Mdb.DbController.chatDB).then(db => {
//             // Get a collection
//             let collection = db.collection(Mdb.DbController.userColl);
//             collection.updateOne({ _id: new ObjectID(uid) }, { $set: { roomAccess: newRoomAccessInfos } }, { upsert: true, w: 1 }).then(result => {
//                 console.log("Upsert roomAccess array field.", result.result);
//                 UserManager.getInstance().onInsertRoomAccessInfoDone(uid, rid, callback);
//                 db.close();
//             }).catch(err => {
//                 db.close();
//             });
//         }).catch(err => {
//             console.error("Cannot connect database", err);
//         });
//     }
//     public updateImageProfile(uid: string, newUrl: string, callback: (err, res) => void) {
//         DbClient.UpdateDocument(Mdb.DbController.userColl, function (res) {
//             callback(null, res);
//         }, { _id: new ObjectID(uid) }, { $set: { image: newUrl, lastEditProfile: new Date() } }, { w: 1, upsert: true });
//     }
//     public getRoomAccessOfRoom(uid: string, rid: string, callback: (err, res: Array<User.StalkAccount>) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB).then(db => {
//             // Get the documents collection
//             let collection = db.collection(Mdb.DbController.userColl);
//             collection.find({ _id: new ObjectID(uid) }).project({ roomAccess: { $elemMatch: { roomId: rid } }, _id: 0 }).limit(1).toArray()
//                 .then(docs => {
//                     console.log("getRoomAccessOfRoom", docs);
//                     db.close();
//                     callback(null, docs);
//                 })
//                 .catch(err => {
//                     console.warn("getRoomAccessOfRoom: ", err);
//                     db.close();
//                     callback(err, null);
//                 });
//         }).catch(err => {
//             console.error("Cannot connect database", err);
//         });
//     }
//     public getRole(creator: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             // Find some documents
//             collection.find({ _id: new ObjectID(creator) }).project({ role: 1 }).limit(1).toArray((err, results) => {
//                 if (err || results === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, results);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public addFavoriteMembers(member: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { favoriteUsers: member } }, { upsert: true }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public removeFavoriteMembers(member: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             // Find some documents
//             collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { favoriteUsers: member } }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public addFavoriteGroup(group: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { favoriteGroups: group } }, { upsert: true }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public removeFavoriteGroup(group: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             // Find some documents
//             collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { favoriteGroups: group } }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public addClosedNoticeUsersList(member: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { closedNoticeUsers: member } }, { upsert: true }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public removeClosedNoticeUsersList(member: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             // Find some documents
//             collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { closedNoticeUsers: member } }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public addClosedNoticeGroupList(member: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             collection.updateOne({ _id: new ObjectID(uid) }, { $addToSet: { closedNoticeGroups: member } }, { upsert: true }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
//     public removeClosedNoticeGroupList(member: string, uid: string, callback: (err, res) => void) {
//         MongoClient.connect(Mdb.DbController.chatDB, (err, db) => {
//             if (err) {
//                 return console.dir(err);
//             }
//             assert.equal(null, err);
//             // Get the documents collection
//             var collection = db.collection(Mdb.DbController.userColl);
//             // Find some documents
//             collection.updateOne({ _id: new ObjectID(uid) }, { $pull: { closedNoticeGroups: member } }, (err, result) => {
//                 if (err || result === null) {
//                     callback(err, null);
//                 }
//                 else {
//                     callback(null, result);
//                 }
//                 db.close();
//             });
//         });
//     }
// }
