// import Mcontroller = require("../../../controller/ChatRoomManager");
// import { UserManager } from "../../../controller/UserManager";
// import Code from "../../../../shared/Code";
// import mongodb = require('mongodb');
// import crypto = require('crypto');
// import { AccountService } from '../../../services/accountService';
// import User = require('../../../model/User');
// import Room = require('../../../model/Room');
// import UserRole from '../../../model/UserRole';
// import async = require('async');
// import Joi = require('joi');
// Joi.objectId = require('joi-objectid')(Joi);

// import { Config } from '../../../../config/config';
// const ObjectID = mongodb.ObjectID;
// const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
// const userManager = UserManager.getInstance();
// var channelService;

// module.exports = function (app) {
//     console.info("instanctiate ChatRoomHandler.");
//     return new ChatRoomHandler(app);
// };

// const ChatRoomHandler = function (app) {
//     this.app = app;
//     channelService = app.get('channelService');
// };

// const handler = ChatRoomHandler.prototype;

// handler.requestCreateProjectBase = function (msg, session, next) {
//     let self = this;
//     let groupName: string = msg.groupName;
//     let members: Room.Member[] = JSON.parse(msg.members);

//     if (!groupName || !members) {
//         var errMessage: string = "cannot create group may be you missing some variable.";
//         console.error(errMessage);
//         next(null, { code: Code.FAIL, message: errMessage });
//         return;
//     }

//     let creator = session.uid;
//     if (!creator) {
//         var message: string = "creator id is invalid.";
//         console.error(message);
//         next(null, { code: Code.FAIL, message: message });
//         return;
//     }

//     userManager.getCreatorPermission(creator, function (err, res) {
//         var message: string = "creator permission is invalid.";
//         if (err || res === null) {
//             console.error(message);
//             next(null, { code: Code.FAIL, message: message });
//             return;
//         }
//         else {
//             if (res.role !== UserRole.personnel) {
//                 chatRoomManager.createProjectBaseGroup(groupName, members, function (err, result) {
//                     console.info("createProjectBaseGroup response: ", result);

//                     let room: Room.Room = JSON.parse(JSON.stringify(result[0]));
//                     next(null, { code: Code.OK, data: room });
//                     //<!-- Update list of roomsMember mapping.
//                     self.app.rpc.auth.authRemote.addRoom(session, room);

//                     let memberIds = new Array<string>();
//                     room.members.forEach(value => {
//                         memberIds.push(value._id);
//                     });

//                     //<!-- Add rid to each user members.
//                     userManager.AddRoomIdToRoomAccessField(room._id, memberIds, new Date(), (err, res) => {
//                         //<!-- Now get roomAccess data for user who is online and then push data to them.
//                         memberIds.forEach(id => {
//                             self.app.rpc.auth.authRemote.getOnlineUser(session, id, (err, user) => {
//                                 if (!err && user !== null) {
//                                     userManager.getRoomAccessForUser(user.uid, (err, results: Array<any>) => {
//                                         if (!err && results.length > 0) {
//                                             //<!-- Now push roomAccess data to user.
//                                             let param = {
//                                                 route: Code.sharedEvents.onAddRoomAccess,
//                                                 data: results
//                                             }

//                                             let pushTarget = new Array();
//                                             let target = { uid: user.uid, sid: user.serverId };
//                                             pushTarget.push(target);

//                                             channelService.pushMessageByUids(param.route, param.data, pushTarget);
//                                         }
//                                     });
//                                 }
//                             });
//                         });
//                     });

//                     //<!-- Notice all member of new room to know they have a new room.   
//                     let param = {
//                         route: Code.sharedEvents.onCreateGroupSuccess,
//                         data: room
//                     }
//                     let pushGroup = new Array();
//                     members.forEach(member => {
//                         self.app.rpc.auth.authRemote.getOnlineUser(session, member._id, (err, user) => {
//                             if (!err) {
//                                 let item = { uid: user.uid, sid: user.serverId };
//                                 pushGroup.push(item);
//                             }
//                         });
//                     });

//                     channelService.pushMessageByUids(param.route, param.data, pushGroup);
//                 });
//             }
//             else {
//                 next(null, { code: Code.FAIL, message: message });
//             }
//         }
//     });
// }

// handler.editMemberInfoInProjectBase = function (msg, session, next) {
//     let self = this;
//     let roomId: string = msg.roomId;
//     let roomType: string = msg.roomType;
//     let member: Room.Member = JSON.parse(msg.member);

//     if (!roomId || !member || !roomType) {
//         var message: string = "Some require parameters is missing or invalid.";
//         console.error(message);
//         next(null, { code: Code.FAIL, message: message });
//         return;
//     }

