"use strict";
const CompanyController = require("../../../controller/CompanyManager");
const Mcontroller = require("../../../controller/ChatRoomManager");
const Code_1 = require("../../../../shared/Code");
const User = require("../../../model/User");
const userDAL = require("../../../dal/userDataAccess");
const tokenService_1 = require("../../../services/tokenService");
const UserManager_1 = require("../../../controller/UserManager");
const mongodb = require("mongodb");
const request = require("request");
const Joi = require("joi");
Joi.objectId = require('joi-objectid')(Joi);
const config_1 = require("../../../../config/config");
const ObjectID = mongodb.ObjectID;
const tokenService = new tokenService_1.default();
const companyManager = CompanyController.CompanyManager.getInstance();
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
var channelService;
module.exports = function (app) {
    console.info("instanctiate connector handler.");
    return new Handler(app);
};
const Handler = function (app) {
    this.app = app;
    channelService = app.get('channelService');
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
        token: Joi.string().allow(null),
        user: Joi.object().optional()
    };
    const result = Joi.validate(msg._object, schema);
    if (result.error) {
        return next(null, { code: Code_1.default.FAIL, message: result.error });
    }
    if (msg.token) {
        let token = msg.token;
        let options = {
            url: config_1.Config.api.authen,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: token
            })
        };
        let callback = (error, response, body) => {
            if (error) {
                next(error, null);
            }
            else if (!error && response.statusCode == 200) {
                let data = JSON.parse(body);
                let decoded = data.decoded;
                console.log("AuthenBody", decoded);
                session.__sessionService__.kick(decoded._id, "New login...");
                self.app.rpc.auth.authRemote.getOnlineUser(session, decoded._id, function (err, user) {
                    // 	//@ Signing success.
                    session.bind(decoded._id);
                    session.on('closed', onUserLeave.bind(null, self.app));
                    let param = {
                        route: Code_1.default.sharedEvents.onUserLogin,
                        data: { _id: decoded._id }
                    };
                    channelService.broadcast("connector", param.route, param.data);
                    addOnlineUser(self.app, session, decoded);
                    next(null, { code: Code_1.default.OK, data: body });
                    if (!user) {
                    }
                    else {
                        console.warn("Duplicate user by onlineUsers collections.");
                    }
                });
            }
        };
        request.post(options, callback);
    }
    else if (msg.user) {
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
                    session.on('closed', onUserLeave.bind(null, self.app));
                    let param = {
                        route: Code_1.default.sharedEvents.onUserLogin,
                        data: { _id: msg.user._id }
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
    }
};
handler.logout = function (msg, session, next) {
    console.log("logout", msg);
    let username = msg.username;
    let registrationId = msg.registrationId;
    let self = this;
    if (!!session.uid && !!registrationId) {
        userDAL.prototype.removeRegistrationId(session.uid, registrationId);
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
    //!-- log user out.
    app.rpc.auth.authRemote.removeOnlineUser(session, session.uid, null);
    if (next !== null)
        next();
};
handler.kickMe = function (msg, session, next) {
    session.__sessionService__.kick(msg.uid, "kick by logout all session", null);
    //!-- log user out.
    this.app.rpc.auth.authRemote.removeOnlineUser(session, msg.uid, null);
    userDAL.prototype.removeAllRegistrationId(msg.uid);
    next(null, { message: "kicked! " + msg.uid });
};
/**
* require user, password, and token.
* reture user data obj.
* This Function Call Onec When login Success.
*/
handler.getMe = function (msg, session, next) {
    let self = this;
    let token = msg.token;
    if (!token) {
        let errMsg = 'invalid entry request: empty token';
        next(new Error(errMsg), { code: Code_1.default.FAIL, message: errMsg });
        return;
    }
    let timeOut = setTimeout(function () {
        next(null, { code: Code_1.default.FAIL, message: "getMe timeout..." });
    }, config_1.Config.timeout);
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        console.log("token verify", err, res);
        if (err) {
            next(err, res);
            clearTimeout(timeOut);
        }
        else {
            let user = res.decoded;
            self.app.rpc.auth.authRemote.me(session, user, function (result) {
                next(null, result);
                clearTimeout(timeOut);
            });
        }
    });
};
function addOnlineUser(app, session, tokenDecoded) {
    console.log("addOnlineUser", tokenDecoded);
    let onlineUser = new User.OnlineUser();
    let userTransaction = new User.UserTransaction();
    if (!tokenDecoded.username) {
        app.rpc.auth.authRemote.myProfile(session, tokenDecoded._id, function (result) {
            console.log("joining onlineUser", JSON.stringify(result));
            if (result.code == Code_1.default.OK) {
                let datas = JSON.parse(JSON.stringify(result.result));
                let my = datas[0];
                onlineUser.uid = my._id;
                onlineUser.username = my.firstname;
                onlineUser.serverId = session.frontendId;
                onlineUser.registrationIds = my.deviceTokens || [];
                userTransaction.uid = my._id;
                userTransaction.username = my.firstname;
            }
            else {
                onlineUser.uid = tokenDecoded._id;
                onlineUser.username = tokenDecoded.email;
                onlineUser.serverId = session.frontendId;
                onlineUser.registrationIds = tokenDecoded.deviceTokens || [];
                userTransaction.uid = tokenDecoded._id;
                userTransaction.username = tokenDecoded.email;
            }
            //!-- check uid in onlineUsers list.
            //var usersDict = userManager.onlineUsers;
            //for (var i in usersDict) {
            //    console.log("userinfo who is online: %s * %s : serverId: %s", usersDict[i].username, usersDict[i].uid, usersDict[i].serverId);
            //}
            console.log("add to onlineUsers list %s : ", JSON.stringify(onlineUser));
            app.rpc.auth.authRemote.addOnlineUser(session, onlineUser, null);
            app.rpc.auth.authRemote.addUserTransaction(session, userTransaction, null);
        });
    }
    else {
        onlineUser.uid = tokenDecoded._id;
        onlineUser.username = tokenDecoded.username;
        onlineUser.serverId = session.frontendId;
        onlineUser.registrationIds = tokenDecoded.deviceTokens || [];
        userTransaction.uid = tokenDecoded._id;
        userTransaction.username = tokenDecoded.email;
        console.log("add to onlineUsers list %s : ", JSON.stringify(onlineUser));
        app.rpc.auth.authRemote.addOnlineUser(session, onlineUser, null);
        app.rpc.auth.authRemote.addUserTransaction(session, userTransaction, null);
    }
}
/**
* getLastAccessRooms.
* Require uid.
* Return : null.
*/
handler.getLastAccessRooms = function (msg, session, next) {
    let self = this;
    let uid = session.uid;
    if (!uid) {
        let errMsg = "Require userId is empty or null.";
        next(null, { code: Code_1.default.FAIL, message: errMsg });
        console.warn(errMsg);
        return;
    }
    self.app.rpc.auth.authRemote.getOnlineUser(session, uid, (err, user) => {
        if (err || user === null) {
            next(null, { code: Code_1.default.FAIL, message: err });
        }
        else {
            next(null, { code: Code_1.default.OK });
            UserManager_1.UserManager.getInstance().getRoomAccessForUser(uid, function (err, res) {
                if (err || res.length > 0) {
                    let onAccessRooms = {
                        route: Code_1.default.sharedEvents.onAccessRooms,
                        data: res
                    };
                    if (user) {
                        let uidsGroup = new Array();
                        let group = {
                            uid: user.uid,
                            sid: user.serverId
                        };
                        uidsGroup.push(group);
                        channelService.pushMessageByUids(onAccessRooms.route, onAccessRooms.data, uidsGroup);
                    }
                }
            });
        }
    });
};
handler.getCompanyInfo = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    let timeout = setTimeout(() => {
        next(null, { code: Code_1.default.FAIL, message: "getCompanyInfo timeout..." });
    }, config_1.Config.timeout);
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.log(err);
            next(err, res);
            clearTimeout(timeout);
        }
        else {
            companyManager.GetCompany(function (result) {
                let response = null;
                if (result !== null) {
                    var obj = JSON.parse(JSON.stringify(result));
                    response = { code: Code_1.default.OK, data: obj };
                }
                else {
                    response = { code: Code_1.default.FAIL, message: "Have no a company infomation." };
                }
                clearTimeout(timeout);
                next(null, response);
                let onGetCompanyInfo = {
                    route: Code_1.default.sharedEvents.onGetCompanyInfo,
                    data: response
                };
                let uidsGroup = [];
                let group = {
                    uid: session.uid,
                    sid: self.app.get('serverId')
                };
                uidsGroup.push(group);
                channelService.pushMessageByUids(onGetCompanyInfo.route, onGetCompanyInfo.data, uidsGroup);
            });
        }
    });
};
handler.getCompanyMember = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.log(err);
            next(err, { code: Code_1.default.FAIL, message: err });
            return;
        }
        else {
            companyManager.GetCompanyMembers({ _id: 1, displayname: 1, status: 1, image: 1 }, function (err, res) {
                var result;
                if (res !== null) {
                    console.log("GetCompanyMembers: ", res.length);
                    result = JSON.parse(JSON.stringify(res));
                }
                else {
                    console.error("Fail to getCompanyMembers: ", err);
                    result = null;
                }
                var params = {
                    route: Code_1.default.sharedEvents.onGetCompanyMembers,
                    data: result
                };
                var target = new Array();
                target.push({ uid: session.uid, sid: self.app.get('serverId') });
                channelService.pushMessageByUids(params.route, params.data, target);
            });
        }
        next(null, { code: Code_1.default.OK });
    });
};
handler.getCompanyChatRoom = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    var uid = session.uid;
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.log(err);
            next(err, { code: Code_1.default.FAIL, message: err });
            return;
        }
        else {
            companyManager.getMyOrganizeChatRooms(uid, function (err, res) {
                var result;
                if (res !== null) {
                    console.log("GetCompanyChatRooms: ", res.length);
                    result = JSON.parse(JSON.stringify(res));
                    updateRoomsMap(self.app, session, result);
                }
                else {
                    console.log("Fail to getCompanyChatRooms");
                    result = null;
                }
                var params = {
                    route: Code_1.default.sharedEvents.onGetOrganizeGroups,
                    data: result
                };
                var target = new Array();
                target.push({ uid: session.uid, sid: self.app.get('serverId') });
                channelService.pushMessageByUids(params.route, params.data, target);
            });
        }
        next(null, { code: Code_1.default.OK });
    });
};
handler.getProjectBaseGroups = function (msg, session, next) {
    var self = this;
    var token = msg.token;
    var uid = session.uid;
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.log(err);
            next(err, { code: Code_1.default.FAIL, message: err });
            return;
        }
        else {
            chatRoomManager.getProjectBaseGroups(uid, function (err, res) {
                var result;
                if (err || res === null) {
                    console.error("Fail to getProjectBaseGroups : ", err);
                    result = null;
                }
                else {
                    console.info("getProjectBaseGroups : ", res.length);
                    result = JSON.parse(JSON.stringify(res));
                    updateRoomsMap(self.app, session, result);
                }
                var params = {
                    route: Code_1.default.sharedEvents.onGetProjectBaseGroups,
                    data: result
                };
                var target = new Array();
                target.push({ uid: session.uid, sid: self.app.get('serverId') });
                channelService.pushMessageByUids(params.route, params.data, target);
            });
        }
        next(null, { code: Code_1.default.OK });
    });
};
/***
 * request user_id for query your member authority groups.
 */
