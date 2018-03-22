"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Code_1 = require("../../shared/Code");
const RedisClient_1 = require("./RedisClient");
const dispatcher = require("../util/dispatcher");
exports.ONLINE_USER = "online_user";
exports.TRANSACTION_USER = "transaction_user";
class AccountService {
    constructor(app) {
        this.uidMap = {};
        this.nameMap = {};
        this.channelMap = {};
        /**
         * Add records for the specified user
         */
        this.addRecord = function (service, uid, name, sid, channelName) {
            const record = { uid, name, sid };
            service.uidMap[uid] = record;
            service.nameMap[name] = record;
            let item = service.channelMap[uid];
            if (!item) {
                item = service.channelMap[uid] = {};
            }
            item[channelName] = 1;
        };
        /**
         * Cehck whether the user has already in the channel
         */
        this.checkDuplicate = function (service, uid, channelName) {
            return !!service.channelMap[uid] && !!service.channelMap[uid][channelName];
        };
        /**
         * Get the connector server id assosiated with the uid
         */
        this.getSidByUid = function (uid, app) {
            const connector = dispatcher.dispatch(uid, app.getServersByType("connector"));
            if (connector) {
                return connector.id;
            }
            return null;
        };
        this.app = app;
        this.uidMap = {};
        this.nameMap = {};
        this.channelMap = {};
    }
    /**
     * onLineUsers the dict keep UID of user who online pair with OnlineUser data structure.
     */
    OnlineUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Array();
            const onlines = yield RedisClient_1.hgetallAsync(exports.ONLINE_USER);
            for (const key in onlines) {
                if (onlines.hasOwnProperty(key)) {
                    const value = onlines[key];
                    const userSession = JSON.parse(value);
                    results.push(userSession);
                }
            }
            return yield results;
        });
    }
    getOnlineUser(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const online = yield RedisClient_1.hgetAsync(exports.ONLINE_USER, userId);
            if (typeof online == "string") {
                const userSession = JSON.parse(online);
                return Promise.resolve(userSession);
            }
            else if (online instanceof UserSession) {
                return Promise.resolve(online);
            }
            else {
                const errMsg = "Specific uid is not online.";
                return Promise.reject(errMsg);
            }
        });
    }
    getOnlineUserByAppId(appId) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Array();
            const onlines = yield RedisClient_1.hgetallAsync(exports.ONLINE_USER);
            for (const key in onlines) {
                if (onlines.hasOwnProperty(key)) {
                    const value = onlines[key];
                    const userSession = JSON.parse(value);
                    if (userSession.applicationId === appId) {
                        results.push(userSession);
                    }
                }
            }
            return Promise.resolve(results);
        });
    }
    addOnlineUser(user, callback) {
        RedisClient_1.default.hmset(exports.ONLINE_USER, user.uid, JSON.stringify(user), (err, reply) => {
            console.warn("set onlineUser", err, reply);
            callback();
        });
    }
    updateUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const p = new Promise((resolve, reject) => {
                RedisClient_1.default.hmset(exports.ONLINE_USER, user.uid, JSON.stringify(user), (err, reply) => {
                    console.warn("save onlineUser", err, reply);
                    resolve(this.OnlineUsers());
                });
            });
            return yield p;
        });
    }
    removeOnlineUser(userId) {
        RedisClient_1.default.hdel(exports.ONLINE_USER, userId, (err, reply) => {
            console.warn("del onlineUser", err, reply);
        });
    }
    userTransaction() {
        return __awaiter(this, void 0, void 0, function* () {
            const results = new Array();
            const transacs = yield RedisClient_1.hgetallAsync(exports.TRANSACTION_USER);
            for (const key in transacs) {
                if (transacs.hasOwnProperty(key)) {
                    const transac = JSON.parse(transacs[key]);
                    results.push(transac);
                }
            }
            return yield results;
        });
    }
    addUserTransaction(userTransac) {
        RedisClient_1.default.hmset(exports.TRANSACTION_USER, userTransac.uid, JSON.stringify(userTransac), (err, reply) => {
            console.warn("set transaction_user", err, reply);
        });
    }
    getUserTransaction(uid) {
        return __awaiter(this, void 0, void 0, function* () {
            const transac = yield RedisClient_1.hgetAsync(exports.TRANSACTION_USER, uid);
            const userTransaction = JSON.parse(transac);
            return userTransaction;
        });
    }
    /**
     * Add player into the channel
     *
     * @param {String} uid         user id
     * @param {String} playerName  player's role name
     * @param {String} channelName channel name
     * @return {Number} see code.js
     */
    add(uid, playerName, channelName) {
        const sid = this.getSidByUid(uid, this.app);
        if (!sid) {
            return Code_1.default.CHAT.FA_UNKNOWN_CONNECTOR;
        }
        if (this.checkDuplicate(this, uid, channelName)) {
            return Code_1.default.OK;
        }
        const channel = this.app.get("channelService").getChannel(channelName, true);
        if (!channel) {
            return Code_1.default.CHAT.FA_CHANNEL_CREATE;
        }
        channel.add(uid, sid);
        this.addRecord(this, uid, playerName, sid, channelName);
        return Code_1.default.OK;
    }
    /**
     * User leaves the channel
     *
     * @param  {String} uid         user id
     * @param  {String} channelName channel name
     */
    leave(uid, channelName) {
        const record = this.uidMap[uid];
        const channel = this.app.get("channelService").getChannel(channelName, true);
        if (channel && record) {
            channel.leave(uid, record.sid);
        }
        this.removeRecord(this, uid, channelName);
    }
    /**
     * Kick user from chat service.
     * This operation would remove the user from all channels and
     * clear all the records of the user.
     *
     * @param  {String} uid user id
     */
    kick(uid) {
        const channelNames = this.channelMap[uid];
        const record = this.uidMap[uid];
        if (channelNames && record) {
            // remove user from channels
            let channel;
            for (const name in channelNames) {
                channel = this.app.get("channelService").getChannel(name);
                if (channel) {
                    channel.leave(uid, record.sid);
                }
            }
        }
        this.clearRecords(this, uid);
    }
    /**
     * Push message by the specified channel
     *
     * @param  {String}   channelName channel name
     * @param  {Object}   msg         message json object
     * @param  {Function} cb          callback function
     */
    pushByChannel(channelName, msg, cb) {
        const channel = this.app.get("channelService").getChannel(channelName);
        if (!channel) {
            cb(new Error("channel " + channelName + " dose not exist"));
            return;
        }
        //    channel.pushMessage(Event.chat, msg, cb);
    }
    /**
     * Push message to the specified player
     *
     * @param  {String}   playerName player's role name
     * @param  {Object}   msg        message json object
     * @param  {Function} cb         callback
     */
    pushByPlayerName(playerName, msg, cb) {
        const record = this.nameMap[playerName];
        if (!record) {
            cb(null, Code_1.default.CHAT.FA_USER_NOT_ONLINE);
            return;
        }
        //        this.app.get('channelService').pushMessageByUids(Event.chat, msg, [{ uid: record.uid, sid: record.sid }], cb);
    }
    /**
     * Remove records for the specified user and channel pair
     */
    removeRecord(service, uid, channelName) {
        delete service.channelMap[uid][channelName];
        //    if (utils.size(service.channelMap[uid])) {
        //        return;
        //    }
        // if user not in any channel then clear his records
        this.clearRecords(service, uid);
    }
    ;
    /**
     * Clear all records of the user
     */
    clearRecords(service, uid) {
        delete service.channelMap[uid];
        const record = service.uidMap[uid];
        if (!record) {
            return;
        }
        delete service.uidMap[uid];
        delete service.nameMap[record.name];
    }
    ;
    removeAllKeys() {
        RedisClient_1.default.flushall();
    }
}
exports.AccountService = AccountService;
