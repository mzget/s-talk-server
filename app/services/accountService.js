"use strict";
const Code_1 = require('../../shared/Code');
const dispatcher = require('../util/dispatcher');
class AccountService {
    constructor(app) {
        this.uidMap = {};
        this.nameMap = {};
        this.channelMap = {};
        /**
         * Add records for the specified user
         */
        this.addRecord = function (service, uid, name, sid, channelName) {
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
        this.checkDuplicate = function (service, uid, channelName) {
            return !!service.channelMap[uid] && !!service.channelMap[uid][channelName];
        };
        /**
         * Remove records for the specified user and channel pair
         */
        this.removeRecord = function (service, uid, channelName) {
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
        this.clearRecords = function (service, uid) {
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
        this.getSidByUid = function (uid, app) {
            var connector = dispatcher.dispatch(uid, app.getServersByType('connector'));
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
    get OnlineUsers() {
        if (!this.onlineUsers)
            this.onlineUsers = {};
        return this.onlineUsers;
    }
    getOnlineUser(userId, cb) {
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
    addOnlineUser(user, callback) {
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
    removeOnlineUser(userId) {
        delete this.onlineUsers[userId];
    }
    get userTransaction() {
        if (!this._userTransaction)
            this._userTransaction = {};
        return this._userTransaction;
    }
    get RoomsMap() {
        return this.roomsMap;
    }
    setRoomsMap(data, callback) {
        console.log("ChatService.setRoomMembers");
        if (!this.roomsMap)
            this.roomsMap = {};
        data.forEach(element => {
            var room = JSON.parse(JSON.stringify(element));
            if (!this.roomsMap[element.id]) {
                this.roomsMap[element._id] = room;
            }
        });
        callback();
    }
    getRoom(roomId, callback) {
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
        var room = JSON.parse(JSON.stringify(data));
        if (!this.roomsMap[room._id]) {
            this.roomsMap[room._id] = room;
        }
        else {
            this.roomsMap[room._id] = room;
        }
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
            return Code_1.default.CHAT.FA_UNKNOWN_CONNECTOR;
        }
        if (this.checkDuplicate(this, uid, channelName)) {
            return Code_1.default.OK;
        }
        var channel = this.app.get('channelService').getChannel(channelName, true);
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
            cb(null, Code_1.default.CHAT.FA_USER_NOT_ONLINE);
            return;
        }
        //        this.app.get('channelService').pushMessageByUids(Event.chat, msg, [{ uid: record.uid, sid: record.sid }], cb);
    }
}
exports.AccountService = AccountService;
