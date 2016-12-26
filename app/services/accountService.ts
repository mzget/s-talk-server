import Code from '../../shared/Code';
import User = require('../model/User');
import Room = require('../model/Room');

const dispatcher = require('../util/dispatcher');

interface IRoomsMap {
    [rid: string]: Room.Room;
}
interface IUsersMap {
    [uid: string]: User.UserTransaction
}

export class AccountService {

    private app: any;
    private uidMap = {};
    private nameMap = {};
    private channelMap = {};
    /**
     * onLineUsers the dict keep UID of user who online pair with OnlineUser data structure.
     */
    private onlineUsers: User.IOnlineUser;
    public get OnlineUsers(): User.IOnlineUser {
        if (!this.onlineUsers)
            this.onlineUsers = {};

        return this.onlineUsers;
    }
    public getOnlineUser(userId: string, cb: (err: any, user: User.OnlineUser) => void) {
        if (!this.onlineUsers)
            this.onlineUsers = {};

        if (!this.onlineUsers[userId]) {
            let errMsg = "Specific uid is not online.";
            cb(errMsg, null);
            return;
        }

        let user = this.onlineUsers[userId];
        cb(null, user);
    }
    public addOnlineUser(user: User.OnlineUser, callback: Function) {
        console.log("chatService.addOnlineUser");

        if (!this.onlineUsers)
            this.onlineUsers = {};

        if (!this.onlineUsers[user.uid]) {
            this.onlineUsers[user.uid] = user;
        }
        else {
            console.warn("onlineUsers dict already has value.!");
        }

        callback();
    }
    public removeOnlineUser(userId: string) {
        delete this.onlineUsers[userId];
    }

    private _userTransaction: IUsersMap;
    public get userTransaction(): IUsersMap {
        if (!this._userTransaction)
            this._userTransaction = {};

        return this._userTransaction;
    }

    /**
     * roomMembers the dict for keep roomId pair with array of uid who is a member of room.
     */
    private roomsMap: IRoomsMap;
    public get RoomsMap(): IRoomsMap {
        return this.roomsMap;
    }
    setRoomsMap(data: Array<any>, callback) {
        console.log("ChatService.setRoomMembers");

        if (!this.roomsMap)
            this.roomsMap = {};

        data.forEach(element => {
            var room: Room.Room = JSON.parse(JSON.stringify(element));
            if (!this.roomsMap[element.id]) {
                this.roomsMap[element._id] = room;
            }
        });

        callback();
    }
    getRoom(roomId: string, callback: (err: any, res: Room.Room) => void) {
        if (!this.roomsMap[roomId]) {
            callback("Have no a roomId in roomMembers dict.", null);
            return;
        }

        let room = this.roomsMap[roomId];
        callback(null, room);
    }

    /**
    * Require Room object. Must be { Room._id, Room.members }
    */
    addRoom(data) {
        let room: Room.Room = JSON.parse(JSON.stringify(data));
        if (!this.roomsMap[room._id]) {
            this.roomsMap[room._id] = room;
        }
        else {
            this.roomsMap[room._id] = room;
        }
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
    add(uid, playerName, channelName) {
        var sid = this.getSidByUid(uid, this.app);
        if (!sid) {
            return Code.CHAT.FA_UNKNOWN_CONNECTOR;
        }

        if (this.checkDuplicate(this, uid, channelName)) {
            return Code.OK;
        }

        var channel = this.app.get('channelService').getChannel(channelName, true);
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
    leave(uid, channelName) {
        var record = this.uidMap[uid];
        var channel = this.app.get('channelService').getChannel(channelName, true);

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
        var channelNames = this.channelMap[uid];
        var record = this.uidMap[uid];

        if (channelNames && record) {
            // remove user from channels
            var channel;
            for (var name in channelNames) {
                channel = this.app.get('channelService').getChannel(name);
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
        var channel = this.app.get('channelService').getChannel(channelName);
        if (!channel) {
            cb(new Error('channel ' + channelName + ' dose not exist'));
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
        var record = this.nameMap[playerName];
        if (!record) {
            cb(null, Code.CHAT.FA_USER_NOT_ONLINE);
            return;
        }

        //        this.app.get('channelService').pushMessageByUids(Event.chat, msg, [{ uid: record.uid, sid: record.sid }], cb);
    }

    /**
     * Add records for the specified user
     */
    addRecord = function (service, uid, name, sid, channelName) {
        var record = { uid: uid, name: name, sid: sid };
        service.uidMap[uid] = record;
        service.nameMap[name] = record;
        var item = service.channelMap[uid];
        if (!item) {
            item = service.channelMap[uid] = {};
        }
        item[channelName] = 1;
    };

    /**
     * Cehck whether the user has already in the channel
     */
    checkDuplicate = function (service, uid, channelName): boolean {
        return !!service.channelMap[uid] && !!service.channelMap[uid][channelName];
    };

    /**
     * Remove records for the specified user and channel pair
     */
    removeRecord = function (service, uid, channelName) {
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
    clearRecords = function (service, uid) {
        delete service.channelMap[uid];

        var record = service.uidMap[uid];
        if (!record) {
            return;
        }

        delete service.uidMap[uid];
        delete service.nameMap[record.name];
    };

    /**
     * Get the connector server id assosiated with the uid
     */
    getSidByUid = function (uid, app) {
        var connector = dispatcher.dispatch(uid, app.getServersByType('connector'));
        if (connector) {
            return connector.id;
        }
        return null;
    };
}