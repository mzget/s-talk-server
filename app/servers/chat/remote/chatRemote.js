"use strict";
var UserManager_1 = require('../../../controller/UserManager');
var Code_1 = require('../../../../shared/Code');
var ObjectID = require('mongodb').ObjectID;
var userManager = UserManager_1.UserManager.getInstance();
var channelService;
module.exports = function (app) {
    console.info("instanctiate ChatRemote.");
    return new ChatRemote(app);
};
var ChatRemote = function (app) {
    this.app = app;
    channelService = app.get('channelService');
};
var remote = ChatRemote.prototype;
/**
* Add user into chat channel.
* @param {String} uid unique id for user
* @param {String} sid server id
* @param {String} name channel name
* @param {boolean} flag channel parameter
*/
remote.add = function (user, sid, rid, flag, cb) {
    var channel = channelService.getChannel(rid, flag);
    var username = user.username;
    var uid = user.uid;
    console.log("chatRemote.add : user %s to room %s", user.username, rid);
    var param = {
        route: 'onAdd',
        user: user
    };
    channel.pushMessage(param);
    if (!!channel) {
        channel.add(uid, sid);
    }
    if (!!cb)
        cb();
    //    var users = this.getUsers(rid, flag);
};
/**
* Get user from chat channel.
*
* @param {Object} opts parameters for request
* @param {String} name channel name
* @param {boolean} flag channel parameter
* @return {Array} users uids in channel
*
*/
remote.getUsers = function (name, flag) {
    var users = [];
    var channel = channelService.getChannel(name, flag);
    if (!!channel) {
        users = channel.getMembers();
        console.warn("Heavy operation.!!! channel members: ", users);
    }
    for (var i = 0; i < users.length; i++) {
        users[i] = users[i].split('*')[0];
    }
    return users;
};
/**
* Kick user out chat channel.
* When user leave room. Server will update lastAccessTime of left room for them.
* Then server return roomAccess data of left room to them.
*
* @param {String} uid unique id for user
* @param {String} sid server id
* @param {String} name channel name
*/
remote.kick = function (user, sid, rid, cb) {
    var self = this;
    cb();
    if (!rid) {
        return;
    }
    userManager.updateLastAccessTimeOfRoom(user.uid, rid, new Date(), function (err, accessInfo) {
        var printR = (accessInfo) ? accessInfo.result : null;
        console.log("chatRemote.kick : updateLastAccessRoom rid is %s: ", rid, printR);
        userManager.getRoomAccessOfRoom(uid, rid, function (err, res) {
            console.log("chatRemote.kick : getLastAccessOfRoom of %s", rid, res);
            if (err || !res)
                return;
            var targetId = { uid: user.uid, sid: user.serverId };
            var group = new Array();
            group.push(targetId);
            var param = {
                route: Code_1.default.sharedEvents.onUpdatedLastAccessTime,
                data: res[0]
            };
            channelService.pushMessageByUids(param.route, param.data, group);
        });
    });
    var channel = channelService.getChannel(rid, false);
    //<!-- when user leave channel.
    if (!!channel) {
        var username = user.username;
        var uid = user.uid;
        console.log("uid %s leave channel ", uid);
        var param = {
            route: 'onLeave',
            user: username
        };
        channel.pushMessage(param);
        channel.leave(uid, sid);
    }
};
remote.updateRoomAccess = function (uid, rid, date, cb) {
    userManager.updateLastAccessTimeOfRoom(uid, rid, date, function (err, accessInfo) {
        console.log("updateLastAccessRoom rid is %s: ", rid, accessInfo.result);
        if (!!cb)
            cb(err, accessInfo);
    });
};
