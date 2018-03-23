import Code from "../../../../shared/Code";
import User = require("../../../model/User");
import { Room, RoomStatus, RoomType } from "../../../model/Room";
import TokenService from "../../../services/tokenService";
import * as chatroomService from "../../../services/chatroomService";

import Joi = require("joi");
import joiObj = require("joi-objectid");
Joi["objectId"] = joiObj(Joi);
import * as R from "ramda";

import withValidation from "../../../utils/ValidationSchema";

import { appInfo, Config } from "../../../../config/config";
import { X_API_KEY, X_API_VERSION, X_APP_ID, } from "../../../Const";
import { UserSession, UserTransaction } from "../../../model/User";
import { AccountService } from "../../../services/accountService";
import { getUsersGroup, withoutUser } from "../../../util/ChannelHelper";
import ChannelService, { IUserGroup } from "../../../util/ChannelService";
const tokenService = new TokenService();

interface IUserData {
	_id: string;
	username: string;
	payload: any;
}

module.exports = (app) => {
	return new EntryHandler(app);
};

class EntryHandler {
	app: any;
	channelService: ChannelService;
	accountService: AccountService;

	constructor(app) {
		this.app = app;
		this.channelService = app.get("channelService");
		this.accountService = app.get("accountService");

		this.closeSession = this.closeSession.bind(this);
	}

	public login(msg, session, next) {
		const self = this;

		const schema = withValidation({
			user: Joi.object({
				_id: Joi.string().required(),
				username: Joi.string().required(),
				payload: Joi.any(),
			}).required(),
		});

		const result = Joi.validate(msg, schema);
		if (result.error) {
			return next(null, { code: Code.FAIL, message: result.error });
		}

		const user = { _id: msg.user._id, username: msg.user.username };
		const apiKey = msg[X_API_KEY];
		const appId = msg[X_APP_ID];
		const appVersion = msg[X_API_VERSION];

		const app = appInfo(appId);
		if (!app) {
			return next(null, { code: Code.FAIL, message: "Not found application registered" });
		}
		if (app.apikey !== apiKey) {
			return next(null, { code: Code.FAIL, message: "authorized key fail." });
		}

		console.log("Login", user);
		tokenService.signToken(user, (err, encode) => {
			if (err) {
				return next(null, { code: Code.FAIL, message: err });
			} else {
				session.__sessionService__.kick(user._id, "New login...");

				// @ Signing success.
				session.bind(user._id);
				session.set(X_APP_ID, appId);
				session.set(X_API_KEY, apiKey);
				session.pushAll(() => { console.log("PushAll new session"); });
				session.on("closed", self.onUserLeave(self.app, session));

				// channelService.broadcast("connector", param.route, param.data);

				self.addOnlineUser(self.app, session, msg.user);
				next(null, { code: Code.OK, data: { success: true, token: encode } });
			}
		});
	}

	public logout(msg, session, next) {
		this.closeSession(this.app, session, null);
		next();
	}

	closeSession(app, session, next) {
		this.accountService.getOnlineUser(session.uid).then((user: UserSession) => {
			console.log("logged out Success", user);

			const param = {
				route: Code.sharedEvents.onUserLogout,
				data: user,
			};

			this.accountService.getOnlineUserByAppId(session.get(X_APP_ID)).then((userSessions: UserSession[]) => {
				console.log("online by app-id", userSessions.length);

				const uids = withoutUser(getUsersGroup(userSessions), session.uid);
				this.channelService.pushMessageByUids(param.route, param.data, uids);
			}).catch(console.warn);

			// !-- log user out.
			// Don't care what result of callback.
			this.accountService.removeOnlineUser(session.uid);
		}).catch(console.warn);

		if (next !== null) {
			next();
		}
	};

	/**
	 * User log out handler
	 * @param {Object} app current application
	 * @param {Object} session current session object
	 *
	 */
	onUserLeave(app, session) {
		if (!session || !session.uid) {
			return;
		}

		const userTransaction = this.accountService.getUserTransaction(session.uid);

		app.rpc.chat.chatRemote.kick(session, userTransaction, app.get("serverId"), session.get("rid"), null);

		this.closeSession(app, session, null);
	};

