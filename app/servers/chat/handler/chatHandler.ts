import Mcontroller = require('../../../controller/ChatRoomManager');
import MUserManager = require("../../../controller/UserManager");
import User = require('../../../model/User');
import UserService = require("../../../dal/userDataAccess");
import MRoom = require('../../../model/Room');
import MMessage = require('../../../model/Message');
import Code = require('../../../../shared/Code');
import MPushService = require('../../../services/ParsePushService');
import { AccountService } from '../../../services/accountService';
import mongodb = require('mongodb');
import https = require('https');
import async = require('async');

const webConfig = require('../../../../config/webConfig.json');
const chatRoomManager: Mcontroller.ChatRoomManager = Mcontroller.ChatRoomManager.getInstance();
const userManager = MUserManager.Controller.UserManager.getInstance();
const pushService = new MPushService.ParsePushService();
const ObjectID = mongodb.ObjectID;
var channelService;


module.exports = function (app) {
    console.info("instanctiate ChatHandler.");
    return new Handler(app);
}

const Handler = function (app) {
    this.app = app;
    channelService = this.app.get('channelService');
}

const handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 * TODO...
 * ==> 1. room members who online and join in room. <for case but not significant>.
 * ==> 2. room members who online and not join room.
 * ==> 3. room members who not online. <Push>
 */
handler.send = function (msg, session, next) {
    let self = this;
    let rid = session.get('rid');
    let clientUUID = msg.uuid;

    if (!rid) {
        let errMsg = "rid is invalid please chaeck.";
        next(null, { code: Code.FAIL, message: errMsg, body: msg });
        return;
    }

    //<!-- Get online members of room.
    let thisRoom: MRoom.Room = null;
    let onlineMembers = new Array<User.OnlineUser>();
    let offlineMembers = new Array<string>();

    self.app.rpc.auth.authRemote.checkedCanAccessRoom(session, rid, session.uid, function (err, res) {
        if (err || res === false) {
            next(null, { code: Code.FAIL, message: "cannot access your request room." });
        }
        else {
            self.app.rpc.auth.authRemote.getRoomMap(session, rid, function (err, room) {
                console.log("get members from room: %s name: %s members: %s", rid, room.name, room.members.length);

                thisRoom = room;
                if (!room.members) {
                    console.warn("RoomMembers is empty.");
                }
                else {
                    room.members.forEach(value => {
                        self.app.rpc.auth.authRemote.getOnlineUser(session, value.id, function (err2, user) {
                            if (err2 || user === null) {
                                offlineMembers.push(value.id);
                                //console.info("who offline:", value.id, user, err2);
                            }
                            else {
                                onlineMembers.push(user);
                                //console.info("who online:", value.id);
                            }
                        });
                    });

                    console.log("0 online %s: offline %s: room.members %s:", onlineMembers.length, offlineMembers.length, room.members.length);

                    let _msg = new MMessage.Message();
                    _msg.rid = msg.rid,
                        _msg.type = msg.type,
                        _msg.body = msg.content,
                        _msg.sender = msg.sender,
                        _msg.createTime = new Date(),
                        _msg.meta = msg.meta;

                    chatRoomManager.AddChatRecord(_msg, function (err, docs) {
                        if (docs !== null) {
                            let resultMsg: MMessage.Message = JSON.parse(JSON.stringify(docs[0]));
                            //<!-- send callback to user who send chat msg.
                            let params = {
                                messageId: resultMsg._id,
                                type: resultMsg.type,
                                createTime: resultMsg.createTime,
                                uuid: clientUUID
                            };
                            next(null, { code: Code.OK, data: params });

                            console.log("1 online %s: offline %s: room.members %s:", onlineMembers.length, offlineMembers.length, room.members.length);

                            //<!-- push chat data to other members in room.
                            resultMsg.uuid = clientUUID;
                            let onChat = {
                                route: Code.sharedEvents.onChat,
                                data: resultMsg
                            };

                            //the target is all users
                            if (msg.target === '*') {
                                //<!-- Push new message to online users.
                                let uidsGroup = new Array();
                                async.eachSeries(onlineMembers, function iterator(val, cb) {
                                    let group = {
                                        uid: val.uid,
                                        sid: val.serverId
                                    };
                                    uidsGroup.push(group);

                                    cb();
                                }, function done() {
                                    channelService.pushMessageByUids(onChat.route, onChat.data, uidsGroup);

                                    //<!-- Push message to off line users via parse.
                                    callPushNotification(self.app, session, thisRoom, resultMsg.sender, offlineMembers);
                                });
                            }
                            else if (msg.target === "bot") {
                                //<!-- Push new message to online users.
                                var uidsGroup = new Array();
                                async.eachSeries(onlineMembers, function iterator(val, cb) {
                                    var group = {
                                        uid: val.uid,
                                        sid: val.serverId
                                    };
                                    uidsGroup.push(group);

                                    cb();
                                }, function done() {
                                    channelService.pushMessageByUids(onChat.route, onChat.data, uidsGroup);
                                });
                            }
                            else {
                                //the target is specific user
                            }
                        }
                        else {
                            next(null, { code: Code.FAIL, message: "AddChatRecord fail please try to resend your message." });
                        }
                    });
                }
            });
        }
    });
};

