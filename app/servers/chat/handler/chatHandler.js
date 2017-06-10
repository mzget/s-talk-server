"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
const Code_1 = require("../../../../shared/Code");
const MPushService = require("../../../services/ParsePushService");
const chatroomService = require("../../../services/chatroomService");
const messageService = require("../../../services/messageService");
const userService = require("../../../services/userService");
const async = require("async");
const Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);
const ChatRoomManager = require("../../../controller/ChatRoomManager");
const chatRoomManager = ChatRoomManager.ChatRoomManager.getInstance();
const config_1 = require("../../../../config/config");
const pushService = new MPushService.ParsePushService();
let channelService;
module.exports = function (app) {
    return new Handler(app);
};
const Handler = function (app) {
    console.info("ChatHandler construc...");
    this.app = app;
    channelService = this.app.get("channelService");
};
const handler = Handler.prototype;
/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 */
handler.send = function (msg, session, next) {
    let self = this;
    let rid = session.get("rid");
    let client_uuid = msg.uuid;
    let msg_target = msg.target;
    if (!rid) {
        const errMsg = "rid is invalid please check.";
        return next(null, { code: Code_1.default.FAIL, message: errMsg, body: msg });
    }
    let timeout_id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "send message timeout..." });
    }, config_1.Config.timeout);
    chatroomService.getRoom(rid).then((room) => {
        console.log("getRoom value: ", room);
        if (!room.members) {
            const errMsg = "Room no have a members.";
            next(null, { code: Code_1.default.FAIL, message: errMsg });
            clearTimeout(timeout_id);
            return;
        }
        else {
            delete msg.__route__;
            delete msg.uuid;
            delete msg.status;
            let _msg = __assign({}, msg);
            messageService.saveMessage(_msg).then(value => {
                // <!-- send callback to user who send chat msg.
                let params = {
                    uuid: client_uuid,
                    status: "sent",
                    resultMsg: value
                };
                next(null, { code: Code_1.default.OK, data: params });
                pushMessage(self.app, session, room, value, client_uuid, msg_target);
                clearTimeout(timeout_id);
            }).catch(err => {
                next(null, { code: Code_1.default.FAIL, message: "AddChatRecord fail please implement resend message feature." });
                clearTimeout(timeout_id);
            });
        }
    }).catch(err => {
        clearTimeout(timeout_id);
        next(null, { code: Code_1.default.FAIL, message: err.toString() });
    });
};
handler.chat = function (msg, session, next) {
    let self = this;
    let rid = session.get("rid");
    let client_uuid = msg.uuid;
    let msg_target = msg.target;
    if (!rid) {
        const errMsg = "rid is invalid please check.";
        return next(null, { code: Code_1.default.FAIL, message: errMsg, body: msg });
    }
    let timeout_id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "send message timeout..." });
    }, config_1.Config.timeout);
    delete msg.__route__;
    delete msg.uuid;
    delete msg.status;
    let _msg = __assign({}, msg);
    messageService.chat(_msg, rid).then(value => {
        // <!-- send callback to user who send chat msg.
        let params = {
            uuid: client_uuid,
            status: "sent",
            resultMsg: value
        };
        clearTimeout(timeout_id);
        next(null, { code: Code_1.default.OK, data: params });
        chatroomService.getRoom(rid).then(room => {
            pushMessage(self.app, session, room, value, client_uuid, msg_target);
        }).catch(err => {
            next(null, { code: Code_1.default.FAIL, message: err.message });
        });
    }).catch(err => {
        clearTimeout(timeout_id);
        next(null, { code: Code_1.default.FAIL, message: err.message });
    });
};
function pushMessage(app, session, room, message, clientUUID, target) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
    // @ Try to push message to other ...
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
        // <!-- push chat data to other members in room.
        message.uuid = clientUUID;
        let onChat = {
            route: Code_1.default.sharedEvents.onChat,
            data: message
        };
        // the target is all users
        if (target === "*") {
            // <!-- Push new message to online users.
            let uidsGroup = new Array();
            async.each(onlineMembers, function iterator(val, cb) {
                let group = {
                    uid: val.uid,
                    sid: val.serverId
                };
                uidsGroup.push(group);
                cb();
            }, function done() {
                channelService.pushMessageByUids(onChat.route, onChat.data, uidsGroup);
                // <!-- Push message to off line users via parse.
                if (!!offlineMembers && offlineMembers.length > 0) {
                    // callPushNotification(self.app, session, thisRoom, resultMsg.sender, offlineMembers);
                    simplePushNotification(app, session, offlineMembers, room, message.sender);
                }
            });
        }
        else if (target === "bot") {
            // <!-- Push new message to online users.
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
            });
        }
        else {
        }
    });
}
handler.getSyncDateTime = function (msg, session, next) {
    let date = new Date();
    let param = {
        code: Code_1.default.OK,
        data: date
    };
    next(null, param);
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
        console.info("getOlderMessageChunk:", res.length);
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
    let rid = session.get("rid");
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
    let messageId = msg.messageId;
    if (!messageId) {
        let err = "messageId connot be null or empty.";
        console.warn(err);
        next(null, { code: Code_1.default.FAIL, message: err });
    }
    chatRoomManager.GetChatContent(messageId, function (err, result) {
        console.log("GetChatContent: ", result);
        if (result !== null) {
            let content = JSON.parse(JSON.stringify(result));
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
handler.updateWhoReadMessages = function (msg, session, next) {
    let messages = JSON.parse(msg.messageIds);
    let rid = msg.roomId;
    let uid = session.uid;
    if (!messages || !uid || !rid) {
        let errMsg = "messageId or uid or rid data field is invalid.";
        console.error(errMsg);
        next(null, { code: Code_1.default.FAIL, message: errMsg });
        return;
    }
    let channel = channelService.getChannel(rid, false);
    if (!channel) {
        let errMsg = "no have room for your request.";
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
            // <!-- update whether this session read this message_id.
            getWhoReadMessages(messages, channel);
        });
    }
    next(null, { code: Code_1.default.OK });
};
// <!-- Push who read message to sender.
function getWhoReadMessages(messages, channel) {
    async.eachSeries(messages, function iterator(item, cb) {
        chatRoomManager.getWhoReadMessage(item, function (err, res) {
            if (!err) {
                let onMessageRead = {
                    route: Code_1.default.sharedEvents.onMessageRead,
                    data: res
                };
                let senderInfo = channel.getMember(res.sender);
                if (!senderInfo) {
                    return;
                }
                else {
                    let uidsGroup = new Array();
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
            result(null, item);
        }, function done(err, results) {
            targetMemberWhoSubscribeRoom = results.slice();
            let promise = new Promise(function (resolve, reject) {
                // <!-- Query all deviceTokens for each members.
                userService.getDeviceTokens(targetMemberWhoSubscribeRoom)
                    .then(res => {
                    // DeviceToken null [ { deviceTokens: [ 'eb5f4051aea5b991e1f2a0c82f5b25afdc848eaa7e9bc76e194a475dffd95f32' ] } ]
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
                }).catch(err => {
                    reject(err);
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
