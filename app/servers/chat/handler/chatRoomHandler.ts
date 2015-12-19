/// <reference path="../../../../typings/tsd.d.ts" />

import Mcontroller = require("../../../controller/ChatRoomManager");
import MUserManager = require("../../../controller/UserManager");
import Code = require("../../../../shared/Code");
import TokenService = require("../../../services/tokenService");
import mongodb = require('mongodb');
import crypto = require('crypto');
import MChatService = require('../../../services/chatService');
import User = require('../../../model/User');
import Room = require('../../../model/Room');
import UserRole = require('../../../model/UserRole');
import async = require('async');

var ObjectID = mongodb.ObjectID;
var chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var userManager = MUserManager.Controller.UserManager.getInstance();
var tokenService: TokenService = new TokenService();
var chatService: MChatService.ChatService;
var channelService;


console.info("instanctiate ChatRoomHandler.");
module.exports = function (app) {
    return new ChatRoomHandler(app);
};

var ChatRoomHandler = function (app) {
    this.app = app;
    chatService = app.get('chatService');
    channelService = app.get('channelService');
};

var prototype = ChatRoomHandler.prototype;

prototype.requestCreateProjectBase = function (msg, session, next) {
    var groupName: string = msg.groupName;
    var members: Room.Member[] = JSON.parse(msg.members);

    if (!groupName || !members) {
        var errMessage: string = "cannot create group may be you missing some variable.";
        console.error(errMessage);
        next(null, { code: Code.FAIL, message: errMessage });
        return;
    }

    var creator = session.uid;
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
            if (res.role !== UserRole.UserRole.personnel) {
                chatRoomManager.createProjectBaseGroup(groupName, members, function (err, result) {
                    console.info("createProjectBaseGroup response: ", result);
                    
                    var room: Room.Room = JSON.parse(JSON.stringify(result[0]));
                    next(null, { code: Code.OK, data: room });
                    
                    //<!-- Update list of roomsMember mapping.
                    chatService.addRoom(result[0]);
                    
                    var memberIds = new Array<string>();
                    room.members.forEach(value => {
                        memberIds.push(value.id);
                    });

                    //<!-- Add rid to each user members.
                    userManager.AddRoomIdToRoomAccessField(room._id, memberIds, new Date(), (err, res) => {
                        //<!-- Now get roomAccess data for user who is online and then push data to them.
                        memberIds.forEach(id => {
                            chatService.getOnlineUser(id, (err, user) => {
                                if (!err && user !== null) {
                                    userManager.getRoomAccessForUser(user.uid, (err, roomAccess) => {
                                        //<!-- Now push roomAccess data to user.
                                        var param = {
                                            route: Code.sharedEvents.onAddRoomAccess,
                                            data: roomAccess
                                        }

                                        var pushTarget = new Array();
                                        var target = { uid: user.uid, sid: user.serverId };
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
                        chatService.getOnlineUser(member.id, (err, user) => {
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

prototype.editMemberInfoInProjectBase = function (msg, session, next) {
    var roomId: string = msg.roomId;
    var roomType: string = msg.roomType;
    var member: Room.Member = JSON.parse(msg.member);
    
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
                pushMemberInfoToAllMembersOfRoom(room, member);

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
prototype.userCreateGroupChat = function (msg, session, next) {
    var groupName: string = msg.groupName;
    var memberIds : string[] =  JSON.parse(msg.memberIds);

    if (!groupName || !memberIds) {
        var errMessage: string = "cannot create group may be you missing some variable.";
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
            chatService.addRoom(result[0]);
            
            pushNewRoomAccessToNewMembers(room._id, room.members);
            
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
                chatService.getOnlineUser(element, (err, user) => {
                    if(!err) {
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
prototype.updateGroupImage = function (msg, session, next) {
    var rid: string = msg.groupId;
    var newUrl: string = msg.path;
    if (!rid || !newUrl) {
        next(null, { code: Code.FAIL, message: "groupId or pathUrl is empty or invalid." });
        return;
    }
    
    var objId = new ObjectID(rid);
    if(!objId) {
        next(null, { code: Code.FAIL, message: "groupId is invalid." });
        return;
    }

    chatRoomManager.updateGroupImage(rid, newUrl, function (err, res) {
        if (!err) {
            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(rid) }, null, (res) => {
                if (res !== null) {
                    pushRoomImageToAllMember(res);
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
prototype.editGroupMembers = function (msg, session, next) {
    var editType: string = msg.editType;
    var roomId: string = msg.roomId;
    var roomType: string = msg.roomType;
    var members: string[] = JSON.parse(msg.members);

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
                    pushRoomInfoToAllMember(res, editType, editedMembers);
                    if(editType === "add") {
                        pushNewRoomAccessToNewMembers(res._id, editedMembers);
                    }
                    var roomObj = { _id: res._id, members: res.members };
                    chatService.addRoom(roomObj);
                }    
            });
        }
    });

    next(null, { code: Code.OK });
}

function pushNewRoomAccessToNewMembers(rid: string, targetMembers: Array<Room.Member>) {
    var memberIds = new Array<string>();
    async.map(targetMembers, function iterator(item, cb) {
        memberIds.push(item.id);
        cb(null, null);
    }, function done(err, results) {
        //<!-- Add rid to roomAccess data for each member. And then push new roomAccess info to all members.
        userManager.AddRoomIdToRoomAccessField(rid, memberIds, new Date(), function (err, res) {
            //<!-- Now get roomAccess data for user who is online and then push data to them.
            memberIds.forEach(id => {
                chatService.getOnlineUser(id, (err, user) => {
                    if (!err && user !== null) {
                        userManager.getRoomAccessForUser(user.uid, (err, roomAccess) => {
                            //<!-- Now push roomAccess data to user.
                            var param = {
                                route: Code.sharedEvents.onAddRoomAccess,
                                data: roomAccess
                            }
    
                            var pushTarget = new Array();
                            var target = { uid: user.uid, sid: user.serverId };
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
prototype.editGroupName = function (msg, session, next) {
    var newGroupName: string = msg.newGroupName;
    var roomId: string = msg.roomId;
    var roomType: string = msg.roomType;

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
                pushRoomNameToAllMember(res);
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
prototype.getUnreadRoomMessage = function (msg, session, next) {
    var roomId: string = msg.roomId;
    var lastAccessTime: string = msg.lastAccessTime;
    var token = msg.token;
    var uid = session.uid;

    if (!roomId || !lastAccessTime || !uid) {
        var msgs = "roomId, lastAccessTime or uid is empty or invalid.";
        next(null, { code: Code.FAIL, message: msgs });
        return;
    }

    this.app.rpc.chat.chatRemote.checkedCanAccessRoom(session, roomId, uid, function (err, res) {
        console.log("checkedCanAccessRoom: ", res);

        if (err || res === false) {
            next(null, { code: Code.FAIL, message: "cannot access your request room." });
        }
        else {
            chatRoomManager.getUnreadMsgCountAndLastMsgContentInRoom(roomId, lastAccessTime, function (err, res) {
                console.log("GetUnreadMsgOfRoom response: ", res);
                if (err) {
                    next(null, { code: Code.FAIL, message: err });
                }
                else {
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
prototype.getRoomInfo = function (msg, session, next) {
    var rid = msg.roomId;
    var uid = session.uid;
    if (!rid || !uid) {
        next(null, { code: Code.FAIL, message: "cannot get roominfo of empty rid." });
        return;
    }

    this.app.rpc.chat.chatRemote.checkedCanAccessRoom(session, rid, uid, function (err, res) {
        console.log("checkedCanAccessRoom: ", res);

        if (err || res === false) {
            next(null, { code: Code.FAIL, message: "cannot access your request room." });
        }
        else {
            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(rid) }, null, function (res) {
                next(null, { code: Code.OK, data: res });
            });
        }
    });
}

/* Require owner memberId and roommate id. 
* For get or create one-to-one chat room.
*/
prototype.getRoomById = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    var owner = msg.ownerId; 
    var roommate = msg.roommateId;
    if(!owner || !roommate) {
        next(null, { code: Code.FAIL, message: "some params is invalid." });
        return;
    }
    
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.log(err);
            next(err, res);
        }
        else {
            let id = '';
            if(owner < roommate) {
                id = owner.concat(roommate);
            }
            else {
                id = roommate.concat(owner);
            }
            
            var md = crypto.createHash('md5');
            md.update(id);
            var hexCode = md.digest('hex');
            console.log("hexcode: ", hexCode);
            var roomId = hexCode.slice(0, 24);

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
                                self.app.rpc.chat.chatRemote.updateRoomMembers(session, roomMemberData, null);
                                   
                                //<!-- Push updated lastAccessRoom fields to all members.
                                async.each(members, function (member, cb) {
                                    //<!-- Add rid to user members lastAccessField.
                                    userManager.AddRoomIdToRoomAccessFieldForUser(roomId, member.id, new Date(), (err, res) => {
                                        if (err) {
                                            cb(err);
                                        }
                                        else {
                                            chatService.getOnlineUser(member.id, function (err, user) {
                                                if (err) {
                                                    console.error(err);
                                                }
                                                else {
                                                    //<!-- Dont use getRoomAccessOfRoomId it not work when insert and then find db.
                                                    userManager.getRoomAccessForUser(member.id, (err, roomAccess) => {
                                                        if (err) {
                                                            console.error(err);
                                                        }
                                                        else {
                                                            var targetId = { uid: user.uid, sid: user.serverId };
                                                            let pushGroup = new Array();
                                                            pushGroup.push(targetId);

                                                            var param = {
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
    });
}

var pushRoomInfoToAllMember = function (roomInfo: any, editType:string, editedMembers: Array<Room.Member>) {
    console.log("pushRoomInfoToAllMember: ", roomInfo);
    var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));
    
    if(editType === "remove") {
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
            chatService.getOnlineUser(element.id, (err, user) => {
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

var pushRoomNameToAllMember = function (roomInfo: any) {
    console.log("pushRoomNameToAllMember: ", roomInfo);
    var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

    var params = {
        route: Code.sharedEvents.onEditGroupName,
        data: { _id: roomInfo._id, name: roomInfo.name }
    };

    var pushTargets = new Array();

    async.series([function (cb) {
        roomMembers.forEach(element => {
            chatService.getOnlineUser(element.id, (err, user) => {
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

var pushRoomImageToAllMember = function (roomInfo: any) {
    console.log("pushRoomImageToAllMember: ", roomInfo);
    var roomMembers: Room.Member[] = JSON.parse(JSON.stringify(roomInfo.members));

    var params = {
        route: Code.sharedEvents.onEditGroupImage,
        data: { _id: roomInfo._id, image: roomInfo.image }
    };

    var pushTargets = new Array();

    async.series([function (cb) {
        roomMembers.forEach(element => {
            chatService.getOnlineUser(element.id, (err, user) => {
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
function pushMemberInfoToAllMembersOfRoom(roomInfo: Room.Room, editedMember: Room.Member) {
    var params = {
        route: Code.sharedEvents.onUpdateMemberInfoInProjectBase,
        data: { roomId: roomInfo._id, editMember: editedMember }
    };

    var pushTargets = new Array();
    async.series([function (cb) {
        roomInfo.members.forEach(member => {
            chatService.getOnlineUser(member.id, (err, user) => {
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