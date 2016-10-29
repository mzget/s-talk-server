import Mcontroller = require("../../../controller/ChatRoomManager");
import { UserManager } from "../../../controller/UserManager";
import Code from "../../../../shared/Code";
import TokenService from "../../../services/tokenService";
import mongodb = require('mongodb');
import crypto = require('crypto');
import { AccountService } from '../../../services/accountService';
import User = require('../../../model/User');
import Room = require('../../../model/Room');
import UserRole from '../../../model/UserRole';
import async = require('async');

import { Config } from '../../../../config/config';
const ObjectID = mongodb.ObjectID;
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
const userManager = UserManager.getInstance();
const tokenService: TokenService = new TokenService();
var channelService;

module.exports = function (app) {
    console.info("instanctiate ChatRoomHandler.");
    return new ChatRoomHandler(app);
};

const ChatRoomHandler = function (app) {
    this.app = app;
    channelService = app.get('channelService');
};

const handler = ChatRoomHandler.prototype;

handler.requestCreateProjectBase = function (msg, session, next) {
    let self = this;
    let groupName: string = msg.groupName;
    let members: Room.Member[] = JSON.parse(msg.members);

    if (!groupName || !members) {
        var errMessage: string = "cannot create group may be you missing some variable.";
        console.error(errMessage);
        next(null, { code: Code.FAIL, message: errMessage });
        return;
    }

    let creator = session.uid;
    if (!creator) {
        var message: string = "creator id is invalid.";
        console.error(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }

    userManager.getCreatorPermission(creator, function (err, res) {
        var message: string = "creator permission is invalid.";
        if (err || res === null) {
            console.error(message);
            next(null, { code: Code.FAIL, message: message });
            return;
        }
        else {
            if (res.role !== UserRole.personnel) {
                chatRoomManager.createProjectBaseGroup(groupName, members, function (err, result) {
                    console.info("createProjectBaseGroup response: ", result);

                    let room: Room.Room = JSON.parse(JSON.stringify(result[0]));
                    next(null, { code: Code.OK, data: room });

                    //<!-- Update list of roomsMember mapping.
                    let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
                    accountService.addRoom(result[0]);

                    var memberIds = new Array<string>();
                    room.members.forEach(value => {
                        memberIds.push(value.id);
                    });

                    //<!-- Add rid to each user members.
                    userManager.AddRoomIdToRoomAccessField(room._id, memberIds, new Date(), (err, res) => {
                        //<!-- Now get roomAccess data for user who is online and then push data to them.
                        memberIds.forEach(id => {
                            let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
                            accountService.getOnlineUser(id, (err, user) => {
                                if (!err && user !== null) {
                                    userManager.getRoomAccessForUser(user.uid, (err, roomAccess: Array<any>) => {
                                        //<!-- Now push roomAccess data to user.
                                        let param = {
                                            route: Code.sharedEvents.onAddRoomAccess,
                                            data: roomAccess
                                        }

                                        let pushTarget = new Array();
                                        let target = { uid: user.uid, sid: user.serverId };
                                        pushTarget.push(target);

                                        channelService.pushMessageByUids(param.route, param.data, pushTarget);
                                    });
                                }
                            });
                        });
                    });

                    //<!-- Notice all member of new room to know they have a new room.   
                    var param = {
                        route: Code.sharedEvents.onCreateGroupSuccess,
                        data: room
                    }
                    var pushGroup = new Array();
                    members.forEach(member => {
                        let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
                        accountService.getOnlineUser(member.id, (err, user) => {
                            if (!err) {
                                var item = { uid: user.uid, sid: user.serverId };
                                pushGroup.push(item);
                            }
                        });
                    });

                    channelService.pushMessageByUids(param.route, param.data, pushGroup);
                });
            }
            else {
                next(null, { code: Code.FAIL, message: message });
            }
        }
    });
}

handler.editMemberInfoInProjectBase = function (msg, session, next) {
    let self = this;
    let roomId: string = msg.roomId;
    let roomType: string = msg.roomType;
    let member: Room.Member = JSON.parse(msg.member);

    if (!roomId || !member || !roomType) {
        var message: string = "Some require parameters is missing or invalid.";
        console.error(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }

    //<!-- First checking room type for edit members permission.
    if (roomType !== Room.RoomType[Room.RoomType.projectBaseGroup]) {
        var message: string = "Room type is invalid this cannot edit groups.";
        console.error(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }

    chatRoomManager.editMemberInfoInProjectBase(roomId, member, function (err, res) {
        if (!err && res !== null) {
            console.log("editMemberInfoInProjectBase, result is : ", res.result);

            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, null, (roomInfo) => {
                var room: Room.Room = JSON.parse(JSON.stringify(roomInfo));
                pushMemberInfoToAllMembersOfRoom(self.app, session, room, member);

                //<!-- Unnecesary to update roomMembers Map.
                //var roomObj = { _id: roomInfo._id, members: roomInfo.members };
                //chatService.updateRoomMembers(roomObj);
            });
        }
        else {
            console.error(err);
        }
    });


    next(null, { code: Code.OK });
}

/** user create new group chat.
    * @param : msg request
    * groupName:string, 
    * memberIds:string[]
    * type: isPrivate <bool>
    * *******************************
    * @Return: group_id.
    */
handler.userCreateGroupChat = function (msg, session, next) {
    let self = this;
    let groupName: string = msg.groupName;
    let memberIds: string[] = JSON.parse(msg.memberIds);

    if (!groupName || !memberIds) {
        let errMessage: string = "cannot create group may be you missing some variable.";
        console.error(errMessage);
        next(null, { code: Code.FAIL, message: errMessage });
        return;
    }

    chatRoomManager.createPrivateGroup(groupName, memberIds, function (err, result) {
        if (result !== null) {
            console.info("CreateGroupChatRoom response: ", result);

            var room: Room.Room = JSON.parse(JSON.stringify(result[0]));
            next(null, { code: Code.OK, data: room });

            //<!-- Update list of roomsMember mapping.
            let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
            accountService.addRoom(result[0]);

            pushNewRoomAccessToNewMembers(self.app, session, room._id, room.members);

            var memberIds = new Array<string>();
            room.members.forEach(value => {
                memberIds.push(value.id);
            });

            //<!-- Notice all member of new room to know they have a new room.   
            var param = {
                route: Code.sharedEvents.onCreateGroupSuccess,
                data: room
            }
            var pushGroup = new Array();
            memberIds.forEach(element => {
                let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
                accountService.getOnlineUser(element, (err, user) => {
                    if (!err) {
                        var item = { uid: user.uid, sid: user.serverId };
                        pushGroup.push(item);
                    }
                });
            });

            channelService.pushMessageByUids(param.route, param.data, pushGroup);
        }
        else {
            next(null, { code: Code.FAIL, message: "CreateGroupChatRoom has a problem...T_T" });
        }
    });
}

/**
* require
- group_id for relation of imagePath,
- path of image container,
* return success respone.
*/
handler.updateGroupImage = function (msg, session, next) {
    let self = this;
    let rid: string = msg.groupId;
    let newUrl: string = msg.path;
    if (!rid || !newUrl) {
        next(null, { code: Code.FAIL, message: "groupId or pathUrl is empty or invalid." });
        return;
    }

    let objId = new ObjectID(rid);
    if (!objId) {
        next(null, { code: Code.FAIL, message: "groupId is invalid." });
        return;
    }

    chatRoomManager.updateGroupImage(rid, newUrl, function (err, res) {
        if (!err) {
            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(rid) }, null, (res) => {
                if (res !== null) {
                    pushRoomImageToAllMember(self.app, session, res);
                }
            });
        }
    });

    next(null, { code: Code.OK });
}