handler.getMyPrivateGroupChat = function (msg, session, next) {
    let self = this;
    let token = msg.token;
    let uid = session.uid;
    if (!uid) {
        console.warn("uid cannot empty or null.!");
        next(null, { code: Code_1.default.FAIL, message: "session uid is missing.." });
        return;
    }
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.log(err);
            next(err, { code: Code_1.default.FAIL, message: err });
            return;
        }
        else {
            chatRoomManager.getPrivateGroupChat(uid, function (err, res) {
                let result;
                if (err) {
                    console.error("Fail to getMyPrivateGroupChat: ", err);
                    result = null;
                }
                else {
                    console.info("getMyPrivateGroupChat: ", res.length);
                    result = JSON.parse(JSON.stringify(res));
                }
                var params = {
                    route: Code_1.default.sharedEvents.onGetPrivateGroups,
                    data: result
                };
                var target = new Array();
                target.push({ uid: session.uid, sid: self.app.get('serverId') });
                channelService.pushMessageByUids(params.route, params.data, target);
            });
        }
        next(null, { code: Code_1.default.OK });
    });
};
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
    chatRoomManager.GetChatRoomInfo(rid).then(function (result) {
        self.app.rpc.auth.authRemote.updateRoomMembers(session, result, () => {
            self.app.rpc.auth.authRemote.checkedCanAccessRoom(session, rid, uid, function (err, res) {
                console.log("checkedCanAccessRoom: ", res);
                if (err || res === false) {
                    clearTimeout(timeOut_id);
                    next(null, { code: Code_1.default.FAIL, message: "cannot access your request room. may be you are not a member or leaved room!" });
                }
                else {
                    session.set('rid', rid);
                    session.push('rid', function (err) {
                        if (err) {
                            console.error('set rid for session service failed! error is : %j', err.stack);
                        }
                    });
                    let onlineUser = new User.OnlineUser();
                    onlineUser.username = uname;
                    onlineUser.uid = uid;
                    addChatUser(self.app, session, onlineUser, self.app.get('serverId'), rid, function () {
                        clearTimeout(timeOut_id);
                        next(null, { code: Code_1.default.OK, data: result });
                    });
                }
            });
        });
    }).catch(err => {
        next(null, { code: Code_1.default.FAIL, message: err });
    });
};
const addChatUser = function (app, session, user, sid, rid, next) {
    //put user into channel
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
    let sid = self.app.get('serverId');
    let schema = {
        token: Joi.string().required(),
        rid: Joi.string().required()
    };
    const result = Joi.validate(msg._object, schema);
    if (result.error) {
        return next(null, { code: Code_1.default.FAIL, message: result.error });
    }
    tokenService.ensureAuthorized(token, (err, result) => {
        if (err) {
            return next(null, { code: Code_1.default.FAIL, message: err });
        }
        // {
        // 	success: true,
        // 		decoded: 
        // 	{
        // 		_id: '5854e010c28e49f12d05a398',
        // 			user_id: '123456',
        // 				username: 'mzget',
        // 					role: 'admin',
        // 						iat: 1482987323
        // 	}
        // }
        let onlineUser = new User.OnlineUser();
        onlineUser.username = result.decoded.username;
        onlineUser.uid = uid;
        onlineUser.serverId = sid;
        self.app.rpc.chat.chatRemote.kick(session, onlineUser, sid, rid, function (err, res) {
            session.set('rid', null);
            session.push('rid', function (err) {
                if (err) {
                    console.error('set rid for session service failed! error is : %j', err.stack);
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
    let onlineUser = new User.OnlineUser();
    onlineUser.username = "";
    onlineUser.uid = session.uid;
    app.rpc.chat.chatRemote.kick(session, onlineUser, app.get('serverId'), session.get('rid'), null);
    logOut(app, session, null);
};
/**
* Requesting video call to target user.
* @param {object} msg.targetId, myRtcId, token.
*/
handler.videoCallRequest = function (msg, session, next) {
    var targetId = msg.targetId;
    var uid = session.uid;
    var myRtcId = msg.myRtcId;
    var token = msg.token;
    var self = this;
    if (!targetId || !uid || !myRtcId) {
        next(null, { code: Code_1.default.FAIL, message: "some parametor has a problem." });
        return;
    }
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.warn(err);
            next(err, res);
        }
        else {
            var onVideoCall = {
                route: Code_1.default.sharedEvents.onVideoCall,
                data: {
                    from: uid,
                    peerId: myRtcId
                }
            };
            var uidsGroup = new Array();
            self.app.rpc.auth.authRemote.getOnlineUser(session, targetId, (err, user) => {
                if (!err) {
                    var group = {
                        uid: user.uid,
                        sid: user.serverId
                    };
                    uidsGroup.push(group);
                    channelService.pushMessageByUids(onVideoCall.route, onVideoCall.data, uidsGroup);
                    next(null, { code: Code_1.default.OK });
                }
                else {
                    var msg = "target userId is not a list of onlineUser Please use notification server instead.";
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
    var targetId = msg.targetId;
    var uid = session.uid;
    var myRtcId = msg.myRtcId;
    var token = msg.token;
    var self = this;
    if (!targetId || !uid || !myRtcId) {
        next(null, { code: Code_1.default.FAIL, message: "some parametor has a problem." });
        return;
    }
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
        if (err) {
            console.warn(err);
            next(err, res);
        }
        else {
            var onVoiceCall = {
                route: Code_1.default.sharedEvents.onVoiceCall,
                data: {
                    from: uid,
                    peerId: myRtcId
                }
            };
            var uidsGroup = new Array();
            self.app.rpc.auth.authRemote.getOnlineUser(session, targetId, (e, user) => {
                if (!user) {
                    var msg = "target userId is not a list of onlineUser Please use notification server instead.";
                    console.warn(msg);
                    next(null, { code: Code_1.default.FAIL, message: msg });
                }
                else {
                    var group = {
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
    var myId = msg.userId;
    var contactId = msg.contactId;
    var token = msg.token;
    var self = this;
    if (!myId || !contactId || !token) {
        next(null, { code: Code_1.default.FAIL, message: "some parametor has a problem." });
        return;
    }
    self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
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
        var message = "Some params is invalid.";
        next(null, { code: Code_1.default.FAIL, message: message });
        return;
    }
    let param = {
        route: Code_1.default.sharedEvents.onTheLineIsBusy,
        data: { from: userId }
    };
    this.app.rpc.auth.authRemote.getOnlineUser(session, contactId, (e, user) => {
        if (!user) {
            var msg = "The contactId is not online.";
            console.warn(msg);
        }
        else {
            var uidsGroup = new Array();
            var userInfo = {
                uid: user.uid,
                sid: user.serverId
            };
            uidsGroup.push(userInfo);
            channelService.pushMessageByUids(param.route, param.data, uidsGroup);
        }
    });
    next(null, { code: Code_1.default.OK });
};
/**
 * For update roomsPairMembers collection.
 * When new room has create from web base, or other server.
 */
const updateRoomsMap = function (app, session, roomsData) {
    let rooms = JSON.parse(JSON.stringify(roomsData));
    app.rpc.auth.authRemote.updateRoomsMapWhenNewRoomCreated(session, roomsData, null);
};
