"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Code_1 = require("../../../../shared/Code");
const User = require("../../../model/User");
const tokenService_1 = require("../../../services/tokenService");
const chatroomService = require("../../../services/chatroomService");
const Joi = require("joi");
const joiObj = require("joi-objectid");
Joi["objectId"] = joiObj(Joi);
const R = require("ramda");
const ValidationSchema_1 = require("../../../utils/ValidationSchema");
const Const_1 = require("../../../Const");
const config_1 = require("../../../../config/config");
const ChannelHelper_1 = require("../../../util/ChannelHelper");
const tokenService = new tokenService_1.default();
let channelService;
module.exports = (app) => {
    console.info("instanctiate connector handler.");
    return new Handler(app);
};
class Handler {
    constructor(app) {
        this.app = app;
        channelService = app.get("channelService");
    }
    login(msg, session, next) {
        const self = this;
        const schema = ValidationSchema_1.default({
            user: Joi.object({
                _id: Joi.string().required(),
                username: Joi.string().required(),
                payload: Joi.any(),
            }).required(),
        });
        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code_1.default.FAIL, message: result.error });
        }
        const user = { _id: msg.user._id, username: msg.user.username };
        const apiKey = msg[Const_1.X_API_KEY];
        const appId = msg[Const_1.X_APP_ID];
        const appVersion = msg[Const_1.X_API_VERSION];
        if (R.contains(apiKey, config_1.Config.apiKeys) === false) {
            return next(null, { code: Code_1.default.FAIL, message: "authorized key fail." });
        }
        console.log("Login", user);
        tokenService.signToken(user, (err, encode) => {
            if (err) {
                return next(null, { code: Code_1.default.FAIL, message: err });
            }
            else {
                session.__sessionService__.kick(user._id, "New login...");
                // @ Signing success.
                session.bind(user._id);
                session.set(Const_1.X_APP_ID, appId);
                session.set(Const_1.X_API_KEY, apiKey);
                session.pushAll(() => { console.log("Push..."); });
                session.on("closed", onUserLeave.bind(null, self.app));
                // channelService.broadcast("connector", param.route, param.data);
                addOnlineUser(self.app, session, msg.user);
                next(null, { code: Code_1.default.OK, data: { success: true, token: encode } });
            }
        });
    }
    logout(msg, session, next) {
        logOut(this.app, session, null);
        next();
    }
    kickMe(msg, session, next) {
        session.__sessionService__.kick(msg.uid, "kick by logout all session", null);
        // !-- log user out.
        this.app.rpc.auth.authRemote.removeOnlineUser(session, msg.uid, null);
        next(null, { message: "kicked! " + msg.uid });
    }
    updateUser(msg, session, next) {
        const self = this;
        const schema = ValidationSchema_1.default({
            user: Joi.object({
                _id: Joi.string().required(),
                username: Joi.string().required(),
                payload: Joi.any(),
            }).required(),
        });
        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code_1.default.FAIL, message: result.error });
        }
        const apiKey = msg[Const_1.X_API_KEY];
        const appId = msg[Const_1.X_APP_ID];
        const appVersion = msg[Const_1.X_API_VERSION];
        if (R.contains(apiKey, config_1.Config.apiKeys) === false) {
            return next(null, { code: Code_1.default.FAIL, message: "authorized key fail." });
        }
        const p = new Promise((resolve, rejected) => {
            self.app.rpc.auth.authRemote.getOnlineUser(session, session.uid, (err, userSession) => {
                if (err) {
                    rejected(err);
                }
                else {
                    resolve(userSession);
                }
            });
        });
        function updateUser(user) {
            const p2 = new Promise((resolve, reject) => {
                self.app.rpc.auth.authRemote.updateUser(session, user, (err, results) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve(results);
                    }
                });
            });
            return p2;
        }
        p.then((userSession) => {
            const user = mutateUserPayload(userSession, msg.user.payload);
            return updateUser(user);
        }).then((value) => {
            return next(null, { code: Code_1.default.OK, data: { success: true } });
        }).catch((err) => {
            return next(null, { code: Code_1.default.FAIL, message: err });
        });
    }
    /**
     * New client entry chat server.
     *
     * @param  {Object}   msg     request message
     * @param  {Object}   session current session object
     * @param  {Function} next    next stemp callback
     * @return {Void}
     */
    enterRoom(msg, session, next) {
        const self = this;
        const token = msg.token;
        const rid = msg.rid;
        const uname = msg.username;
        const uid = session.uid;
        if (!uid) {
            const errMsg = "session.uid is empty or null.!";
            next(null, { code: Code_1.default.FAIL, message: errMsg });
            return;
        }
        if (!rid || !msg.username) {
            next(null, { code: Code_1.default.FAIL, message: "rid or username is null." });
            return;
        }
        const timeOutId = setTimeout(() => {
            next(null, { code: Code_1.default.RequestTimeout, message: "enterRoom timeout" });
            return;
        }, config_1.Config.timeout);
        chatroomService.getRoom(rid).then((room) => {
            console.log("getRoom", room);
            chatroomService.checkedCanAccessRoom(room, uid, (err, res) => {
                console.log("checkedCanAccessRoom: ", res);
                if (err || res === false) {
                    clearTimeout(timeOutId);
                    next(null, {
                        code: Code_1.default.FAIL,
                        message: "cannot access your request room. may be you are not a member or leaved room!",
                    });
                }
                else {
                    session.set("rid", rid);
                    session.push("rid", (error) => {
                        if (error) {
                            console.error("set rid for session service failed! error is : %j", error.stack);
                        }
                    });
                    const onlineUser = new User.UserSession();
                    onlineUser.username = uname;
                    onlineUser.uid = uid;
                    addChatUser(self.app, session, onlineUser, self.app.get("serverId"), rid, () => {
                        clearTimeout(timeOutId);
                        next(null, { code: Code_1.default.OK, data: room });
                    });
                }
            });
        }).catch((err) => {
            clearTimeout(timeOutId);
            next(null, { code: Code_1.default.FAIL, message: JSON.stringify(err) });
        });
    }
    /**
     * leaveRoom.
     * For leave chat room.
     * Require: roomId, username.
     * Return: lastRoomAccess of roomId.
     */
    leaveRoom(msg, session, next) {
        const self = this;
        const token = msg.token;
        const rid = msg.rid;
        const uid = session.uid;
        const sid = self.app.get("serverId");
        const schema = {
            token: Joi.string().required(),
            rid: Joi.string().required(),
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
    }
    /**
    * Requesting video call to target user.
    * @param {object} msg.targetId, myRtcId, token.
    */
    videoCallRequest(msg, session, next) {
        const targetId = msg.targetId;
        const uid = session.uid;
        const myRtcId = msg.myRtcId;
        const token = msg.token;
        const self = this;
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
    }
    ;
    /**
    * Requesting for voice call to target user.
    * @param {object} msg.targetId, myRtcId, token.
    */
    voiceCallRequest(msg, session, next) {
        const targetId = msg.targetId;
        const uid = session.uid;
        const myRtcId = msg.myRtcId;
        const token = msg.token;
        const self = this;
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
                        const msg = "target userId is not a list of onlineUser Please use notification server instead.";
                        console.warn(msg);
                        next(null, { code: Code_1.default.FAIL, message: msg });
                    }
                    else {
                        const group = {
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
    }
    /**
    * Call this function when want to send hangupCall signaling to other.
    */
    hangupCall(msg, session, next) {
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
                        contactId
                    }
                };
                let uidsGroup = new Array();
                self.app.rpc.auth.authRemote.getOnlineUser(session, contactId, (e, user) => {
                    if (!user) {
                        const msg = "target userId is not a list of onlineUser Please use notification server instead.";
                        console.warn(msg);
                        next(null, { code: Code_1.default.FAIL, message: msg });
                    }
                    else {
                        const group = {
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
    }
    /**
    * Call theLineIsBusy function when WebRTC call status is not idle.
    * This function tell caller to end call.
    */
    theLineIsBusy(msg, session, next) {
        let contactId = msg.contactId;
        let userId = session.uid;
        if (!contactId || !userId) {
            const message = "Some params is invalid.";
            next(null, { code: Code_1.default.FAIL, message });
            return;
        }
        const param = {
            route: Code_1.default.sharedEvents.onTheLineIsBusy,
            data: { from: userId },
        };
        this.app.rpc.auth.authRemote.getOnlineUser(session, contactId, (e, user) => {
            if (!user) {
                const msg = "The contactId is not online.";
                console.warn(msg);
            }
            else {
                const uidsGroup = new Array();
                const userInfo = {
                    uid: user.uid,
                    sid: user.serverId,
                };
                uidsGroup.push(userInfo);
                channelService.pushMessageByUids(param.route, param.data, uidsGroup);
            }
        });
        next(null, { code: Code_1.default.OK });
    }
}
const handler = Handler.prototype;
const logOut = (app, session, next) => {
    app.rpc.auth.authRemote.getOnlineUser(session, session.uid, (err, user) => {
        if (!err && user !== null) {
            console.log("logged out Success", user);
            const param = {
                route: Code_1.default.sharedEvents.onUserLogout,
                data: user,
            };
            app.rpc.auth.authRemote.getOnlineUserByAppId(session, session.get(Const_1.X_APP_ID), (err2, userSessions) => {
                if (!err2) {
                    console.log("online by app-id", userSessions.length);
                    const uids = ChannelHelper_1.getUsersGroup(userSessions);
                    channelService.pushMessageByUids(param.route, param.data, uids);
                }
            });
        }
        // !-- log user out.
        // Don't care what result of callback.
        app.rpc.auth.authRemote.removeOnlineUser(session, session.uid, null);
    });
    if (next !== null) {
        next();
    }
};
function mutateUserPayload(userSession, payload) {
    userSession.payload = payload;
    return userSession;
}
function addOnlineUser(app, session, user) {
    let userSession = new User.UserSession();
    let userTransaction = new User.UserTransaction();
    userSession.uid = user._id;
    userSession.username = user.username;
    userSession.serverId = session.frontendId;
    userSession.applicationId = session.get(Const_1.X_APP_ID);
    userSession.payload = user.payload;
    userTransaction.uid = user._id;
    userTransaction.username = user.username;
    console.log("add to onlineUsers list : ", userSession.username);
    app.rpc.auth.authRemote.addOnlineUser(session, userSession, pushNewOnline);
    app.rpc.auth.authRemote.addUserTransaction(session, userTransaction, null);
    let param = {
        route: Code_1.default.sharedEvents.onUserLogin,
        data: userTransaction,
    };
    function pushNewOnline() {
        app.rpc.auth.authRemote.getOnlineUserByAppId(session, session.get(Const_1.X_APP_ID), (err, userSessions) => {
            if (!err) {
                console.log("online by app-id", userSessions.length);
                let uids = ChannelHelper_1.getUsersGroup(userSessions);
                channelService.pushMessageByUids(param.route, param.data, uids);
            }
        });
    }
}
const addChatUser = function (app, session, user, sid, rid, next) {
    // put user into channel
    app.rpc.chat.chatRemote.add(session, user, sid, rid, true, next);
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