/**
* editGroupMembers method.
* provide edit member for private group only.
*/
handler.editGroupMembers = function (msg, session, next) {
    let self = this;
    let editType: string = msg.editType;
    let roomId: string = msg.roomId;
    let roomType: string = msg.roomType;
    let members: string[] = JSON.parse(msg.members);

    if (!editType || !roomId || !members || members.length == 0 || !roomType) {
        var message: string = "Some require parameters is missing or invalid.";
        console.error(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }

    //<!-- First checking room type for edit members permission.
    if (roomType === Room.RoomType[Room.RoomType.organizationGroup] || roomType === Room.RoomType[Room.RoomType.privateChat]) {
        var message: string = "Room type is invalid this group cannot edit.";
        console.error(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }

    let editedMembers = new Array<Room.Member>();
    members.forEach(element => {
        var member = new Room.Member();
        member.id = element;
        editedMembers.push(member);
    });

    chatRoomManager.editGroupMembers(editType, roomId, editedMembers, (err, res) => {
        if (err) {
            console.error(err);
        }
        else {
            console.log("editGroupMembers : type %s : result is", editType, res.result);

            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, null, function (res) {
                if (res !== null) {
                    pushRoomInfoToAllMember(self.app, session, res, editType, editedMembers);
                    if (editType === "add") {
                        pushNewRoomAccessToNewMembers(self.app, session, res._id, editedMembers);
                    }
                    var roomObj = { _id: res._id, members: res.members };
                    let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
                    accountService.addRoom(roomObj);
                }
            });
        }
    });

    next(null, { code: Code.OK });
}

function pushNewRoomAccessToNewMembers(app: any, session: any, rid: string, targetMembers: Array<Room.Member>) {
    let memberIds = new Array<string>();
    async.map(targetMembers, function iterator(item, cb) {
        memberIds.push(item.id);
        cb(null, null);
    }, function done(err, results) {
        //<!-- Add rid to roomAccess data for each member. And then push new roomAccess info to all members.
        userManager.AddRoomIdToRoomAccessField(rid, memberIds, new Date(), function (err, res) {
            //<!-- Now get roomAccess data for user who is online and then push data to them.
            memberIds.forEach(id => {
                let accountService: AccountService = app.rpc.auth.getAccountService(session);
                accountService.getOnlineUser(id, (err, user) => {
                    if (!err && user !== null) {
                        userManager.getRoomAccessForUser(user.uid, (err, roomAccess: Array<any>) => {
                            //<!-- Now push roomAccess data to user.
                            let param = {
                                route: Code.sharedEvents.onAddRoomAccess,
                                data: roomAccess
                            }

                            let pushTarget = new Array();
                            let target = { uid: user.uid, sid: user.serverId };
                            pushTarget.push(target);

                            channelService.pushMessageByUids(param.route, param.data, pushTarget);
                        });
                    }
                });
            });
        });
    });
}

/**
* editGroupName method.
* provide edit name for private group only.
*/
handler.editGroupName = function (msg, session, next) {
    let self = this;
    let newGroupName: string = msg.newGroupName;
    let roomId: string = msg.roomId;
    let roomType: string = msg.roomType;

    if (!roomId || !roomType || !newGroupName) {
        var errMessage: string = "Some require params is invalid.";
        console.error(errMessage);
        next(null, { code: Code.FAIL, message: errMessage });
        return;
    }

    //<!-- First checkiung room type for edit members permission.
    if (roomType === Room.RoomType[Room.RoomType.organizationGroup] || roomType === Room.RoomType[Room.RoomType.privateChat]) {
        var message: string = "Room type is invalid this cannot edit groups.";
        console.error(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }

    chatRoomManager.editGroupName(roomId, newGroupName, (err, res) => {
        console.log("editGroupName response. ", res.result);

        chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, null, (res) => {
            if (res !== null) {
                pushRoomNameToAllMember(self.app, session, res);
            }
        });
    });

    next(null, { code: Code.OK });
}

/**
 * require: roomId, lastAccessTimeOfRoom
 * **********************************************
 *@return : unread message count of room.
 *@return : last message of room.
 */
handler.getUnreadRoomMessage = function (msg, session, next) {
    let self = this;
    let roomId: string = msg.roomId;
    let lastAccessTime: string = msg.lastAccessTime;
    let token = msg.token;
    let uid = session.uid;

    if (!roomId || !lastAccessTime || !uid) {
        let msgs = "roomId, lastAccessTime or uid is empty or invalid.";
        next(null, { code: Code.FAIL, message: msgs });
        return;
    }

    let _timeOut = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "getUnreadRoomMessage request timeout." });
        return;
    }, Config.timeout);

    self.app.rpc.auth.authRemote.checkedCanAccessRoom(session, roomId, uid, function (err, res) {
        if (err || res === false) {
            clearTimeout(_timeOut);
            next(null, { code: Code.FAIL, message: "cannot access your request room." });
        }
        else {
            chatRoomManager.getUnreadMsgCountAndLastMsgContentInRoom(roomId, lastAccessTime, function (err, res) {
                if (err) {
                    clearTimeout(_timeOut);
                    next(null, { code: Code.FAIL, message: err });
                }
                else {
                    clearTimeout(_timeOut);
                    next(null, { code: Code.OK, data: res });
                }
            });
        }
    });
}