	public kickMe(msg, session, next) {
		session.__sessionService__.kick(msg.uid, "kick by logout all session", null);

		// !-- log user out.
		this.accountService.removeOnlineUser(msg.uid);

		next(null, { message: "kicked! " + msg.uid });
	}

	public updateUser(msg, session, next) {
		const self = this;

		const schema = withValidation({
			user: Joi.object({
				_id: Joi.string().required(),
				username: Joi.string().required(),
				payload: Joi.any(),
			}).required(),
		});

		const result = Joi.validate(msg, schema);
		if (result.error) {
			return next(null, { code: Code.FAIL, message: result.error });
		}

		const apiKey = msg[X_API_KEY];
		const appId = msg[X_APP_ID];
		const appVersion = msg[X_API_VERSION];
		const app = appInfo(appId);
		if (!app) {
			return next(null, { code: Code.FAIL, message: "Not found application registered" });
		}
		if (app.apikey !== apiKey) {
			return next(null, { code: Code.FAIL, message: "authorized key fail." });
		}

		const p = new Promise((resolve: (value: UserSession) => void, rejected) => {
			self.accountService.getOnlineUser(session.uid).then((userSession: UserSession) => {
				resolve(userSession);
			}).catch((err) => {
				rejected(err);
			});
		});

		function updateUser(user: UserSession) {
			const p2 = new Promise((resolve: (value: UserSession[]) => void, reject) => {
				self.accountService.updateUser(user).then(resolve).catch(reject);
			});
			return p2;
		}

		p.then((userSession) => {
			try {
				const newSession = userSession;
				newSession.payload = msg.user.payload;
				return updateUser(newSession);
			} catch (ex) {
				console.warn(ex.message);
				throw ex;
			}
		}).then((value) => {
			return next(null, { code: Code.OK, data: { success: true, value } });
		}).catch((err) => {
			return next(null, { code: Code.FAIL, message: err });
		});
	}