handler.getSyncDateTime = function (msg, session, next) {
    var date: Date = new Date();
    var param = {
        code: Code.OK,
        data: date
    }

    next(null, param);
}

/**
* UpLoadContentFinish ,
* Require { contentUrl, ownerMessageId }
*/
handler.uploadImageFinished = function (msg, session, next) {
    var self = this;
    var rid = session.get('rid');
    var channelService = this.app.get('channelService');
    var channel = channelService.getChannel(rid, false);
    var contentUrl = msg.contentUrl;
    var ownerMessageId = msg.ownerMessageId;

    if (!contentUrl || !ownerMessageId) {
        next(null, { code: Code.FAIL, message: "path or ownerMessageId is invalid..." });
        return;
    }

    chatRoomManager.updateChatRecordContent(ownerMessageId, contentUrl, (err, res) => {
        console.log("updateChatRecord: ", res.result);
        if (res !== null) {
            chatRoomManager.GetChatContent(ownerMessageId, (content) => {
                console.log("GetChatContent: ", content);
                if (content !== null) {
                    var obj = JSON.parse(JSON.stringify(content));
                    console.log(obj._id);

                    var param = {
                        route: 'onUploaded',
                        ownerMessageId: obj._id,
                        body: obj.body,
                        type: obj.type,
                        sender: obj.sender
                    };
                    channel.pushMessage(param.route, param);
                }
            });
        }

        next(null, { code: Code.OK, data: res });
    });
}

/**
* get log messageid form chat room. 
* @param {room_id} msg message from client
* @param {lastAccessTime} msg.lastAccessTime of room specific.
 * @param {Object} session
 * @param  {Function} next next stemp callback that return records of message_id.
*/
handler.getChatHistory = function (msg, session, next) {
    let self = this;
    let rid = msg.rid;
    let lastMessageTime = msg.lastAccessTime;

    if (!rid) {
        next(null, { code: Code.FAIL, message: "room_id field is in valid." });
        return;
    }

    if (!lastMessageTime) {
        next(null, { code: Code.FAIL, message: "lastAccessTime field is in valid." });
        return;
    }

    let _timeOut = setTimeout(() => {
        next(null, { code: Code.RequestTimeout, message: "getChatHistory request timeout." });
        return;
    }, webConfig.timeout);

    let utc = new Date(lastMessageTime);
    chatRoomManager.getNewerMessageOfChatRoom(rid, utc, function (error, result) {
        console.log("getChatHistory: ", result.length);
        if (result !== null) {
            clearTimeout(_timeOut);

            let chatrecords = JSON.parse(JSON.stringify(result));
            next(null, { code: Code.OK, data: chatrecords });

            //<!-- When get chat history complete. System will update roomAccess data for user.
            self.app.rpc.chat.chatRemote.updateRoomAccess(session, session.uid, rid, new Date(), null);
        } else {
            clearTimeout(_timeOut);
            next(null, { code: Code.FAIL, message: "have no a chatrecord for this room." });
        }
    });
}

