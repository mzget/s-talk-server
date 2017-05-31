"use strict";
const Code_1 = require("../../../../shared/Code");
const User = require("../../../model/User");
const userDataAccess_1 = require("../../../dal/userDataAccess");
const tokenService_1 = require("../../../services/tokenService");
const chatroomService = require("../../../services/chatroomService");
const Joi = require("joi");
const joiObj = require("joi-objectid");
Joi["objectId"] = joiObj(Joi);
const config_1 = require("../../../../config/config");
const tokenService = new tokenService_1.default();
let channelService;
module.exports = function (app) {
    console.info("instanctiate connector handler.");
    return new Handler(app);
};
const Handler = function (app) {
    this.app = app;
    channelService = app.get("channelService");
};
const handler = Handler.prototype;
/**
* Authentication require username password.
* For user Parse push notification. This require installationId of Parse uuid.
* Return back token bearer.
*/
handler.login = function (msg, session, next) {
    let self = this;
    let schema = {
        user: Joi.object().required(),
        "x-api-key": Joi.string().required()
    };
    const result = Joi.validate(msg._object, schema);
    if (result.error) {
        return next(null, { code: Code_1.default.FAIL, message: result.error });
    }
    let apiKey = msg["x-api-key"];
    if (apiKey != config_1.Config.apiKey) {
        return next(null, { code: Code_1.default.FAIL, message: "authorized key fail." });
    }
    if (!msg.user._id && !!msg.user.username) {
        return next(null, { code: Code_1.default.FAIL, message: "missing user info" });
    }
    tokenService.signToken(msg.user, (err, encode) => {
        if (err) {
            return next(null, { code: Code_1.default.FAIL, message: err });
        }
        else {
            session.__sessionService__.kick(msg.user._id, "New login...");
            self.app.rpc.auth.authRemote.getOnlineUser(session, msg.user._id, function (err, user) {
                // 	//@ Signing success.
                session.bind(msg.user._id);
                session.on("closed", onUserLeave.bind(null, self.app));
                let param = {
                    route: Code_1.default.sharedEvents.onUserLogin,
                    data: msg.user
                };
                channelService.broadcast("connector", param.route, param.data);
                addOnlineUser(self.app, session, msg.user);
                next(null, { code: Code_1.default.OK, data: { success: true, token: encode } });
                if (!user) {
                }
                else {
                    console.warn("Duplicate user by onlineUsers collections.");
                }
            });
        }
    });
};
handler.logout = function (msg, session, next) {
    console.log("logout", msg);
    let username = msg.username;
    let registrationId = msg.registrationId;
    let self = this;
    if (!!session.uid && !!registrationId) {
        userDataAccess_1.UserDataAccess.prototype.removeRegistrationId(session.uid, registrationId);
    }
    logOut(self.app, session, null);
    next();
};
const logOut = function (app, session, next) {
    app.rpc.auth.authRemote.getOnlineUser(session, session.uid, (err, user) => {
        if (!err && user !== null) {
            console.log("User logout.", user);
        }
    });
    // !-- log user out.
    app.rpc.auth.authRemote.removeOnlineUser(session, session.uid, null);
    if (next !== null)
        next();
};
handler.kickMe = function (msg, session, next) {
    session.__sessionService__.kick(msg.uid, "kick by logout all session", null);
    // !-- log user out.
    this.app.rpc.auth.authRemote.removeOnlineUser(session, msg.uid, null);
    userDataAccess_1.UserDataAccess.prototype.removeAllRegistrationId(msg.uid);
    next(null, { message: "kicked! " + msg.uid });
};
function addOnlineUser(app, session, user) {
    console.log("addOnlineUser", user);
    let onlineUser = new User.OnlineUser();
    let userTransaction = new User.UserTransaction();
    onlineUser.uid = user._id;
    onlineUser.username = user.username;
    onlineUser.serverId = session.frontendId;
    onlineUser.registrationIds = user.deviceTokens || [];
    userTransaction.uid = user._id;
    userTransaction.username = user.username;
    console.log("add to onlineUsers list %s : ", JSON.stringify(onlineUser));
    app.rpc.auth.authRemote.addOnlineUser(session, onlineUser, null);
    app.rpc.auth.authRemote.addUserTransaction(session, userTransaction, null);
}
/**
 * New client entry chat server.
 *
 * @param  {Object}   msg     request message
 * @param  {Object}   session current session object
 * @param  {Function} next    next stemp callback
 * @return {Void}
 */