/**
* Require msg.roomId,
* Return, room model.
*/
handler.getRoomInfo = function (msg, session, next) {
    let self = this;
    let rid = msg.roomId;
    let uid = session.uid;
    if (!rid || !uid) {
        next(null, { code: Code.FAIL, message: "cannot get roominfo of empty rid." });
        return;
    }

    self.app.rpc.auth.authRemote.checkedCanAccessRoom(session, rid, uid, function (err, res) {
        console.log("checkedCanAccessRoom: ", res);

        if (err || res === false) {
            next(null, { code: Code.FAIL, message: "cannot access your request room." });
        }
        else {
            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(rid) }, null, function (res) {
                if (!!res) {
                    next(null, { code: Code.OK, data: res });
                }
                else {
                    next(null, { code: Code.FAIL, message: "Your request roomInfo is no longer." });
                }
            });
        }
    });
}

/* Require owner memberId and roommate id. 
* For get or create one-to-one chat room.
*/
handler.getRoomById = function (msg, session, next) {
    let self = this;
    let token = msg.token;
    let owner = msg.ownerId;
    let roommate = msg.roommateId;
    if (!owner || !roommate) {
        next(null, { code: Code.FAIL, message: "some params is invalid." });
        return;
    }

    let id = '';
    if (owner < roommate) {
        id = owner.concat(roommate);
    }
    else {
        id = roommate.concat(owner);
    }

    let md = crypto.createHash('md5');
    md.update(id);
    let hexCode = md.digest('hex');
    console.log("hexcode: ", hexCode);
    let roomId = hexCode.slice(0, 24);

    chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(roomId) }, null, function (result) {
        console.info("GetChatRoom", result);
        if (result !== null) {
            var obj = JSON.parse(JSON.stringify(result));
            next(null, { code: Code.OK, data: obj });
        }
        else {
            chatRoomManager.createPrivateChatRoom({ _id: new ObjectID(roomId), members: [owner, roommate] },
                function (err, result) {
                    console.info("Create Private Chat Room: ", result);

                    if (result !== null) {
                        var obj = JSON.parse(JSON.stringify(result));
                        next(null, { code: Code.OK, data: obj });

                        var roomId: string = result._id;
                        //  var roomObj = JSON.parse(JSON.stringify(result));
                        var members = new Array<Room.Member>();
                        for (var i in result.members) {
                            members.push(result.members[i]);
                        }
                        var roomMemberData = { _id: roomId, members: members };
                        self.app.rpc.auth.authRemote.updateRoomMembers(session, roomMemberData, null);

                        //<!-- Push updated lastAccessRoom fields to all members.
                        async.each(members, function (member, cb) {
                            //<!-- Add rid to user members lastAccessField.
                            userManager.AddRoomIdToRoomAccessFieldForUser(roomId, member.id, new Date(), (err, res) => {
                                if (err) {
                                    cb(err);
                                }
                                else {
                                    let accountService: AccountService = self.app.rpc.auth.getAccountService(session);
                                    accountService.getOnlineUser(member.id, function (err, user) {
                                        if (err) {
                                            console.error(err);
                                        }
                                        else {
                                            //<!-- Dont use getRoomAccessOfRoomId it not work when insert and then find db.
                                            userManager.getRoomAccessForUser(member.id, (err, roomAccess: Array<any>) => {
                                                if (err) {
                                                    console.error(err);
                                                }
                                                else {
                                                    let targetId = { uid: user.uid, sid: user.serverId };
                                                    let pushGroup = new Array();
                                                    pushGroup.push(targetId);

                                                    let param = {
                                                        route: Code.sharedEvents.onAddRoomAccess,
                                                        data: roomAccess
                                                    };

                                                    channelService.pushMessageByUids(param.route, param.data, pushGroup);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                        }, function (errCb) {
                            console.error("AddRoomIdToRoomAccessFieldForUser_fail", errCb);
                        });
                    }
                    else {
                        next(null, {
                            code: Code.FAIL,
                            message: "have no a room."
                        });
                    }
                });
        }
    });

}

const pushRoomInfoToAllMember = function (app, session, roomInfo: any, editType: string, editedMembers: Array<Room.Member>) {
    console.log("pushRoomInfoToAllMember: ", roomInfo);
    var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

    if (editType === "remove") {
        editedMembers.forEach(element => {
            roomMembers.push(element);
        });
    }

    var params = {
        route: Code.sharedEvents.onEditGroupMembers,
        data: roomInfo
    };

    var pushTargets = new Array();

    async.series([function (cb) {
        roomMembers.forEach(element => {
            let accountService: AccountService = app.rpc.auth.getAccountService(session);
            accountService.getOnlineUser(element.id, (err, user) => {
                if (!err) {
                    var target = { uid: user.uid, sid: user.serverId };
                    pushTargets.push(target);
                }
            });
        });

        cb(null, cb);
    }], (callback) => {
        channelService.pushMessageByUids(params.route, params.data, pushTargets);
    });
}

const pushRoomNameToAllMember = function (app, session, roomInfo: any) {
    console.log("pushRoomNameToAllMember: ", roomInfo);
    var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

    var params = {
        route: Code.sharedEvents.onEditGroupName,
        data: { _id: roomInfo._id, name: roomInfo.name }
    };

    var pushTargets = new Array();

    async.series([function (cb) {
        roomMembers.forEach(element => {
            let accountService: AccountService = app.rpc.auth.getAccountService(session);
            accountService.getOnlineUser(element.id, (err, user) => {
                if (!err) {
                    var target = { uid: user.uid, sid: user.serverId };
                    pushTargets.push(target);
                }
            });
        });

        cb(null, cb);
    }], (callback) => {
        channelService.pushMessageByUids(params.route, params.data, pushTargets);
    });
}

const pushRoomImageToAllMember = function (app, session, roomInfo: any) {
    console.log("pushRoomImageToAllMember: ", roomInfo);
    var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

    var params = {
        route: Code.sharedEvents.onEditGroupImage,
        data: { _id: roomInfo._id, image: roomInfo.image }
    };

    var pushTargets = new Array();

    async.series([function (cb) {
        roomMembers.forEach(element => {
            let accountService: AccountService = app.rpc.auth.getAccountService(session);
            accountService.getOnlineUser(element.id, (err, user) => {
                if (!err) {
                    var target = { uid: user.uid, sid: user.serverId };
                    pushTargets.push(target);
                }
            });
        });

        cb(null, cb);
    }], (callback) => {
        channelService.pushMessageByUids(params.route, params.data, pushTargets);
    });
}

/**
 * Push roomId , editedMember to all members of room when has member info edited.
 */
function pushMemberInfoToAllMembersOfRoom(app, session, roomInfo: Room.Room, editedMember: Room.Member) {
    var params = {
        route: Code.sharedEvents.onUpdateMemberInfoInProjectBase,
        data: { roomId: roomInfo._id, editMember: editedMember }
    };

    var pushTargets = new Array();
    async.series([function (cb) {
        roomInfo.members.forEach(member => {
            let accountService: AccountService = app.rpc.auth.getAccountService(session);
            accountService.getOnlineUser(member.id, (err, user) => {
                if (!err && user !== null) {
                    var item = { uid: user.uid, sid: user.serverId };
                    pushTargets.push(item);
                }
            });
        });

        cb(null, cb);
    }], (callback) => {
        channelService.pushMessageByUids(params.route, params.data, pushTargets);
    });
}