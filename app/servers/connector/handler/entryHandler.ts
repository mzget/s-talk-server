import CompanyController = require("../../../controller/CompanyManager");
import Mcontroller = require("../../../controller/ChatRoomManager");
import Code = require('../../../../shared/Code');
import User = require('../../../model/User');
import userDAL = require('../../../dal/userDataAccess');
import Room = require('../../../model/Room');
import TokenService from '../../../services/tokenService';
import generic = require('../../../util/collections');
import MUser = require('../../../controller/UserManager');
import async = require('async');
import mongodb = require('mongodb');

const webConfig = require('../../../../config/webConfig.json');
const ObjectID = mongodb.ObjectID;
const http = require('http');
const tokenService: TokenService = new TokenService();
const companyManager = CompanyController.CompanyManager.getInstance();
const chatRoomManager = Mcontroller.ChatRoomManager.getInstance();
const userManager = MUser.Controller.UserManager.getInstance();
var channelService;

module.exports = function (app) {
    console.info("instanctiate connector handler.");
	return new Handler(app);
};

const Handler = function (app) {
	this.app = app;
	this.webServer = webConfig.webserver;

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
    let registrationId: string = msg.registrationId;
	let email = msg.email.toLowerCase();
	let pass = msg.password;

	/*
	var url: string = this.webServer + "/?api/login";
	console.log("login", url);

	var data = {
		username: msg.username,
		password: msg.password
	};
	var querystring = require("querystring");
	var qs = querystring.stringify(data);
	var qslength = qs.length;
	var options = {
		hostname: this.webServer,
		port: 80,
		path: "/?r=site/login",
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': qslength
		}
	};
	
	var req = http.request(options, function (res) {
		res.on('data', function (data) {
			console.log('Response: ' + data);
			var json = JSON.parse(data);
			if (json.result === false) {
				next(null, { code: code.FAIL, message: "login fail from authen server." });
			}
			else {

			}
		});
		res.on('end', function () {
			console.log(res.statusCode);
		});
	});
	req.write(qs);
	req.end();
	*/

    let id = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "login timeout..." });
    }, webConfig.timeout);

	self.app.rpc.auth.authRemote.auth(session, email, pass, function (result) {
		if (result.code === Code.OK) {
			//@ Signing success.
			session.bind(result.uid);
			session.on('closed', onUserLeave.bind(null, self.app));

			if (!!registrationId) {
				userDAL.prototype.saveRegistrationId(result.uid, registrationId);
			}

			let param = {
				route: Code.sharedEvents.onUserLogin,
				data: { _id: result.uid }
			};

			channelService.broadcast("connector", param.route, param.data);

			addOnlineUser(self.app, session, result.uid);
		}
		else if (result.code === Code.DuplicatedLogin) {
			// session.__sessionService__.kick()
		}

		clearTimeout(id);
		next(null, result);
	});
}

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
}

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
}

handler.kickMe = function (msg, session, next) {
	session.__sessionService__.kick(msg.uid, "kick by logout all session", null);

	//!-- log user out.
	this.app.rpc.auth.authRemote.removeOnlineUser(session, session.uid, null);
	userDAL.prototype.removeAllRegistrationId(session.uid);

	next(null, null);
}

/**
* require user, password, and token.
* reture user data obj.
* This Function Call Onec When login Success.
*/
handler.getMe = function (msg, session, next) {
	let self = this;
	let token = msg.token;
	if (!token) {
		var errMsg = 'invalid entry request: empty token';
		next(new Error(errMsg), { code: Code.FAIL, message: errMsg });
		return;
	}

	var timeOut = setTimeout(function () {
		next(null, { code: Code.FAIL, message: "getMe timeout..." });
	}, webConfig.timeout);

	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.log(err);
			next(err, res);
			clearTimeout(timeOut);
		}
		else {
			self.app.rpc.auth.authRemote.me(session, msg, function (result) {
				next(null, result);

				clearTimeout(timeOut);

				let onGetMe = {
					route: Code.sharedEvents.onGetMe,
					data: result
				};
				let uidsGroup = [];
				let group = {
					uid: session.uid,
					sid: self.app.get('serverId')
				};
				uidsGroup.push(group);
				channelService.pushMessageByUids(onGetMe.route, onGetMe.data, uidsGroup);

				let data = JSON.parse(JSON.stringify(result.data));
				let onlineUser = new User.OnlineUser();
				onlineUser.uid = data._id;
				onlineUser.username = data.username;
				onlineUser.serverId = session.frontendId;
				onlineUser.registrationIds = data.deviceTokens;

				let userTransaction = new User.UserTransaction();
				userTransaction.uid = data._id;
				userTransaction.username = data.username;

				//!-- check uid in onlineUsers list.
				//var usersDict = userManager.onlineUsers;
				//for (var i in usersDict) {
				//    console.log("userinfo who is online: %s * %s : serverId: %s", usersDict[i].username, usersDict[i].uid, usersDict[i].serverId);
				//}
				console.log("New onlineUsers %s : ", onlineUser);

				self.app.rpc.auth.authRemote.addOnlineUser(session, onlineUser, null);
				self.app.rpc.auth.authRemote.addUserTransaction(session, userTransaction, null);
			});
		}
	});
}