handler.enterRoom = function (msg, session, next) {
    let self = this;
    let token = msg.token;
    let rid = msg.rid;
    let uname = msg.username;
    let uid = session.uid;
    if (!uid) {
        let errMsg = "session.uid is empty or null.!";
        next(null, { code: Code_1.default.FAIL, message: errMsg });
        return;
    }
    if (!rid || !msg.username) {
        next(null, { code: Code_1.default.FAIL, message: "rid or username is null." });
        return;
    }
    let timeOut_id = setTimeout(() => {
        next(null, { code: Code_1.default.RequestTimeout, message: "enterRoom timeout" });
        return;
    }, config_1.Config.timeout);
    chatroomService.getRoom(rid).then((room) => {
        console.log("getRoom", room);
        chatroomService.checkedCanAccessRoom(room, uid, function (err, res) {
            console.log("checkedCanAccessRoom: ", res);
            if (err || res === false) {
                clearTimeout(timeOut_id);
                next(null, {
                    code: Code_1.default.FAIL,
                    message: "cannot access your request room. may be you are not a member or leaved room!"
                });
            }
            else {
                session.set("rid", rid);
                session.push("rid", function (err) {
                    if (err) {
                        console.error("set rid for session service failed! error is : %j", err.stack);
                    }
                });
                let onlineUser = new User.OnlineUser();
                onlineUser.username = uname;
                onlineUser.uid = uid;
                addChatUser(self.app, session, onlineUser, self.app.get("serverId"), rid, function () {
                    clearTimeout(timeOut_id);
                    next(null, { code: Code_1.default.OK, data: room });
                });
            }
        });
    }).catch(err => {
        clearTimeout(timeOut_id);
        next(null, { code: Code_1.default.FAIL, message: JSON.stringify(err) });
    });
};
const addChatUser = function (app, session, user, sid, rid, next) {
    // put user into channel
    app.rpc.chat.chatRemote.add(session, user, sid, rid, true, next);
};
/**
 * leaveRoom.
 * For leave chat room.
 * Require: roomId, username.
 * Return: lastRoomAccess of roomId.
 */
handler.leaveRoom = function (msg, session, next) {
    let self = this;
    let token = msg.token;
    let rid = msg.rid;
    let uid = session.uid;
    let sid = self.app.get("serverId");
    let schema = {
        token: Joi.string().required(),
        rid: Joi.string().required()
    };
    const result = Joi.validate(msg._object, schema);
    if (result.error) {
        return next(null, { code: Code_1.default.FAIL, message: result.error });
    }
    self.app.rpc.auth.authRemote.getUserTransaction(session, uid, (err, userTransaction) => {
        self.app.rpc.chat.chatRemote.kick(session, userTransaction, sid, rid, function (err, res) {
            session.set("rid", null);
            session.push("rid", function (err) {
                if (err) {
                    console.error("set rid for session service failed! error is : %j", err.stack);
                }
            });
            if (err) {
                next(null, { code: Code_1.default.FAIL, message: "leaveRoom with error." });
            }
            else {
                next(null, { code: Code_1.default.OK });
            }
        });
    });
};
/**
 * User log out handler
 * @param {Object} app current application
 * @param {Object} session current session object
 *
 */