//     //<!-- First checking room type for edit members permission.
//     if (roomType !== Room.RoomType[Room.RoomType.projectBaseGroup]) {
//         var message: string = "Room type is invalid this cannot edit groups.";
//         console.error(message);
//         next(null, { code: Code.FAIL, message: message });
//         return;
//     }

//     chatRoomManager.editMemberInfoInProjectBase(roomId, member, function (err, res) {
//         if (!err && res !== null) {
//             console.log("editMemberInfoInProjectBase, result is : ", res.result);

//             chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, null, (roomInfo) => {
//                 var room: Room.Room = JSON.parse(JSON.stringify(roomInfo));
//                 pushMemberInfoToAllMembersOfRoom(self.app, session, room, member);

//                 //<!-- Unnecesary to update roomMembers Map.
//                 //var roomObj = { _id: roomInfo._id, members: roomInfo.members };
//                 //chatService.updateRoomMembers(roomObj);
//             });
//         }
//         else {
//             console.error(err);
//         }
//     });


//     next(null, { code: Code.OK });
// }

// function pushNewRoomAccessToNewMembers(app: any, session: any, rid: string, targetMembers: Array<Room.Member>) {
//     let memberIds = new Array<string>();
//     async.map(targetMembers, function iterator(item, cb) {
//         memberIds.push(item._id);
//         cb(null, null);
//     }, function done(err, results) {
//         //<!-- Add rid to roomAccess data for each member. And then push new roomAccess info to all members.
//         userManager.AddRoomIdToRoomAccessField(rid, memberIds, new Date(), function (err, res) {
//             //<!-- Now get roomAccess data for user who is online and then push data to them.
//             memberIds.forEach(id => {
//                 app.rpc.auth.getOnlineUser(session, id, (err, user) => {
//                     if (!err && user !== null) {
//                         userManager.getRoomAccessForUser(user.uid, (err, results: Array<any>) => {
//                             if (!err && results.length > 0) {
//                                 //<!-- Now push roomAccess data to user.
//                                 let param = {
//                                     route: Code.sharedEvents.onAddRoomAccess,
//                                     data: results
//                                 }

//                                 let pushTarget = new Array();
//                                 let target = { uid: user.uid, sid: user.serverId };
//                                 pushTarget.push(target);

//                                 channelService.pushMessageByUids(param.route, param.data, pushTarget);
//                             }
//                         });
//                     }
//                 });
//             });
//         });
//     });
// }

// /* Require owner memberId and roommate id. 
// * For get or create one-to-one chat room.
// */
// handler.getRoomById = function (msg, session, next) {
//     let self = this;
//     let token = msg.token;
//     let owner = msg.ownerId;
//     let roommate = msg.roommateId;

//     let schema = {
//         token: Joi.string(),
//         ownerId: Joi.objectId(),
//         roommateId: Joi.objectId()
//     };
//     const result = Joi.validate(msg._object, schema);

//     if (result.error) {
//         return next(null, { code: Code.FAIL, message: result.error });
//     }

//     let id = '';
//     if (owner < roommate) {
//         id = owner.concat(roommate);
//     }
//     else {
//         id = roommate.concat(owner);
//     }

//     let md = crypto.createHash('md5');
//     md.update(id);
//     let hexCode = md.digest('hex');
//     console.log("hexcode: ", hexCode);
//     let roomId = hexCode.slice(0, 24);

//     chatRoomManager.GetChatRoomInfo(roomId).then(function (result) {
//         console.info("GetChatRoom", result);

//         var obj = JSON.parse(JSON.stringify(result));
//         next(null, { code: Code.OK, data: obj });
//     }).catch(err => {
//         console.warn("GetChatRoom", err);

//         chatRoomManager.createPrivateChatRoom({ _id: new ObjectID(roomId), members: [owner, roommate] },
//             function (err, result) {
//                 console.info("Create Private Chat Room: ", result);

//                 if (result !== null) {
//                     var obj = JSON.parse(JSON.stringify(result));
//                     next(null, { code: Code.OK, data: obj });

//                     var roomId: string = result._id;
//                     //  var roomObj = JSON.parse(JSON.stringify(result));
//                     var members = new Array<Room.Member>();
//                     for (var i in result.members) {
//                         members.push(result.members[i]);
//                     }
//                     var roomMemberData = { _id: roomId, members: members };
//                     self.app.rpc.auth.authRemote.updateRoomMembers(session, roomMemberData, null);