function addOnlineUser(app, session, userId: string) {
	app.rpc.auth.authRemote.myProfile(session, userId, function (result) {
		console.log("joining onlineUser", JSON.stringify(result));

		let datas: Array<User.User> = JSON.parse(JSON.stringify(result.data));
		let my = datas[0];
		let onlineUser = new User.OnlineUser();
		onlineUser.uid = my._id;
		onlineUser.username = my.first_name;
		onlineUser.serverId = session.frontendId;
		onlineUser.registrationIds = my.devicesToken;

		let userTransaction = new User.UserTransaction();
		userTransaction.uid = my._id;
		userTransaction.username = my.first_name;

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

/**
* getLastAccessRooms.
* Require uid.
* Return : null.
*/
handler.getLastAccessRooms = function (msg, session, next) {
	var self = this;
	var uid = session.uid;
	if (!uid) {
		var errMsg = "Require userId is empty or null.";
		next(null, { code: Code.FAIL, message: errMsg });
		console.warn(errMsg);
		return;
	}

	async.series([function (cb1: (err, user: User.OnlineUser) => void) {
		self.app.rpc.auth.authRemote.getOnlineUser(session, uid, (err, user) => {
			if (err || user === null) {
				cb1(err, null);
			}
			else {
				cb1(null, user);
			}
		});
	}], (err, results) => {
		userManager.getRoomAccessForUser(uid, function (err, res) {
			var onAccessRooms = {
				route: Code.sharedEvents.onAccessRooms,
				data: res
			};
			var user: User.OnlineUser = results[0];
			if (user) {
				var uidsGroup = new Array();
				var group = {
					uid: user.uid,
					sid: user.serverId
				};
				uidsGroup.push(group);
				channelService.pushMessageByUids(onAccessRooms.route, onAccessRooms.data, uidsGroup);
			}
		});
	});

	next(null, { code: Code.OK });
}

handler.getCompanyInfo = function (msg, session, next) {
	var self = this;
	var token = msg.token;

	let timeout = setTimeout(() => {
		next(null, { code: Code.FAIL, message: "getCompanyInfo timeout..." });
	}, webConfig.timeout);

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
					response = { code: Code.OK, data: obj };
				}
				else {
					response = { code: Code.FAIL, message: "Have no a company infomation." };
				}

				clearTimeout(timeout);

				next(null, response);

				let onGetCompanyInfo = {
					route: Code.sharedEvents.onGetCompanyInfo,
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
}

handler.getCompanyMember = function (msg, session, next) {
	var self = this;
	var token = msg.token;
	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.log(err);
			next(err, { code: Code.FAIL, message: err });
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
					route: Code.sharedEvents.onGetCompanyMembers,
					data: result
				};

				var target = new Array();
				target.push({ uid: session.uid, sid: self.app.get('serverId') });

				channelService.pushMessageByUids(params.route, params.data, target);
			});
		}

		next(null, { code: Code.OK });
	});
}

handler.getCompanyChatRoom = function (msg, session, next) {
	var self = this;
	var token = msg.token;
	var uid = session.uid;
	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.log(err);
			next(err, { code: Code.FAIL, message: err });
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
					route: Code.sharedEvents.onGetOrganizeGroups,
					data: result
				};

				var target = new Array();
				target.push({ uid: session.uid, sid: self.app.get('serverId') });

				channelService.pushMessageByUids(params.route, params.data, target);
			});
		}

		next(null, { code: Code.OK });
	});
}

handler.getProjectBaseGroups = function (msg, session, next) {
	var self = this;
	var token = msg.token;
	var uid = session.uid;
	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.log(err);
			next(err, { code: Code.FAIL, message: err });
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
					route: Code.sharedEvents.onGetProjectBaseGroups,
					data: result
				};

				var target = new Array();
				target.push({ uid: session.uid, sid: self.app.get('serverId') });

				channelService.pushMessageByUids(params.route, params.data, target);
			});
		}

		next(null, { code: Code.OK });
	});
}

/***
 * request user_id for query your member authority groups.
 */
