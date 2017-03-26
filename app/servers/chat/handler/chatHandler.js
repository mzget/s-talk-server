"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
const UserManager_1 = require("../../../controller/UserManager");
const UserService = require("../../../dal/userDataAccess");
const MRoom = require("../../../model/Room");
const Code_1 = require("../../../../shared/Code");
const MPushService = require("../../../services/ParsePushService");
const mongodb = require("mongodb");
const async = require("async");
const Joi = require("joi");
Joi.objectId = require('joi-objectid')(Joi);
const ChatRoomManager = require("../../../controller/ChatRoomManager");
const chatRoomManager = ChatRoomManager.ChatRoomManager.getInstance();
const config_1 = require("../../../../config/config");
const userManager = UserManager_1.UserManager.getInstance();
const pushService = new MPushService.ParsePushService();
const ObjectID = mongodb.ObjectID;
var channelService;
module.exports = function (app) {
    return new Handler(app);
};
const Handler = function (app) {
    console.info("ChatHandler construc...");
    this.app = app;
    channelService = this.app.get('channelService');
};
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
    let target = msg.target;
    if (!rid) {
        let errMsg = "rid is invalid please check.";
        return next(null, { code: Code_1.default.FAIL, message: errMsg, body: msg });
    }
    let timeout_id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "send message timeout..." });
    }, config_1.Config.timeout);
    self.app.rpc.auth.authRemote.getRoomMap(session, rid, function (err, room) {
        let thisRoom = room;
        if (!!thisRoom) {
            console.log("getRoomMap: ", thisRoom.name);
            if (!thisRoom.members) {
                let errMsg = "Room no have a members.";
                next(null, { code: Code_1.default.FAIL, message: errMsg });
                clearTimeout(timeout_id);
                return;
            }
            else {
                delete msg.__route__;
                let _msg = __assign({}, msg);
                _msg.createTime = new Date();
                ChatRoomManager.AddChatRecord(_msg).then(docs => {
                    if (docs.length > 0) {
                        let resultMsg = docs[0];
                        //<!-- send callback to user who send chat msg.
                        let params = {
                            messageId: resultMsg._id,
                            type: resultMsg.type,
                            createTime: resultMsg.createTime,
                            uuid: clientUUID,
                            resultMsg
                        };
                        next(null, { code: Code_1.default.OK, data: params });
                        clearTimeout(timeout_id);
                        pushMessage(self.app, session, thisRoom, resultMsg, clientUUID, target);
                    }
                    else {
                        next(null, { code: Code_1.default.FAIL, message: "AddChatRecord fail please implement resend message feature." });
                        clearTimeout(timeout_id);
                    }
                }).catch(err => {
                    next(null, { code: Code_1.default.FAIL, message: "AddChatRecord fail please implement resend message feature." });
                    clearTimeout(timeout_id);
                });
            }
        }
        else {
            clearTimeout(timeout_id);
            next(null, { code: Code_1.default.FAIL, message: err.toString() });
        }
    });
};
function pushMessage(app, session, room, message, clientUUID, target) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
    //@ Try to push message to other ...
    async.map(room.members, (item, resultCallback) => {
        app.rpc.auth.authRemote.getOnlineUser(session, item._id, function (err2, user) {
            if (err2 || user === null) {
                offlineMembers.push(item._id);
            }
            else {
                onlineMembers.push(user);
            }
            resultCallback(null, item);
        });
    }, (err, results) => {
        console.log("online %s: offline %s: room.members %s:", onlineMembers.length, offlineMembers.length, room.members.length);
        //<!-- push chat data to other members in room.
        message.uuid = clientUUID;
        let onChat = {
            route: Code_1.default.sharedEvents.onChat,
            data: message
        };
        //the target is all users
        if (target === '*') {
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
                if (!!offlineMembers && offlineMembers.length > 0) {
                    // callPushNotification(self.app, session, thisRoom, resultMsg.sender, offlineMembers);
                    simplePushNotification(app, session, offlineMembers, room, message.sender);
                }
            });
        }
        else if (target === "bot") {
            //<!-- Push new message to online users.
            let uidsGroup = new Array();
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
        }
    });
}
handler.getSyncDateTime = function (msg, session, next) {
    var date = new Date();
    var param = {
        code: Code_1.default.OK,
        data: date
    };
    next(null, param);
};
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
        next(null, { code: Code_1.default.FAIL, message: "path or ownerMessageId is invalid..." });
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
        next(null, { code: Code_1.default.OK, data: res });
    });
};
/**
* Get older message for chat room.
*/
handler.getOlderMessageChunk = function (msg, session, next) {
    let self = this;
    let rid = msg.rid;
    let topEdgeMessageTime = msg.topEdgeMessageTime;
    if (!rid || !topEdgeMessageTime) {
        next(null, { code: Code_1.default.FAIL, message: "rid or topEdgeMessageTime is missing." });
        return;
    }
    let _timeOut = setTimeout(() => {
        next(null, { code: Code_1.default.RequestTimeout, message: "getOlderMessageChunk request timeout." });
        return;
    }, config_1.Config.timeout);
    chatRoomManager.getOlderMessageChunkOfRid(rid, topEdgeMessageTime, function (err, res) {
        console.info('getOlderMessageChunk:', res.length);
        if (!!res) {
            clearTimeout(_timeOut);
            next(null, { code: Code_1.default.OK, data: res });
        }
        else {
            clearTimeout(_timeOut);
            next(null, { code: Code_1.default.FAIL });
        }
    });
};
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
        next(null, { code: Code_1.default.FAIL, message: errMsg });
        return;
    }
    let channel = channelService.getChannel(rid, false);
    chatRoomManager.getMessagesReaders(uid, rid, topEdgeMessageTime, function (err, res) {
        if (!err) {
            let onGetMessagesReaders = {
                route: Code_1.default.sharedEvents.onGetMessagesReaders,
                data: res
            };
            let memberInfo = channel.getMember(uid);
            if (!memberInfo) {
                return;
            }
            else {
                console.info("Push messages readers to owner msg.", memberInfo);
                let uidsGroup = new Array();
                uidsGroup.push(memberInfo);
                channelService.pushMessageByUids(onGetMessagesReaders.route, onGetMessagesReaders, uidsGroup);
            }
        }
    });
    next(null, { code: Code_1.default.OK });
};
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
        next(null, { code: Code_1.default.FAIL, message: err });
    }
    chatRoomManager.GetChatContent(messageId, function (err, result) {
        console.log("GetChatContent: ", result);
        if (result !== null) {
            var content = JSON.parse(JSON.stringify(result));
            next(null, { code: Code_1.default.OK, data: content });
        }
        else {
            next(null, { code: Code_1.default.FAIL, message: "have no a content for this message_id." });
        }
    });
};
/*
* Update who read message by specific message_id.
* And then push readers array to sender of specific message_id
* ////////////////////////////////////////////////////////////
* Return : no return anything.
*/
handler.updateWhoReadMessage = function (msg, session, next) {
    //    var token = msg.token;
    var messageId = msg.messageId;
    var rid = msg.roomId;
    var uid = session.uid;
    if (!messageId || !uid || !rid) {
        var errMsg = "messageId or uid or rid data field is invalid.";
        console.error(errMsg);
        next(null, { code: Code_1.default.FAIL, message: errMsg });
        return;
    }
    var channel = channelService.getChannel(rid, false);
    if (!channel) {
        var message = "no have room for your request.";
        console.warn(message);
        next(null, { code: Code_1.default.FAIL, message: message });
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
                            route: Code_1.default.sharedEvents.onMessageRead,
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
    next(null, { code: Code_1.default.OK });
};
/*
* Update who read message by specific message_id.
* And then push readers array to sender of specific message_id
* ////////////////////////////////////////////////////////////
* Return : no return anything.
*/
handler.updateWhoReadMessages = function (msg, session, next) {
    //    var token = msg.token;
    var messages = JSON.parse(msg.messageIds);
    var rid = msg.roomId;
    var uid = session.uid;
    if (!messages || !uid || !rid) {
        var errMsg = "messageId or uid or rid data field is invalid.";
        console.error(errMsg);
        next(null, { code: Code_1.default.FAIL, message: errMsg });
        return;
    }
    var channel = channelService.getChannel(rid, false);
    if (!channel) {
        var errMsg = "no have room for your request.";
        console.warn(errMsg);
        next(null, { code: Code_1.default.FAIL, message: errMsg });
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
    next(null, { code: Code_1.default.OK });
};
//<!-- Push who read message to sender.
function getWhoReadMessages(messages, channel) {
    async.eachSeries(messages, function iterator(item, cb) {
        chatRoomManager.getWhoReadMessage(item, function (err, res) {
            if (!err) {
                var onMessageRead = {
                    route: Code_1.default.sharedEvents.onMessageRead,
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
function callPushNotification(app, session, room, sender, offlineMembers) {
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
        let targetDevices = new Array();
        let targetMemberWhoSubscribeRoom = new Array();
        //<-- To push only user who subscribe this room. This process need a some logic.
        /**
         * - check the offline user who subscribe this room or not.
         * - to check closedNoticeGroupList or closedNoticeUserList user room.name to detech room type.
         * - if one of list has contain room_id dont push message for them.
         *  */
        async.waterfall([t => {
                //<!-- checking roomType
                chatRoomManager.GetChatRoomInfo(room._id, { type: 1 }).then(result => {
                    if (result.type === MRoom.RoomType.organizationGroup || result.type === MRoom.RoomType.projectBaseGroup) {
                        t(null, {});
                    }
                    else {
                        t(null, result.type);
                    }
                }).catch(err => {
                    let errMsg = "checkedRoomType fail.";
                    console.error(errMsg);
                    t(new Error(errMsg), null);
                });
            }, (arg1, cb) => {
                if (arg1 === null) {
                    cb(null, null);
                }
                else if (arg1 === MRoom.RoomType.privateGroup || arg1 === MRoom.RoomType.privateChat) {
                    /** check closedNoticeGroupList. If unsubscribe room message will ignore.*/
                    //<!-- check closedNoticeUserList. If unsubscribe room message will ignore.
                    let roomType = JSON.parse(JSON.stringify(arg1));
                    async.eachSeries(offlineMembers, function iterrator(item, callback) {
                        //                console.warn("offline member _id: ", item);
                        userManager.checkUnsubscribeRoom(item, roomType, room._id, (err, results) => {
                            //<!-- if result is contain in unsubscribe list. we ignore this member.
                            if (!err && results !== null) {
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
                else {
                    offlineMembers.forEach(offline => {
                        var objId = new ObjectID(offline);
                        targetMemberWhoSubscribeRoom.push(objId);
                    });
                    cb(null, {});
                }
            }], (err, result) => {
            if (err || result === null) {
                console.error(err);
            }
            else {
                let promise = new Promise(function (resolve, reject) {
                    //<!-- Query all deviceTokens for each members.
                    UserService.prototype.getDeviceTokens(targetMemberWhoSubscribeRoom, (err, res) => {
                        if (!!res) {
                            let memberTokens = res; // array of deviceTokens for each member.
                            async.mapSeries(memberTokens, function iterator(item, cb) {
                                if (!!item.deviceTokens) {
                                    let deviceTokens = item.deviceTokens;
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
function simplePushNotification(app, session, offlineMembers, room, sender) {
    let pushTitle = room.name;
    let alertMessage = "";
    let targetMemberWhoSubscribeRoom = new Array();
    let targetDevices = new Array();
    if (!!pushTitle) {
        alertMessage = pushTitle + " sent you message.";
        call();
    }
    else {
        new Promise((resolve, reject) => {
            app.rpc.auth.authRemote.getUserTransaction(session, sender, function (err, userTrans) {
                console.warn("getUserTransaction", err, userTrans);
                if (!!err || !userTrans) {
                    console.warn(err);
                    reject(err);
                }
                else {
                    pushTitle = userTrans.username;
                    resolve(pushTitle);
                }
            });
        }).then(value => {
            alertMessage = value + " sent you message.";
            call();
        }).catch(err => {
            alertMessage = "You have a new message";
            call();
        });
    }
    function call() {
        async.map(offlineMembers, function iterator(item, result) {
            result(null, new ObjectID(item));
        }, function done(err, results) {
            targetMemberWhoSubscribeRoom = results.slice();
            let promise = new Promise(function (resolve, reject) {
                //<!-- Query all deviceTokens for each members.
                UserService.prototype.getDeviceTokens(targetMemberWhoSubscribeRoom, (err, res) => {
                    console.warn("DeviceToken", err, res);
                    //DeviceToken null [ { deviceTokens: [ 'eb5f4051aea5b991e1f2a0c82f5b25afdc848eaa7e9bc76e194a475dffd95f32' ] } ]
                    if (!!res) {
                        let memberTokens = res; // array of deviceTokens for each member.
                        async.mapSeries(memberTokens, function iterator(item, cb) {
                            if (!!item.deviceTokens) {
                                let deviceTokens = item.deviceTokens;
                                async.mapSeries(deviceTokens, (token, resultCb) => {
                                    resultCb(null, token);
                                }, function done(err, results) {
                                    if (!!err) {
                                        cb(err, null);
                                    }
                                    else {
                                        targetDevices = results.slice();
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
        });
    }
}