/**
* Get older message for chat room.
*/
handler.getOlderMessageChunk = function (msg, session, next: (err, res) => void) {
    let self = this;
    let rid = msg.rid;
    let topEdgeMessageTime = msg.topEdgeMessageTime;

    if (!rid || !topEdgeMessageTime) {
        next(null, { code: Code.FAIL, message: "rid or topEdgeMessageTime is missing." });
        return;
    }

    let _timeOut = setTimeout(() => {
        next(null, { code: Code.RequestTimeout, message: "getOlderMessageChunk request timeout." });
        return;
    }, webConfig.timeout);

    chatRoomManager.getOlderMessageChunkOfRid(rid, topEdgeMessageTime, function (err, res) {
        console.info('getOlderMessageChunk:', res.length);

        if (!!res) {
            clearTimeout(_timeOut);
            next(null, { code: Code.OK, data: res });
        }
        else {
            clearTimeout(_timeOut);
            next(null, { code: Code.FAIL });
        }
    });
}

handler.checkOlderMessagesCount = function (msg, session, next: (err, res) => void) {
    let self = this;
    let rid = msg.rid;
    let topEdgeMessageTime = msg.topEdgeMessageTime;

    if (!rid || !topEdgeMessageTime) {
        next(null, { code: Code.FAIL, message: "rid or topEdgeMessageTime is missing." });
        return;
    }

    let _timeOut = setTimeout(() => {
        next(null, { code: Code.RequestTimeout, message: "checkOlderMessagesCount request timeout." });
        return;
    }, webConfig.timeout);

    chatRoomManager.getOlderMessageChunkOfRid(rid, topEdgeMessageTime, function (err, res) {
        console.info('getOlderMessageChunk:', res.length);

        if (!!res) {
            clearTimeout(_timeOut);
            next(null, { code: Code.OK, data: res.length });
        }
        else {
            clearTimeout(_timeOut);
            next(null, { code: Code.FAIL });
        }
    });
}

/* 
* Get last limit query messages of specific user and room then return messages info. 
* Require: 
{ userId, for get last messages of specific user. }
{ roomId, for query last messages in room }
* Return:
{ data: [ messageId, readers ] }
*/
handler.getMessagesReaders = function (msg, session, next) {
    let uid = session.uid;
    let rid = session.get('rid');
    let topEdgeMessageTime = msg.topEdgeMessageTime;

    let errMsg = "uid or rid is invalid. or may be some params i missing.";
    if (!uid || !rid || !topEdgeMessageTime) {
        console.error(errMsg);
        next(null, { code: Code.FAIL, message: errMsg });

        return;
    }

    let channel = channelService.getChannel(rid, false);

    chatRoomManager.getMessagesReaders(uid, rid, topEdgeMessageTime, function (err, res) {
        if (!err) {
            var onGetMessagesReaders = {
                route: Code.sharedEvents.onGetMessagesReaders,
                data: res
            };

            var memberInfo = channel.getMember(uid);
            if (!memberInfo) {
                return;
            }
            else {
                var uidsGroup = new Array();
                uidsGroup.push(memberInfo);
                console.info("Push messages readers to owner msg.", memberInfo);
                channelService.pushMessageByUids(onGetMessagesReaders.route, onGetMessagesReaders, uidsGroup);
            }
        }
    });

    next(null, { code: Code.OK });
}

/**
* get log message content by message_id. 
* @param {message_id} msg message from client
* @param {Object} session
* @param  {Function} next next stemp callback that return records of message_id.
*/
handler.getMessageContent = function (msg, session, next) {
    var messageId = msg.messageId;
    if (!messageId) {
        var err = "messageId connot be null or empty.";
        console.warn(err);
        next(null, { code: Code.FAIL, message: err });
    }

    chatRoomManager.GetChatContent(messageId, function (err, result) {
        console.log("GetChatContent: ", result);
        if (result !== null) {
            var content = JSON.parse(JSON.stringify(result));
            next(null, { code: Code.OK, data: content });
        } else {
            next(null, { code: Code.FAIL, message: "have no a content for this message_id." });
        }
    });
}

