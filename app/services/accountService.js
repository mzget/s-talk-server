"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t;
    return { next: verb(0), "throw": verb(1), "return": verb(2) };
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _this = this;
Object.defineProperty(exports, "__esModule", { value: true });
var Code_1 = require("../../shared/Code");
var dispatcher = require('../util/dispatcher');
var request = require("request");
var config_1 = require("../../config/config");
var AccountService = (function () {
    function AccountService(app) {
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
        console.log("accountService constructor");
        this.app = app;
        this.uidMap = {};
        this.nameMap = {};
        this.channelMap = {};
    }
    Object.defineProperty(AccountService.prototype, "OnlineUsers", {
        get: function () {
            if (!this.onlineUsers)
                this.onlineUsers = {};
            return this.onlineUsers;
        },
        enumerable: true,
        configurable: true
    });
    AccountService.prototype.getOnlineUser = function (userId, cb) {
        if (!this.onlineUsers)
            this.onlineUsers = {};
        if (!this.onlineUsers[userId]) {
            var errMsg = "Specific uid is not online.";
            cb(errMsg, null);
            return;
        }
        var user = this.onlineUsers[userId];
        cb(null, user);
    };
    AccountService.prototype.addOnlineUser = function (user, callback) {
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
    };
    AccountService.prototype.removeOnlineUser = function (userId) {
        delete this.onlineUsers[userId];
    };
    Object.defineProperty(AccountService.prototype, "userTransaction", {
        get: function () {
            if (!this._userTransaction)
                this._userTransaction = {};
            return this._userTransaction;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(AccountService.prototype, "RoomsMap", {
        get: function () {
            return this.roomsMap;
        },
        enumerable: true,
        configurable: true
    });
    AccountService.prototype.setRoomsMap = function (data, callback) {
        var _this = this;
        console.log("ChatService.setRoomMembers");
        if (!this.roomsMap)
            this.roomsMap = {};
        data.forEach(function (element) {
            var room = JSON.parse(JSON.stringify(element));
            if (!_this.roomsMap[element.id]) {
                _this.roomsMap[element._id] = room;
            }
        });
        callback();
    };
    AccountService.prototype.getRoom = function (roomId, callback) {
        if (!this.roomsMap[roomId]) {
            callback("Have no a roomId in roomMembers dict.", null);
            return;
        }
        var room = this.roomsMap[roomId];
        callback(null, room);
    };
    /**
    * Require Room object. Must be { Room._id, Room.members }
    */
    AccountService.prototype.addRoom = function (data) {
        var room = JSON.parse(JSON.stringify(data));
        if (!this.roomsMap[room._id]) {
            this.roomsMap[room._id] = room;
        }
        else {
            this.roomsMap[room._id] = room;
        }
    };
    /**
     * Add player into the channel
     *
     * @param {String} uid         user id
     * @param {String} playerName  player's role name
     * @param {String} channelName channel name
     * @return {Number} see code.js
     */
    AccountService.prototype.add = function (uid, playerName, channelName) {
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
    };
    /**
     * User leaves the channel
     *
     * @param  {String} uid         user id
     * @param  {String} channelName channel name
     */
    AccountService.prototype.leave = function (uid, channelName) {
        var record = this.uidMap[uid];
        var channel = this.app.get('channelService').getChannel(channelName, true);
        if (channel && record) {
            channel.leave(uid, record.sid);
        }
        this.removeRecord(this, uid, channelName);
    };
    /**
     * Kick user from chat service.
     * This operation would remove the user from all channels and
     * clear all the records of the user.
     *
     * @param  {String} uid user id
     */
    AccountService.prototype.kick = function (uid) {
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
    };
    /**
     * Push message by the specified channel
     *
     * @param  {String}   channelName channel name
     * @param  {Object}   msg         message json object
     * @param  {Function} cb          callback function
     */
    AccountService.prototype.pushByChannel = function (channelName, msg, cb) {
        var channel = this.app.get('channelService').getChannel(channelName);
        if (!channel) {
            cb(new Error('channel ' + channelName + ' dose not exist'));
            return;
        }
        //    channel.pushMessage(Event.chat, msg, cb);
    };
    /**
     * Push message to the specified player
     *
     * @param  {String}   playerName player's role name
     * @param  {Object}   msg        message json object
     * @param  {Function} cb         callback
     */
    AccountService.prototype.pushByPlayerName = function (playerName, msg, cb) {
        var record = this.nameMap[playerName];
        if (!record) {
            cb(null, Code_1.default.CHAT.FA_USER_NOT_ONLINE);
            return;
        }
        //        this.app.get('channelService').pushMessageByUids(Event.chat, msg, [{ uid: record.uid, sid: record.sid }], cb);
    };
    return AccountService;
}());
exports.AccountService = AccountService;
exports.getUserInfo = function (userId, query) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, rejected) {
                var options = {
                    url: config_1.Config.api.user + "/?id=" + userId + "&query=" + JSON.stringify(query),
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    }
                };
                function callback(error, response, body) {
                    console.log("getUserInfo status", response.statusCode);
                    if (error) {
                        console.error("getUserInfo: ", error);
                        rejected(error);
                    }
                    else if (!error && response.statusCode == 200) {
                        var data = JSON.parse(body);
                        console.log("getUserInfo", data);
                        resolve(data);
                    }
                    else {
                        console.dir("getUserInfo: ", response.statusMessage);
                        rejected(response);
                    }
                }
                request.get(options, callback);
            })];
    });
}); };
exports.getUsersInfo = function (userIds, query) { return __awaiter(_this, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, rejected) {
                var options = {
                    url: "" + config_1.Config.api.user,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user_ids: userIds,
                        query: query
                    })
                };
                function callback(error, response, body) {
                    console.log("getUserInfo status", response.statusCode);
                    if (error) {
                        console.error("getUserInfo: ", error);
                        rejected(error);
                    }
                    else if (!error && response.statusCode == 200) {
                        var data = JSON.parse(body);
                        console.log("getUserInfo", data);
                        resolve(data.result);
                    }
                    else {
                        console.dir("getUserInfo: ", response.statusMessage);
                        rejected(response);
                    }
                }
                request.post(options, callback);
            })];
    });
}); };