//                     //<!-- Push updated lastAccessRoom fields to all members.
//                     async.each(members, function (member, cb) {
//                         //<!-- Add rid to user members lastAccessField.
//                         userManager.AddRoomIdToRoomAccessFieldForUser(roomId, member._id, new Date(), (err, res) => {
//                             if (err) {
//                                 cb(err);
//                             }
//                             else {
//                                 self.app.rpc.auth.authRemote.getOnlineUser(session, member._id, (err, user: User.UserSession) => {
//                                     if (err) {
//                                         console.warn(err);
//                                     }
//                                     else {
//                                         //<!-- Dont use getRoomAccessOfRoomId it not work when insert and then find db.
//                                         userManager.getRoomAccessForUser(member._id, (err, results: Array<any>) => {
//                                             if (!err && results.length > 0) {
//                                                 let targetId = { uid: user.uid, sid: user.serverId };
//                                                 let pushGroup = new Array();
//                                                 pushGroup.push(targetId);

//                                                 let param = {
//                                                     route: Code.sharedEvents.onAddRoomAccess,
//                                                     data: results
//                                                 };

//                                                 channelService.pushMessageByUids(param.route, param.data, pushGroup);
//                                             }
//                                         });
//                                     }
//                                 });
//                             }
//                         });
//                     }, function (errCb) {
//                         console.error("AddRoomIdToRoomAccessFieldForUser_fail", errCb);
//                     });
//                 }
//                 else {
//                     next(null, {
//                         code: Code.FAIL,
//                         message: "have no a room."
//                     });
//                 }
//             });
//     });
// }

// const pushRoomInfoToAllMember = function (app, session, roomInfo: any, editType: string, editedMembers: Array<Room.Member>) {
//     console.log("pushRoomInfoToAllMember: ", roomInfo);
//     let roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

//     if (editType === "remove") {
//         editedMembers.forEach(element => {
//             roomMembers.push(element);
//         });
//     }

//     let params = {
//         route: Code.sharedEvents.onEditGroupMembers,
//         data: roomInfo
//     };

//     let pushTargets = new Array();

//     async.series([function (cb) {
//         roomMembers.forEach(element => {
//             app.rpc.auth.getOnlineUser(session, element._id, (err, user) => {
//                 if (!err) {
//                     let target = { uid: user.uid, sid: user.serverId };
//                     pushTargets.push(target);
//                 }
//             });
//         });

//         cb(null, cb);
//     }], (callback) => {
//         channelService.pushMessageByUids(params.route, params.data, pushTargets);
//     });
// }

// const pushRoomNameToAllMember = function (app, session, roomInfo: any) {
//     console.log("pushRoomNameToAllMember: ", roomInfo);
//     var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

//     var params = {
//         route: Code.sharedEvents.onEditGroupName,
//         data: { _id: roomInfo._id, name: roomInfo.name }
//     };

//     var pushTargets = new Array();

//     async.series([function (cb) {
//         roomMembers.forEach(element => {
//             app.rpc.auth.getOnlineUser(session, element._id, (err, user) => {
//                 if (!err) {
//                     var target = { uid: user.uid, sid: user.serverId };
//                     pushTargets.push(target);
//                 }
//             });
//         });

//         cb(null, cb);
//     }], (callback) => {
//         channelService.pushMessageByUids(params.route, params.data, pushTargets);
//     });
// }

// const pushRoomImageToAllMember = function (app, session, roomInfo: any) {
//     console.log("pushRoomImageToAllMember: ", roomInfo);
//     let roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

//     let params = {
//         route: Code.sharedEvents.onEditGroupImage,
//         data: { _id: roomInfo._id, image: roomInfo.image }
//     };

//     let pushTargets = new Array();

//     async.series([function (cb) {
//         roomMembers.forEach(element => {
//             app.rpc.auth.getOnlineUser(session, element._id, (err, user) => {
//                 if (!err) {
//                     let target = { uid: user.uid, sid: user.serverId };
//                     pushTargets.push(target);
//                 }
//             });
//         });

//         cb(null, cb);
//     }], (callback) => {
//         channelService.pushMessageByUids(params.route, params.data, pushTargets);
//     });
// }

// /**
//  * Push roomId , editedMember to all members of room when has member info edited.
//  */
// function pushMemberInfoToAllMembersOfRoom(app, session, roomInfo: Room.Room, editedMember: Room.Member) {
//     var params = {
//         route: Code.sharedEvents.onUpdateMemberInfoInProjectBase,
//         data: { roomId: roomInfo._id, editMember: editedMember }
//     };

//     var pushTargets = new Array();
//     async.series([function (cb) {
//         roomInfo.members.forEach(member => {
//             app.rpc.auth.getOnlineUser(session, member._id, (err, user) => {
//                 if (!err && user !== null) {
//                     var item = { uid: user.uid, sid: user.serverId };
//                     pushTargets.push(item);
//                 }
//             });
//         });

//         cb(null, cb);
//     }], (callback) => {
//         channelService.pushMessageByUids(params.route, params.data, pushTargets);
//     });
// }