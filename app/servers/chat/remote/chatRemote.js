"use strict";
var channelService;
module.exports = function (app) {
    console.info("instanctiate ChatRemote.");
    return new ChatRemote(app);
};
const ChatRemote = function (app) {
    this.app = app;
    channelService = app.get('channelService');
};
const remote = ChatRemote.prototype;
/**
* Add user into chat channel.
* @param {String} uid unique id for user
* @param {String} sid server id
* @param {String} name channel name
* @param {boolean} flag channel parameter
*/
remote.add = function (user, sid, rid, flag, cb) {
    let channel = channelService.getChannel(rid, flag);
    let username = user.username;
    let uid = user.uid;
    console.log("chatRemote.add : user %s to room %s", user.username, rid);
    let param = {
        route: 'onAdd',
        user: user
    };
    if (!!channel) {
        channel.add(uid, sid);
        channel.pushMessage(param);
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
    cb();
    if (!rid) {
        return;
    }
    let channel = channelService.getChannel(rid, false);
    //<!-- when user leave channel.
    if (!!channel) {
        var username = user.username;
        var uid = user.uid;
        console.log("uid %s leave channel ", uid);
        var param = {
            route: 'onLeave',
            user: user
        };
        channel.pushMessage(param);
        channel.leave(uid, sid);
    }
};