	public getUsersPayload(msg, session, next) {
		const self = this;

		const schema = withValidation({ user: Joi.object().optional() });

		const result = Joi.validate(msg, schema);
		if (result.error) {
			return next(null, { code: Code.FAIL, message: result.error });
		}

		const apiKey = msg[X_API_KEY];
		const appId = msg[X_APP_ID];
		const appVersion = msg[X_API_VERSION];

		const app = appInfo(appId);
		if (!app) {
			return next(null, { code: Code.FAIL, message: "Not found application registered" });
		}
		if (app.apikey !== apiKey) {
			return next(null, { code: Code.FAIL, message: "authorized key fail." });
		}

		function getOnlineUserByAppId() {
			const p = new Promise((resolve: (value: UserSession[]) => void, reject) => {
				self.accountService.getOnlineUserByAppId(session.get(X_APP_ID)).then((results: UserSession[]) => {
					resolve(results);
				}).catch((err) => {
					reject(err);
				});
			});

			return p;
		}

		getOnlineUserByAppId().then((usersSession) => {
			return usersSession;
		}).then((value) => {
			return next(null, { code: Code.OK, data: { success: true, value } });
		}).catch((err) => {
			return next(null, { code: Code.FAIL, message: err });
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
	public enterRoom(msg, session, next) {
		const self = this;
		const token = msg.token;
		const rid = msg.rid;
		const uname = msg.username;
		const uid = session.uid;

		if (!uid) {
			const errMsg = "session.uid is empty or null.!";
			next(null, { code: Code.FAIL, message: errMsg });
			return;
		}

		if (!rid || !msg.username) {
			next(null, { code: Code.FAIL, message: "rid or username is null." });
			return;
		}

		const timeOutId = setTimeout(() => {
			next(null, { code: Code.RequestTimeout, message: "enterRoom timeout" });
			return;
		}, Config.timeout);

		chatroomService.getRoom(rid).then((room: Room) => {
			console.log("getRoom", room);

			chatroomService.checkedCanAccessRoom(room, uid, (err, res) => {
				console.log("checkedCanAccessRoom: ", res);

				if (err || res === false) {
					clearTimeout(timeOutId);
					next(null, {
						code: Code.FAIL,
						message: "cannot access your request room. may be you are not a member or leaved room!",
					});
				} else {
					session.set("rid", rid);
					session.push("rid", (error: Error) => {
						if (error) {
							console.error("set rid for session service failed! error is : %j", error.stack);
						}
					});

					const onlineUser = {} as UserSession;
					onlineUser.username = uname;
					onlineUser.uid = uid;

					self.addChatUser(self.app, session, onlineUser, self.app.get("serverId"), rid, () => {
						clearTimeout(timeOutId);
						next(null, { code: Code.OK, data: room });
					});
				}
			});
		}).catch((err) => {
			clearTimeout(timeOutId);
			next(null, { code: Code.FAIL, message: JSON.stringify(err) });
		});
	}

	/**
	 * leaveRoom.
	 * For leave chat room.
	 * Require: roomId, username.
	 * Return: lastRoomAccess of roomId.
	 */
	public leaveRoom(msg, session, next) {
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
			return next(null, { code: Code.FAIL, message: result.error });
		}

		this.accountService.getUserTransaction(uid).then((userTransaction: User.UserTransaction) => {
			self.app.rpc.chat.chatRemote.kick(session, userTransaction, sid, rid, function (err, res) {
				session.set("rid", null);
				session.push("rid", function (err) {
					if (err) {
						console.error("set rid for session service failed! error is : %j", err.stack);
					}
				});

				if (err) {
					next(null, { code: Code.FAIL, message: "leaveRoom with error." });
				} else {
					next(null, { code: Code.OK });
				}
			});
		}).catch(console.warn);
	}

	/**
	* Requesting video call to target user.
	* @param {object} msg.targetId, myRtcId, token.
	*/
	public videoCallRequest(msg, session, next) {
		const targetId = msg.targetId;
		const uid = session.uid;
		const myRtcId = msg.myRtcId;
		const token = msg.token;
		const self = this;

		if (!targetId || !uid || !myRtcId) {
			next(null, { code: Code.FAIL, message: "some parametor has a problem." });
			return;
		}

		tokenService.ensureAuthorized(token, function (err, res) {
			if (err) {
				console.warn(err);
				next(err, res);
			} else {
				const onVideoCall = {
					route: Code.sharedEvents.onVideoCall,
					data: {
						from: uid,
						peerId: myRtcId
					},
				};
				const uidsGroup = new Array();

				self.accountService.getOnlineUser(targetId).then((user) => {
					const group = {
						uid: user.uid,
						sid: user.serverId,
					};
					uidsGroup.push(group);
					self.channelService.pushMessageByUids(onVideoCall.route, onVideoCall.data, uidsGroup);

					next(null, { code: Code.OK });
				}).catch((err) => {
					const msg = "target userId is not a list of onlineUser Please use notification server instead.";
					console.warn(msg);
					next(null, { code: Code.FAIL, message: msg });
				});
			}
		});
	}

	/**
	* Requesting for voice call to target user.
	* @param {object} msg.targetId, myRtcId, token.
	*/
	public voiceCallRequest(msg, session, next) {
		const targetId = msg.targetId;
		const uid = session.uid;
		const myRtcId = msg.myRtcId;
		const token = msg.token;
		const self = this;

		if (!targetId || !uid || !myRtcId) {
			next(null, { code: Code.FAIL, message: "some parametor has a problem." });
			return;
		}

		tokenService.ensureAuthorized(token, function (err, res) {
			if (err) {
				console.warn(err);
				next(err, res);
			} else {
				const onVoiceCall = {
					route: Code.sharedEvents.onVoiceCall,
					data: {
						from: uid,
						peerId: myRtcId
					},
				};

				const uidsGroup = new Array();
				self.accountService.getOnlineUser(targetId).then((user) => {
					const group = {
						uid: user.uid,
						sid: user.serverId,
					};
					uidsGroup.push(group);
					self.channelService.pushMessageByUids(onVoiceCall.route, onVoiceCall.data, uidsGroup);

					next(null, { code: Code.OK });
				}).catch((err) => {
					const msg = "target userId is not a list of onlineUser Please use notification server instead.";
					console.warn(msg);
					next(null, { code: Code.FAIL, message: msg });
				});
			}
		});
	}

	/**
	* Call this function when want to send hangupCall signaling to other.
	*/
	public hangupCall(msg, session, next) {
		const myId = msg.userId;
		const contactId = msg.contactId;
		const token = msg.token;
		const self = this;

		if (!myId || !contactId || !token) {
			next(null, { code: Code.FAIL, message: "some parametor has a problem." });
			return;
		}

		tokenService.ensureAuthorized(token, function (err, res) {
			if (err) {
				console.warn(err);
				next(err, res);
			} else {
				const onHangupCall = {
					route: Code.sharedEvents.onHangupCall,
					data: {
						from: myId,
						contactId,
					},
				};
				const uidsGroup = new Array();
				self.accountService.getOnlineUser(contactId).then((user: UserSession) => {
					const group = {
						uid: user.uid,
						sid: user.serverId,
					};
					uidsGroup.push(group);
					self.channelService.pushMessageByUids(onHangupCall.route, onHangupCall.data, uidsGroup);

					next(null, { code: Code.OK });
				}).catch((err) => {
					const msg = "target userId is not a list of onlineUser Please use notification server instead.";
					console.warn(msg);
					next(null, { code: Code.FAIL, message: msg });
				});
			}
		});
	}

	/**
	* Call theLineIsBusy function when WebRTC call status is not idle.
	* This function tell caller to end call.
	*/
	public theLineIsBusy(msg, session, next) {
		const contactId = msg.contactId;
		const userId = session.uid;

		if (!contactId || !userId) {
			const message = "Some params is invalid.";
			next(null, { code: Code.FAIL, message });
			return;
		}

		const param = {
			route: Code.sharedEvents.onTheLineIsBusy,
			data: { from: userId },
		};

		this.accountService.getOnlineUser(contactId).then((user: UserSession) => {
			const uidsGroup = new Array();
			const userInfo = {
				uid: user.uid,
				sid: user.serverId,
			};
			uidsGroup.push(userInfo);
			this.channelService.pushMessageByUids(param.route, param.data, uidsGroup);
		}).catch((err) => {
			const msg = "The contactId is not online.";
			console.warn(msg);
		});

		next(null, { code: Code.OK });
	}

	addOnlineUser(app, session, user: IUserData) {
		const self = this;

		const userSession = {} as UserSession;
		const userTransaction = {} as UserTransaction;
		const appId = session.get(X_APP_ID);

		userSession.uid = user._id;
		userSession.username = user.username;
		userSession.serverId = session.frontendId;
		userSession.applicationId = appId;
		userSession.payload = user.payload;

		userTransaction.uid = user._id;
		userTransaction.username = user.username;

		this.accountService.addOnlineUser(userSession, pushNewOnline);
		this.accountService.addUserTransaction(userTransaction);

		const param = {
			route: Code.sharedEvents.onUserLogin,
			data: userTransaction,
		};

		function pushNewOnline() {
			self.accountService.getOnlineUserByAppId(appId).then((userSessions: UserSession[]) => {
				console.log("add to onlineUsers list : ", userSession.username);
				console.log("onlines by app-id", appId, userSessions.length);

				const uids = withoutUser(getUsersGroup(userSessions), session.uid);
				self.channelService.pushMessageByUids(param.route, param.data, uids);
			}).catch(console.warn);
		}
	}

	addChatUser(app, session, user: User.UserSession, sid, rid, next) {
		// put user into channel
		app.rpc.chat.chatRemote.add(session, user, sid, rid, true, next);
	};
}

