// Please keep in mind.
// Remote server cannot write in es6 class.


import ChannelService from "../../../utils/ChannelService";
import { UserSession } from "../../../model/User";

let channelService: ChannelService;

module.exports = function (app) {
    return new ChatRemote(app);
};

const ChatRemote = function (app) {
    //@ts-ignore
    this.app = app;
    channelService = app.get('channelService');
};

/**
 * Add user into chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 * @param {boolean} flag channel parameter
 *
 */
ChatRemote.prototype.add = function (user: UserSession, sid, name, flag, cb) {
    let channel = channelService.getChannel(name, flag);
    let uid = user.uid;

    console.log("chatRemote.add : user %s to room %s", user, name);

    if (!!channel) {
        let param = {
            route: "onAdd", user: user
        };
        channel.pushMessage(param.route, param.user);
        channel.add(uid, sid);
    }

    if (!!cb) cb();
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
ChatRemote.prototype.get = function (name, flag) {
    let users = new Array();
    let channel = channelService.getChannel(name, flag);
    if (!!channel) {
        users = channel.getMembers();
        console.warn("Heavy operation.!!! channel members: ", users);
    }
    for (let i = 0; i < users.length; i++) {
        users[i] = users[i].split("*")[0];
    }
    return users;
};

/**
 * Kick user out chat channel.
 *
 * @param {String} uid unique id for user
 * @param {String} sid server id
 * @param {String} name channel name
 *
 */
ChatRemote.prototype.kick = function (user: UserSession, sid, name, cb) {
    if (!name) { return; }

    let channel = channelService.getChannel(name, false);
    // <!-- when user leave channel.
    if (!!channel) {
        let username = user.username;
        let uid = user.uid;

        channel.leave(uid, sid);
        console.log("user %s leave channel ", user);

        let param = {
            route: "onLeave", user: user
        };
        channel.pushMessage(param.route, param.user);
    }

    if (cb) cb();
};