/*
* Update who read message by specific message_id.
* And then push readers array to sender of specific message_id
* ////////////////////////////////////////////////////////////
* Return : no return anything.
*/
handler.updateWhoReadMessage = function (msg, session, next) {
    //    var token = msg.token;
    var messageId: string = msg.messageId;
    var rid: string = msg.roomId;
    var uid = session.uid;

    if (!messageId || !uid || !rid) {
        var errMsg = "messageId or uid or rid data field is invalid.";
        console.error(errMsg);
        next(null, { code: Code.FAIL, message: errMsg });
        return;
    }

    var channel = channelService.getChannel(rid, false);
    if (!channel) {
        var message = "no have room for your request.";
        console.warn(message);
        next(null, { code: Code.FAIL, message: message });
        return;
    }
    else {
        //<!-- update whether this session read this message_id.
        chatRoomManager.updateWhoReadMessage(messageId, uid, (err, res) => {
            if (err) {
                return;
            }
            else {
                //<!-- Push who read message to sender.
                chatRoomManager.getWhoReadMessage(messageId, function (err, res) {
                    if (!err) {
                        var onMessageRead = {
                            route: Code.sharedEvents.onMessageRead,
                            data: res
                        };

                        var senderInfo = channel.getMember(res.sender);
                        if (!senderInfo) {
                            return;
                        }
                        else {
                            var uidsGroup = new Array();
                            uidsGroup.push(senderInfo);
                            console.info("Push member who read message to msg sender.", senderInfo);
                            channelService.pushMessageByUids(onMessageRead.route, onMessageRead.data, uidsGroup);
                        }
                    }
                });
            }
        });
    }

    next(null, { code: Code.OK });
}

/*
* Update who read message by specific message_id.
* And then push readers array to sender of specific message_id
* ////////////////////////////////////////////////////////////
* Return : no return anything.
*/
handler.updateWhoReadMessages = function (msg, session, next) {
    //    var token = msg.token;
    var messages: Array<string> = JSON.parse(msg.messageIds);
    var rid: string = msg.roomId;
    var uid = session.uid;

    if (!messages || !uid || !rid) {
        var errMsg = "messageId or uid or rid data field is invalid.";
        console.error(errMsg);
        next(null, { code: Code.FAIL, message: errMsg });
        return;
    }

    var channel = channelService.getChannel(rid, false);
    if (!channel) {
        var errMsg = "no have room for your request.";
        console.warn(errMsg);
        next(null, { code: Code.FAIL, message: errMsg });
        return;
    }
    else {
        async.eachSeries(messages, function itorator(item, cb) {
            chatRoomManager.updateWhoReadMessage(item, uid, function callback(err, res) {
                if (err) {
                    cb(err);
                }
                else {
                    cb();
                }
            });
        }, function done(err) {
            //<!-- update whether this session read this message_id.
            getWhoReadMessages(messages, channel);
        });
    }

    next(null, { code: Code.OK });
}

//<!-- Push who read message to sender.
function getWhoReadMessages(messages: Array<string>, channel) {
    async.eachSeries(messages, function iterator(item, cb) {
        chatRoomManager.getWhoReadMessage(item, function (err, res) {
            if (!err) {
                var onMessageRead = {
                    route: Code.sharedEvents.onMessageRead,
                    data: res
                };

                var senderInfo = channel.getMember(res.sender);
                if (!senderInfo) {
                    return;
                }
                else {
                    var uidsGroup = new Array();
                    uidsGroup.push(senderInfo);
                    console.info("Push member who read message to msg sender.", senderInfo);
                    channelService.pushMessageByUids(onMessageRead.route, onMessageRead.data, uidsGroup);
                }

                cb();
            }
            else {
                cb(err);
            }
        });
    }, function done(err) {
        console.log("getWhoReadMessages. done");
    });
}

