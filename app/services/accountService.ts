import Code from "../../shared/Code";
import User, { UserSession, UserTransaction } from "../model/User";
import Room = require("../model/Room");
import redis = require("redis");
const client = redis.createClient();

const dispatcher = require("../util/dispatcher");

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
    private onlineUsers = new Map<string, UserSession>();
    public OnlineUsers() {
        if (!this.onlineUsers) {
            this.onlineUsers = new Map();
        }

        return this.onlineUsers;
    }
    public getOnlineUser(userId: string, cb: (err: any, user: UserSession | null) => void) {
        if (!this.onlineUsers) {
            this.onlineUsers = new Map();
        }

        if (this.onlineUsers.has(userId)) {
            const user = this.onlineUsers.get(userId) as UserSession;
            cb(null, user);
        } else {
            const errMsg = "Specific uid is not online.";
            cb(errMsg, null);
        }
    }

    public getOnlineUserByAppId(appId: string, cb: (err: any, users: UserSession[]) => void) {
        const results = new Array<UserSession>();

        this.onlineUsers.forEach((value) => {
            if (value.applicationId === appId) {
                results.push(value);
            }
        });

        cb(null, results);
    }

    public addOnlineUser(user: UserSession, callback: Function) {
        if (!this.onlineUsers) {
            this.onlineUsers = new Map();
        }

        if (!this.onlineUsers.has(user.uid)) {
            this.onlineUsers.set(user.uid, user);
        } else {
            console.warn("onlineUsers dict already has value.!");
        }

        callback();
    }
    public async updateUser(user: UserSession) {
        if (!this.onlineUsers) {
            this.onlineUsers = new Map();
        }

        this.onlineUsers.set(user.uid, user);

        return await Array.from(this.onlineUsers.values());
    }
    public removeOnlineUser(userId: string) {
        this.onlineUsers.delete(userId);
    }

    private _userTransaction: IUsersMap = {};
    public get userTransaction(): IUsersMap {
        if (!this._userTransaction) {
            this._userTransaction = {};
        }

        return this._userTransaction;
    }

    addUserTransaction(userTransac: UserTransaction) {
        if (!this._userTransaction) {
            this._userTransaction = {};
        }

        this._userTransaction[userTransac.uid] = userTransac;

        return this._userTransaction;
    }
    getUserTransaction(uid: string) {
        return this._userTransaction[uid];
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
}