const onUserLeave = function (app, session) {
    if (!session || !session.uid) {
        return;
    }
    app.rpc.auth.authRemote.getUserTransaction(session, session.uid, (err, userTransaction) => {
        app.rpc.chat.chatRemote.kick(session, userTransaction, app.get("serverId"), session.get("rid"), null);
        logOut(app, session, null);
    });
};
/**
* Requesting video call to target user.
* @param {object} msg.targetId, myRtcId, token.
*/
handler.videoCallRequest = function (msg, session, next) {
    let targetId = msg.targetId;
    let uid = session.uid;
    let myRtcId = msg.myRtcId;
    let token = msg.token;
    let self = this;
    if (!targetId || !uid || !myRtcId) {
        next(null, { code: Code_1.default.FAIL, message: "some parametor has a problem." });
        return;
    }
    tokenService.ensureAuthorized(token, function (err, res) {
        if (err) {
            console.warn(err);
            next(err, res);
        }
        else {
            let onVideoCall = {
                route: Code_1.default.sharedEvents.onVideoCall,
                data: {
                    from: uid,
                    peerId: myRtcId
                }
            };
            let uidsGroup = new Array();
            self.app.rpc.auth.authRemote.getOnlineUser(session, targetId, (err, user) => {
                if (!err) {
                    let group = {
                        uid: user.uid,
                        sid: user.serverId
                    };
                    uidsGroup.push(group);
                    channelService.pushMessageByUids(onVideoCall.route, onVideoCall.data, uidsGroup);
                    next(null, { code: Code_1.default.OK });
                }
                else {
                    let msg = "target userId is not a list of onlineUser Please use notification server instead.";
                    console.warn(msg);
                    next(null, { code: Code_1.default.FAIL, message: msg });
                }
            });
        }
    });
};
/**
* Requesting for voice call to target user.
* @param {object} msg.targetId, myRtcId, token.
*/
handler.voiceCallRequest = function (msg, session, next) {
    let targetId = msg.targetId;
    let uid = session.uid;
    let myRtcId = msg.myRtcId;
    let token = msg.token;
    let self = this;
    if (!targetId || !uid || !myRtcId) {
        next(null, { code: Code_1.default.FAIL, message: "some parametor has a problem." });
        return;
    }
    tokenService.ensureAuthorized(token, function (err, res) {
        if (err) {
            console.warn(err);
            next(err, res);
        }
        else {
            let onVoiceCall = {
                route: Code_1.default.sharedEvents.onVoiceCall,
                data: {
                    from: uid,
                    peerId: myRtcId
                }
            };
            let uidsGroup = new Array();
            self.app.rpc.auth.authRemote.getOnlineUser(session, targetId, (e, user) => {
                if (!user) {
                    let msg = "target userId is not a list of onlineUser Please use notification server instead.";
                    console.warn(msg);
                    next(null, { code: Code_1.default.FAIL, message: msg });
                }
                else {
                    let group = {
                        uid: user.uid,
                        sid: user.serverId
                    };
                    uidsGroup.push(group);
                    channelService.pushMessageByUids(onVoiceCall.route, onVoiceCall.data, uidsGroup);
                    next(null, { code: Code_1.default.OK });
                }
            });
        }
    });
};
/**
* Call this function when want to send hangupCall signaling to other.
*/
handler.hangupCall = function (msg, session, next) {
    let myId = msg.userId;
    let contactId = msg.contactId;
    let token = msg.token;
    let self = this;
    if (!myId || !contactId || !token) {
        next(null, { code: Code_1.default.FAIL, message: "some parametor has a problem." });
        return;
    }
    tokenService.ensureAuthorized(token, function (err, res) {
        if (err) {
            console.warn(err);
            next(err, res);
        }
        else {
            let onHangupCall = {
                route: Code_1.default.sharedEvents.onHangupCall,
                data: {
                    from: myId,
                    contactId: contactId
                }
            };
            let uidsGroup = new Array();
            self.app.rpc.auth.authRemote.getOnlineUser(session, contactId, (e, user) => {
                if (!user) {
                    let msg = "target userId is not a list of onlineUser Please use notification server instead.";
                    console.warn(msg);
                    next(null, { code: Code_1.default.FAIL, message: msg });
                }
                else {
                    let group = {
                        uid: user.uid,
                        sid: user.serverId
                    };
                    uidsGroup.push(group);
                    channelService.pushMessageByUids(onHangupCall.route, onHangupCall.data, uidsGroup);
                    next(null, { code: Code_1.default.OK });
                }
            });
        }
    });
};
/**
* Call theLineIsBusy function when WebRTC call status is not idle.
* This function tell caller to end call.
*/
handler.theLineIsBusy = function (msg, session, next) {
    let contactId = msg.contactId;
    let userId = session.uid;
    if (!contactId || !userId) {
        let message = "Some params is invalid.";
        next(null, { code: Code_1.default.FAIL, message: message });
        return;
    }
    let param = {
        route: Code_1.default.sharedEvents.onTheLineIsBusy,
        data: { from: userId }
    };
    this.app.rpc.auth.authRemote.getOnlineUser(session, contactId, (e, user) => {
        if (!user) {
            let msg = "The contactId is not online.";
            console.warn(msg);
        }
        else {
            let uidsGroup = new Array();
            let userInfo = {
                uid: user.uid,
                sid: user.serverId
            };
            uidsGroup.push(userInfo);
            channelService.pushMessageByUids(param.route, param.data, uidsGroup);
        }
    });
    next(null, { code: Code_1.default.OK });
};