function callPushNotification(app: any, session: any, room: MRoom.Room, sender: string, offlineMembers: Array<string>): void {
    //<!-- Push message to off line users via parse.
    /**<!-- Before push message via parse.
    * Todo 
    * 1. Know room name by get roomType and get name. 
    * 2. Know user who send message.
    * 3. Know message type.
    * 4. Know installationsId of receiver users.
    */
    let pushTitle = room.name;
    let alertMessage = "";
    if (!pushTitle) {
        new Promise((resolve, reject) => {
            app.rpc.auth.authRemote.getUserTransaction(session, sender, function (err, userTrans) {
                pushTitle = userTrans.username;

                resolve(pushTitle);
            });
        }).then(value => {
            alertMessage = value + " has a new message.";
            call();
        });
    }
    else {
        alertMessage = pushTitle + " has a new message.";
        call();
    }

    function call() {
        console.warn("alertMessage is ", alertMessage, offlineMembers);

        let targetDevices = new Array<string>();
        let targetMemberWhoSubscribeRoom = new Array<mongodb.ObjectID>();
        //<-- To push only user who subscribe this room. This process need a some logic.
        /**
         * - check the offline user who subscribe this room or not.
         * - to check closedNoticeGroupList or closedNoticeUserList user room.name to detech room type.
         * - if one of list has contain room_id dont push message for them.
         *  */

        async.waterfall([t => {
            //<!-- checking roomType
            chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(room._id) }, { type: 1 }, (result) => {
                if (!result) {
                    var errMsg = "checkedRoomType fail.";
                    console.error(errMsg);
                    t(new Error(errMsg), null);
                }
                else if (result.type === MRoom.RoomType.organizationGroup || result.type === MRoom.RoomType.projectBaseGroup) {
                    t(null, {});
                }
                else {
                    t(null, result.type);
                }
            })
        }, (arg1, cb) => {
            if (arg1 === null) {
                cb(null, null);
            }
            else if (arg1 === MRoom.RoomType.privateGroup || arg1 === MRoom.RoomType.privateChat) {
                /** check closedNoticeGroupList. If unsubscribe room message will ignore.*/
                //<!-- check closedNoticeUserList. If unsubscribe room message will ignore.
                let roomType: MRoom.RoomType = JSON.parse(JSON.stringify(arg1));

                async.eachSeries(offlineMembers, function iterrator(item, callback) {
                    //                console.warn("offline member _id: ", item);
                    userManager.checkUnsubscribeRoom(item, roomType, room._id, (err, results) => {
                        //<!-- if result is contain in unsubscribe list. we ignore this member.
                        if (!err && results !== null) {
                            // console.log("checkUnsubscribeRoom");
                        }
                        else {
                            var objId = new ObjectID(item);
                            targetMemberWhoSubscribeRoom.push(objId);
                        }

                        callback();
                    });
                }, function callback(err) {
                    if (err) {
                        cb(err, null);
                    }
                    else {
                        cb(null, {});
                    }
                });
            }
            else { //<!-- When room type is orgGroup or ProjectBase don't check unsubscribe.
                offlineMembers.forEach(offline => {
                    var objId = new ObjectID(offline);
                    targetMemberWhoSubscribeRoom.push(objId);
                });

                cb(null, {});
            }
        }],
            (err, result) => {
                if (err || result === null) {
                    console.error(err);
                }
                else {
                    let promise = new Promise(function (resolve, reject) {
                        //<!-- Query all deviceTokens for each members.
                        UserService.prototype.getDeviceTokens(targetMemberWhoSubscribeRoom, (err, res) => {
                            if (!!res) {
                                let memberTokens: Array<any> = res; // array of deviceTokens for each member.
                                async.mapSeries(memberTokens, function iterator(item, cb) {
                                    if (!!item.deviceTokens) {
                                        let deviceTokens: Array<string> = item.deviceTokens;
                                        async.mapSeries(deviceTokens, (token, resultCb) => {
                                            targetDevices.push(token);
                                            resultCb(null, {});
                                        }, function done(err, results) {
                                            if (err) {
                                                cb(err, null);
                                            }
                                            else {
                                                cb(null, null);
                                            }
                                        });
                                    }
                                    else {
                                        cb(null, null);
                                    }
                                }, function done(err, results) {
                                    if (err) {
                                        reject(err);
                                    }
                                    else {
                                        resolve(results);
                                    }
                                });
                            }
                        });
                    }).then(function onfulfill(value) {
                        console.warn("Push", targetDevices, alertMessage);
                        pushService.sendPushToTargetDevices(targetDevices, alertMessage);
                    }).catch(function onRejected(err) {
                        console.error("push to target deviceTokens fail.", err);
                    });
                }
            });
    }
}