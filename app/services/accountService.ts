import Code from "../../shared/Code";
import User, { UserSession, UserTransaction } from "../model/User";
import Room = require("../model/Room");
import redisClient, { hgetAsync, hgetallAsync } from "./RedisClient";

const dispatcher = require("../util/dispatcher");

export const ONLINE_USER = "online_user";
export const TRANSACTION_USER = "transaction_user";

interface IUsersMap {
    [uid: string]: UserTransaction;
}

export class AccountService {

    private app: any;
    private uidMap = {};
    private nameMap = {};
    private channelMap = {};
    /**
     * onLineUsers the dict keep UID of user who online pair with OnlineUser data structure.
     */
    public async OnlineUsers() {
        const results = new Array<UserSession>();

        const onlines = await hgetallAsync(ONLINE_USER);
        for (const key in onlines) {
            if (onlines.hasOwnProperty(key)) {
                const value = onlines[key];
                const userSession = JSON.parse(value) as UserSession;
                results.push(userSession);
            }
        }

        return await results;
    }
    public async getOnlineUser(userId: string) {
        const online = await hgetAsync(ONLINE_USER, userId);
        if (typeof online == "string") {
            const userSession = JSON.parse(online) as UserSession;
            return Promise.resolve(userSession);
        }
        else if (online instanceof UserSession) {
            return Promise.resolve(online);
        } else {
            const errMsg = "Specific uid is not online.";
            return Promise.reject(errMsg);
        }
    }

    public async getOnlineUserByAppId(appId: string) {
        const results = new Array<UserSession>();

        const onlines = await hgetallAsync(ONLINE_USER);
        for (const key in onlines) {
            if (onlines.hasOwnProperty(key)) {
                const value = onlines[key];
                const userSession = JSON.parse(value) as UserSession;
                if (userSession.applicationId === appId) {
                    results.push(userSession);
                }
            }
        }

        return Promise.resolve(results);
    }

    public addOnlineUser(user: UserSession, callback: Function) {
        redisClient.hmset(ONLINE_USER, user.uid, JSON.stringify(user), (err, reply) => {
            console.warn("set onlineUser", err, reply);

            callback();
        });
    }
    public async updateUser(user: UserSession) {
        const p = new Promise((resolve: (data: Promise<UserSession[]>) => void, reject) => {
            redisClient.hmset(ONLINE_USER, user.uid, JSON.stringify(user), (err, reply) => {
                console.warn("save onlineUser", err, reply);
                resolve(this.OnlineUsers());
            });
        });

        return await p;
    }
    public removeOnlineUser(userId: string) {
        redisClient.hdel(ONLINE_USER, userId, (err, reply) => {
            console.warn("del onlineUser", err, reply);
        });
    }

    public async userTransaction() {
        const results = new Array<UserTransaction>();
        const transacs = await hgetallAsync(TRANSACTION_USER);
        for (const key in transacs) {
            if (transacs.hasOwnProperty(key)) {
                const transac = JSON.parse(transacs[key]) as UserTransaction;
                results.push(transac);
            }
        }

        return await results;
    }

    addUserTransaction(userTransac: UserTransaction) {
        redisClient.hmset(TRANSACTION_USER, userTransac.uid, JSON.stringify(userTransac), (err, reply) => {
            console.warn("set transaction_user", err, reply);
        });
    }

    async getUserTransaction(uid: string) {
        const transac = await hgetAsync(TRANSACTION_USER, uid);
        const userTransaction = JSON.parse(transac) as UserTransaction;

        return userTransaction;
    }

    constructor(app: any) {
        this.app = app;
        this.uidMap = {};
        this.nameMap = {};
        this.channelMap = {};
    }

    /**
     * Add player into the channel
     *
     * @param {String} uid         user id
     * @param {String} playerName  player's role name
     * @param {String} channelName channel name
     * @return {Number} see code.js
     */
    public add(uid, playerName, channelName) {
        const sid = this.getSidByUid(uid, this.app);
        if (!sid) {
            return Code.CHAT.FA_UNKNOWN_CONNECTOR;
        }

        if (this.checkDuplicate(this, uid, channelName)) {
            return Code.OK;
        }

        const channel = this.app.get("channelService").getChannel(channelName, true);
        if (!channel) {
            return Code.CHAT.FA_CHANNEL_CREATE;
        }

        channel.add(uid, sid);
        this.addRecord(this, uid, playerName, sid, channelName);

        return Code.OK;
    }

    /**
     * User leaves the channel
     *
     * @param  {String} uid         user id
     * @param  {String} channelName channel name
     */
    public leave(uid, channelName) {
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
    public kick(uid) {
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
    public pushByChannel(channelName, msg, cb) {
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
    public pushByPlayerName(playerName, msg, cb) {
        const record = this.nameMap[playerName];
        if (!record) {
            cb(null, Code.CHAT.FA_USER_NOT_ONLINE);
            return;
        }

        //        this.app.get('channelService').pushMessageByUids(Event.chat, msg, [{ uid: record.uid, sid: record.sid }], cb);
    }

    /**
     * Add records for the specified user
     */
    public addRecord = function (service, uid, name, sid, channelName) {
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
    public checkDuplicate = function (service, uid, channelName): boolean {
        return !!service.channelMap[uid] && !!service.channelMap[uid][channelName];
    };

    /**
     * Remove records for the specified user and channel pair
     */
    public removeRecord = function (service, uid, channelName) {
        delete service.channelMap[uid][channelName];
        //    if (utils.size(service.channelMap[uid])) {
        //        return;
        //    }

        // if user not in any channel then clear his records
        this.clearRecords(service, uid);
    };

    /**
     * Clear all records of the user
     */
    public clearRecords = function (service, uid) {
        delete service.channelMap[uid];

        const record = service.uidMap[uid];
        if (!record) {
            return;
        }

        delete service.uidMap[uid];
        delete service.nameMap[record.name];
    };

    /**
     * Get the connector server id assosiated with the uid
     */
    public getSidByUid = function (uid, app) {
        const connector = dispatcher.dispatch(uid, app.getServersByType("connector"));
        if (connector) {
            return connector.id;
        }
        return null;
    };

    removeAllKeys() {
        redisClient.flushall();
    }
}
