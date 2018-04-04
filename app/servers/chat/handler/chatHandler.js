"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Code_1 = require("../../../../shared/Code");
const chatroomService = require("../../../services/chatroomService");
const messageService = require("../../../services/messageService");
const userService = require("../../../services/userService");
const async = require("async");
const Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);
const config_1 = require("../../../../config/config");
let channelService;
let accountService;
module.exports = function (app) {
    return new ChatHandler(app);
};
class ChatHandler {
    constructor(app) {
        this.app = app;
        channelService = this.app.get("channelService");
        accountService = this.app.get("accountService");
    }
    ;
    /**
     * Send messages to users
     *
     * @param {Object} msg message from client
     * @param {Object} session
     * @param  {Function} next next stemp callback
     */
    send(msg, session, next) {
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
                let _msg = Object.assign({}, msg);
                messageService.pushByUids(_msg, "").then(value => {
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
    }
    ;
    chat(msg, session, next) {
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
        let _msg = Object.assign({}, msg);
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
    }
    ;
    pushByUids(msg, session, next) {
        let self = this;
        let schema = {
            "x-api-key": Joi.string().optional(),
            "api-version": Joi.string().optional(),
            "data": Joi.any().required(),
            "__route__": Joi.any()
        };
        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code_1.default.FAIL, message: result.error });
        }
        let timeout_id = setTimeout(function () {
            next(null, { code: Code_1.default.RequestTimeout, message: "send message timeout..." });
        }, config_1.Config.timeout);
        delete msg.__route__;
        delete msg.data.uuid;
        delete msg.data.status;
        let client_uuid = msg.data.uuid;
        // let targets = msg.data.target as Array<string>;
        let apiVersion = msg["api-version"];
        let appKey = msg["x-api-key"];
        let _msg = msg.data;
        messageService.pushByUids(_msg, appKey).then(resultMsg => {
            // <!-- send callback to user who send chat msg.
            let params = {
                uuid: client_uuid,
                status: "sent",
                resultMsg: resultMsg
            };
            next(null, { code: Code_1.default.OK, data: params });
            let onChat = withApiVersion(parseFloat(apiVersion))(resultMsg);
            pushToTarget(self.app, session, onChat, client_uuid);
            clearTimeout(timeout_id);
        }).catch(err => {
            next(null, { code: Code_1.default.FAIL, message: "AddChatRecord fail please implement resend message feature.", errors: err.message });
            clearTimeout(timeout_id);
        });
    }
    ;
    getSyncDateTime(msg, session, next) {
        let date = new Date();
        let param = {
            code: Code_1.default.OK,
            data: date
        };
        next(null, param);
    }
    ;
}
function withApiVersion(apiVersion = 0.1) {
    return (message) => {
        if (apiVersion > 0.1) {
            let onChat = {
                route: Code_1.default.sharedEvents.ON_CHAT,
                data: message
            };
            return onChat;
        }
        else {
            let onChat = {
                route: Code_1.default.sharedEvents.onChat,
                data: message
            };
            return onChat;
        }
    };
}
function pushToTarget(app, session, message, clientUUID) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
    let targets = message.data.target;
    if (Array.isArray(targets)) {
        async.map(targets, (item, cb) => {
            accountService.getOnlineUser(item).then((user) => {
                onlineMembers.push(user);
                cb(undefined, item);
            }).catch(err => {
                offlineMembers.push(item);
                cb(undefined, item);
            });
        }, (err, results) => {
            // <!-- Push new message to online users.
            let uidsGroup = new Array();
            async.map(onlineMembers, function iterator(val, cb) {
                let group = {
                    uid: val.uid,
                    sid: val.serverId
                };
                uidsGroup.push(group);
                cb();
            }, function done() {
                channelService.pushMessageByUids(message.route, message.data, uidsGroup);
                // <!-- Push message to off line users via parse.
                if (!!offlineMembers && offlineMembers.length > 0) {
                    // callPushNotification(self.app, session, thisRoom, resultMsg.sender, offlineMembers);
                    console.log("Push to offline members not yet ready...");
                    // simplePushNotification(app, session, offlineMembers, room, message.sender);
                }
            });
        });
    }
    else if (targets == "*") {
        // <!-- Push new message to online users.
        let uidsGroup = new Array();
        accountService.OnlineUsers().then((users) => {
            if (users && users.length > 0) {
                onlineMembers = users.slice();
                async.each(onlineMembers, function iterator(val, cb) {
                    let group = {
                        uid: val.uid,
                        sid: val.serverId
                    };
                    uidsGroup.push(group);
                    cb();
                }, function done() {
                    channelService.pushMessageByUids(message.route, message.data, uidsGroup);
                    // <!-- Push message to off line users via parse.
                    if (!!offlineMembers && offlineMembers.length > 0) {
                        // callPushNotification(self.app, session, thisRoom, resultMsg.sender, offlineMembers);
                        // simplePushNotification(app, session, offlineMembers, room, message.sender);
                    }
                });
            }
        }).catch(console.warn);
    }
}
function pushMessage(app, session, room, message, clientUUID, target) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
    // @ Try to push message to other ...
    async.map(room.members, (item, resultCallback) => {
        accountService.getOnlineUser(item._id).then((user) => {
            onlineMembers.push(user);
            resultCallback(undefined, item);
        }).catch(err => {
            offlineMembers.push(item._id);
            resultCallback(undefined, item);
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
            // the target is specific user
        }
    });
}
/**
* Get older message for chat room.
*/
/*
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
    }, Config.timeout);

    chatRoomManager.getOlderMessageChunkOfRid(rid, topEdgeMessageTime, function (err, res) {
        console.info("getOlderMessageChunk:", res.length);

        if (!!res) {
            clearTimeout(_timeOut);
            next(null, { code: Code.OK, data: res });
        }
        else {
            clearTimeout(_timeOut);
            next(null, { code: Code.FAIL });
        }
    });
};
*/
/*
* Get last limit query messages of specific user and room then return messages info.
* Require:
{ userId, for get last messages of specific user. }
{ roomId, for query last messages in room }
* Return:
{ data: [ messageId, readers ] }
*/
/*
handler.getMessagesReaders = function (msg, session, next) {
    let uid = session.uid;
    let rid = session.get("rid");
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
            let onGetMessagesReaders = {
                route: Code.sharedEvents.onGetMessagesReaders,
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

    next(null, { code: Code.OK });
};
*/
/**
* get log message content by message_id.
* @param {message_id} msg message from client
* @param {Object} session
* @param  {Function} next next stemp callback that return records of message_id.
*/
/*
handler.getMessageContent = function (msg, session, next) {
    let messageId = msg.messageId;
    if (!messageId) {
        let err = "messageId connot be null or empty.";
        console.warn(err);
        next(null, { code: Code.FAIL, message: err });
    }

    chatRoomManager.GetChatContent(messageId, function (err, result) {
        console.log("GetChatContent: ", result);
        if (result !== null) {
            let content = JSON.parse(JSON.stringify(result));
            next(null, { code: Code.OK, data: content });
        } else {
            next(null, { code: Code.FAIL, message: "have no a content for this message_id." });
        }
    });
};
*/
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
            accountService.getUserTransaction(sender).then((userTrans) => {
                pushTitle = userTrans.username;
                resolve(pushTitle);
            }).catch(reject);
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
                                    cb(err, undefined);
                                }
                                else {
                                    targetDevices = results.slice();
                                    cb(undefined, undefined);
                                }
                            });
                        }
                        else {
                            cb(undefined, undefined);
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
                console.warn("offline user need for push-notification implementation.", targetMemberWhoSubscribeRoom);
            }).catch(function onRejected(err) {
                console.error("push to target deviceTokens fail.", err);
            });
        });
    }
}
