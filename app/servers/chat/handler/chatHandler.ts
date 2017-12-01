import User = require("../../../model/User");
import { Room, RoomStatus, RoomType } from "../../../model/Room";
import { Message } from "../../../model/Message";
import Code from "../../../../shared/Code";
import MPushService = require("../../../services/ParsePushService");
import * as chatroomService from "../../../services/chatroomService";
import * as messageService from "../../../services/messageService";
import * as userService from "../../../services/userService";

import mongodb = require("mongodb");
type ObjectID = mongodb.ObjectID;

import async = require("async");
import Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);

import * as ChatRoomManager from "../../../controller/ChatRoomManager";
const chatRoomManager = ChatRoomManager.ChatRoomManager.getInstance();

import { Config } from "../../../../config/config";
import { userInfo } from "os";
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
        return next(null, { code: Code.FAIL, message: errMsg, body: msg });
    }

    let timeout_id = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "send message timeout..." });
    }, Config.timeout);

    chatroomService.getRoom(rid).then((room: Room) => {
        console.log("getRoom value: ", room);

        if (!room.members) {
            const errMsg = "Room no have a members.";
            next(null, { code: Code.FAIL, message: errMsg });
            clearTimeout(timeout_id);
            return;
        }
        else {
            delete msg.__route__;
            delete msg.uuid;
            delete msg.status;

            let _msg = { ...msg } as Message;

            messageService.pushByUids(_msg, null).then(value => {
                // <!-- send callback to user who send chat msg.
                let params = {
                    uuid: client_uuid,
                    status: "sent",
                    resultMsg: value
                };
                next(null, { code: Code.OK, data: params });
                pushMessage(self.app, session, room, value, client_uuid, msg_target);
                clearTimeout(timeout_id);
            }).catch(err => {
                next(null, { code: Code.FAIL, message: "AddChatRecord fail please implement resend message feature." });
                clearTimeout(timeout_id);
            });
        }
    }).catch(err => {
        clearTimeout(timeout_id);
        next(null, { code: Code.FAIL, message: err.toString() });
    });
};

handler.chat = function (msg, session, next) {
    let self = this;
    let rid = session.get("rid");
    let client_uuid = msg.uuid;
    let msg_target = msg.target;


    if (!rid) {
        const errMsg = "rid is invalid please check.";
        return next(null, { code: Code.FAIL, message: errMsg, body: msg });
    }

    let timeout_id = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "send message timeout..." });
    }, Config.timeout);

    delete msg.__route__;
    delete msg.uuid;
    delete msg.status;

    let _msg = { ...msg } as Message;
    messageService.chat(_msg, rid).then(value => {
        // <!-- send callback to user who send chat msg.
        let params = {
            uuid: client_uuid,
            status: "sent",
            resultMsg: value
        };
        clearTimeout(timeout_id);
        next(null, { code: Code.OK, data: params });

        chatroomService.getRoom(rid).then(room => {
            pushMessage(self.app, session, room, value, client_uuid, msg_target);
        }).catch(err => {
            next(null, { code: Code.FAIL, message: err.message });
        });
    }).catch(err => {
        clearTimeout(timeout_id);
        next(null, { code: Code.FAIL, message: err.message });
    });
};

handler.pushByUids = function (msg, session, next) {
    let self = this;

    let schema = {
        "x-api-key": Joi.string().optional(),
        "data": Joi.any().required(),
        "__route__": Joi.any()
    };
    const result = Joi.validate(msg, schema);
    if (result.error) {
        return next(null, { code: Code.FAIL, message: result.error });
    }

    let timeout_id = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "send message timeout..." });
    }, Config.timeout);

    delete msg.__route__;
    delete msg.data.uuid;
    delete msg.data.status;

    let client_uuid = msg.data.uuid;
    // let targets = msg.data.target as Array<string>;
    let appKey = msg["x-api-key"];
    let _msg = msg.data as Message;

    messageService.pushByUids(_msg, appKey).then(resultMsg => {
        // <!-- send callback to user who send chat msg.
        let params = {
            uuid: client_uuid,
            status: "sent",
            resultMsg: resultMsg
        };
        next(null, { code: Code.OK, data: params });

        pushToTarget(self.app, session, resultMsg, client_uuid);
        clearTimeout(timeout_id);
    }).catch(err => {
        next(null, { code: Code.FAIL, message: "AddChatRecord fail please implement resend message feature." });
        clearTimeout(timeout_id);
    });
};

function pushToTarget(app, session, message: Message, clientUUID: string) {
    let onlineMembers = new Array<User.OnlineUser>();
    let offlineMembers = new Array<string>();
    let targets = message.target as Array<string> | string;

    let onChat = {
        route: Code.sharedEvents.onChat,
        data: message
    };

    if (Array.isArray(targets)) {
        async.map(targets, (item, cb) => {
            app.rpc.auth.authRemote.getOnlineUser(session, item, function (err2, user) {
                if (err2 || user === null) {
                    offlineMembers.push(item);
                }
                else {
                    onlineMembers.push(user);
                }

                cb(null, item);
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
                channelService.pushMessageByUids(onChat.route, onChat.data, uidsGroup);

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
        app.rpc.auth.authRemote.getOnlineUsers((err, users: User.IOnlineUser) => {
            if (!!users) {
                console.log(JSON.stringify(users));

                for (const userId in users) {
                    if (users.hasOwnProperty(userId)) {
                        const onlineUser = users[userId] as User.OnlineUser;

                        onlineMembers.push(onlineUser);
                    }
                }

                console.log(JSON.stringify(onlineMembers));

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
                        // simplePushNotification(app, session, offlineMembers, room, message.sender);
                    }
                });
            }
        });
    }
}

function pushMessage(app, session, room: Room, message: Message, clientUUID: string, target: string) {
    let onlineMembers = new Array<User.OnlineUser>();
    let offlineMembers = new Array<string>();

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
            route: Code.sharedEvents.onChat,
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

handler.getSyncDateTime = function (msg, session, next) {
    let date: Date = new Date();
    let param = {
        code: Code.OK,
        data: date
    };

    next(null, param);
};

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

function simplePushNotification(app: any, session: any, offlineMembers: Array<string>, room: Room, sender: string): void {
    let pushTitle = room.name;
    let alertMessage = "";
    let targetMemberWhoSubscribeRoom = new Array<string>();
    let targetDevices = new Array<string>();
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
        async.map(offlineMembers, function iterator(item, result: (err, obj: string) => void) {
            result(null, item);
        }, function done(err, results) {
            targetMemberWhoSubscribeRoom = results.slice();

            let promise = new Promise(function (resolve, reject) {
                // <!-- Query all deviceTokens for each members.
                userService.getDeviceTokens(targetMemberWhoSubscribeRoom)
                    .then(res => {
                        // DeviceToken null [ { deviceTokens: [ 'eb5f4051aea5b991e1f2a0c82f5b25afdc848eaa7e9bc76e194a475dffd95f32' ] } ]
                        let memberTokens = res as Array<any>; // array of deviceTokens for each member.
                        async.mapSeries(memberTokens, function iterator(item, cb) {
                            if (!!item.deviceTokens) {
                                let deviceTokens: Array<string> = item.deviceTokens;
                                async.mapSeries(deviceTokens, (token, resultCb: (err, obj: string) => void) => {
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