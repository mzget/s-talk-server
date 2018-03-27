import User = require("../../../model/User");

import ChannelService from "../../../utils/ChannelService";

let channelService: ChannelService;

module.exports = function (app) {
    return new ChatRemote(app);
};

class ChatRemote {
    app: any;

    constructor(app) {
        this.app = app;
        channelService = app.get("channelService");
    }


    /**
    * Add user into chat channel.
    * @param {String} uid unique id for user
    * @param {String} sid server id
    * @param {String} name channel name
    * @param {boolean} flag channel parameter
    */
    add(user: User.UserSession, sid, rid, flag, cb) {
        let channel = channelService.getChannel(rid, flag);
        let username = user.username;
        let uid = user.uid;

        console.log("chatRemote.add : user %s to room %s", user.username, rid);

        if (!!channel) {
            let param = {
                route: "onAdd", user: user
            };
            channel.pushMessage(param.route, param.user);
            channel.add(uid, sid);
        }

        if (!!cb) cb();
    }

    /**
    * Get user from chat channel.
    *
    * @param {Object} opts parameters for request
    * @param {String} name channel name
    * @param {boolean} flag channel parameter
    * @return {Array} users uids in channel
    *
    */
    getUsers(name, flag) {
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
    }

    /**
    * Kick user out chat channel.
    * When user leave room. Server will update lastAccessTime of left room for them.
    * Then server return roomAccess data of left room to them.
    *
    * @param {String} uid unique id for user
    * @param {String} sid server id
    * @param {String} name channel name
    */
    kick(user: User.UserTransaction, sid, rid, cb: Function) {
        if (!rid) { return; }

        let channel = channelService.getChannel(rid, false);
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
    }
};