handler.getMyPrivateGroupChat = function (msg, session, next) {
	var self = this;
	var token = msg.token;
	var uid = session.uid;
	if (!uid) {
		console.warn("uid cannot empty or null.!");
		next(null, { code: Code.FAIL, message: "session uid is missing.." });
		return;
	}

	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.log(err);
			next(err, { code: Code.FAIL, message: err });
			return;
		}
		else {
			chatRoomManager.getPrivateGroupChat(uid, function (err, res) {
				var result;
				if (err) {
					console.error("Fail to getMyPrivateGroupChat: ", err);
					result = null;
				}
				else {
					console.info("getMyPrivateGroupChat: ", res.length);

					result = JSON.parse(JSON.stringify(res));
				}

				var params = {
					route: Code.sharedEvents.onGetPrivateGroups,
					data: result
				};

				var target = new Array();
				target.push({ uid: session.uid, sid: self.app.get('serverId') });

				channelService.pushMessageByUids(params.route, params.data, target);
			});
		}

		next(null, { code: Code.OK });
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
handler.enterRoom = function (msg, session, next) {
	let self = this;
	let token = msg.token;
	let rid = msg.rid;
	let uname = msg.username;
    let uid = session.uid;

	if (!uid) {
        let errMsg = "session.uid is empty or null.!";
		next(null, { code: Code.FAIL, message: errMsg });
		return;
	}

	if (!rid || !msg.username) {
        next(null, { code: Code.FAIL, message: "rid or username is null." });
		return;
	}

    let timeOut_id = setTimeout(() => {
        next(null, { code: Code.RequestTimeout, message: "enterRoom timeout" });
        return;
    }, webConfig.timeout);

    chatRoomManager.GetChatRoomInfo({ _id: new ObjectID(rid) }, null, function (result) {
        self.app.rpc.auth.authRemote.updateRoomMembers(session, result, null);

        self.app.rpc.auth.authRemote.checkedCanAccessRoom(session, rid, uid, function (err, res) {
            console.log("checkedCanAccessRoom: ", res);

            if (err || res === false) {
                clearTimeout(timeOut_id);
                next(null, { code: Code.FAIL, message: "cannot access your request room. may be you are not a member or leaved room!" });
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
                    next(null, { code: Code.OK, data: result });
                });
            }
        });
    });
};

const addChatUser = function (app, session, user: User.OnlineUser, sid, rid, next) {
    //put user into channel
    app.rpc.chat.chatRemote.add(session, user, sid, rid, true, next);
}

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

	if (!rid || !msg.username) {
        next(null, { code: Code.FAIL, message: "rid or username is null." });
		return;
    }

    var onlineUser = new User.OnlineUser();
    onlineUser.username = msg.username;
    onlineUser.uid = uid;
    onlineUser.serverId = sid;

    self.app.rpc.chat.chatRemote.kick(session, onlineUser, sid, rid, function (err, res) {
        if (err) {
            next(null, { code: Code.FAIL, message: "leaveRoom with error." });
        }
        else {
            next(null, { code: Code.OK });
        }
    });
}

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

	var onlineUser = new User.OnlineUser();
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
		next(null, { code: Code.FAIL, message: "some parametor has a problem." });
		return;
	}

	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.warn(err);
			next(err, res);
		}
		else {
			var onVideoCall = {
				route: Code.sharedEvents.onVideoCall,
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

					next(null, { code: Code.OK });
				}
				else {
					var msg = "target userId is not a list of onlineUser Please use notification server instead.";
					console.warn(msg);
					next(null, { code: Code.FAIL, message: msg });
				}
			});
		}
	});
}

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
		next(null, { code: Code.FAIL, message: "some parametor has a problem." });
		return;
	}

	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.warn(err);
			next(err, res);
		}
		else {
			var onVoiceCall = {
				route: Code.sharedEvents.onVoiceCall,
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
					next(null, { code: Code.FAIL, message: msg });
				}
				else {
					var group = {
						uid: user.uid,
						sid: user.serverId
					};
					uidsGroup.push(group);
					channelService.pushMessageByUids(onVoiceCall.route, onVoiceCall.data, uidsGroup);

					next(null, { code: Code.OK });
				}
			});
		}
	});
}

/**
* Call this function when want to send hangupCall signaling to other.
*/
handler.hangupCall = function (msg, session, next) {
	var myId = msg.userId;
	var contactId = msg.contactId;
	var token = msg.token;
	var self = this;

	if (!myId || !contactId || !token) {
		next(null, { code: Code.FAIL, message: "some parametor has a problem." });
		return;
	}

	self.app.rpc.auth.authRemote.tokenService(session, token, function (err, res) {
		if (err) {
			console.warn(err);
			next(err, res);
		}
		else {
			let onHangupCall = {
				route: Code.sharedEvents.onHangupCall,
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
					next(null, { code: Code.FAIL, message: msg });
				}
				else {
					let group = {
						uid: user.uid,
						sid: user.serverId
					};
					uidsGroup.push(group);
					channelService.pushMessageByUids(onHangupCall.route, onHangupCall.data, uidsGroup);

					next(null, { code: Code.OK });
				}
			});
		}
	});
}

/**
* Call theLineIsBusy function when WebRTC call status is not idle.
* This function tell caller to end call. 
*/
handler.theLineIsBusy = function (msg, session, next) {
	let contactId = msg.contactId;
	let userId = session.uid;

	if (!contactId || !userId) {
		var message = "Some params is invalid.";
		next(null, { code: Code.FAIL, message: message });
		return;
	}

	let param = {
		route: Code.sharedEvents.onTheLineIsBusy,
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

	next(null, { code: Code.OK });
}

/**
 * For update roomsPairMembers collection.
 * When new room has create from web base, or other server. 
 */
const updateRoomsMap = function (app, session, roomsData: Array<Room.Room>) {
	let rooms: Array<Room.Room> = JSON.parse(JSON.stringify(roomsData));

    app.rpc.auth.authRemote.updateRoomsMapWhenNewRoomCreated(session, roomsData, null);
}