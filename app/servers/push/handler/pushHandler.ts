import mongodb = require('mongodb');
import async = require('async');

import Code from "../../../../shared/Code";
import * as User from '../../../model/User';
import webConfig = rootRequire('config/config');
const ObjectID = mongodb.ObjectID;
var channelService;


module.exports = function (app) {
    return new Handler(app);
}

const Handler = function (app) {
    console.info("pushHandler construc...");
    this.app = app;
    channelService = this.app.get('channelService');
}

const handler = Handler.prototype;

/**
 * Send messages to users
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param  {Function} next next stemp callback
 *
 * TODO...
 * ==> 1. room members who online and join in room. <for case but not significant>.
 * ==> 2. room members who online and not join room.
 * ==> 3. room members who not online. <Push>
 */
handler.push = function (msg, session, next) {
    let self = this;

    let timeout_id = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "Push message timeout..." });
    }, webConfig.timeout);

    //<!-- send callback to user who send chat msg.
    let params = {
        result: msg
    };
    next(null, { code: Code.OK, data: params });
    clearTimeout(timeout_id);

    // self.app.rpc.auth.authRemote.getRoomMap(session, rid, function (err, room) {
    //     console.log("get members from room: %s name: %s members: %s", rid, room.name, room.members.length);
    // });
};

function pushMessage(app, session, room: MRoom.Room, message: any) {
    let onlineMembers = new Array<User.OnlineUser>();
    let offlineMembers = new Array<string>();

    //@ Try to push message to other ...
    async.map(room.members, (item, resultCallback) => {
        app.rpc.auth.authRemote.getOnlineUser(session, item.id, function (err2, user) {
            if (err2 || user === null) {
                offlineMembers.push(item.id);
            }
            else {
                onlineMembers.push(user);
            }

            resultCallback(null, item);
        });
    }, (err, results) => {
        console.log("online %s: offline %s: room.members %s:", onlineMembers.length, offlineMembers.length, room.members.length);

        //<!-- push chat data to other members in room.
        let onChat = {
            route: Code.sharedEvents.onChat,
            data: message
        };

        //<!-- Push new message to online users.
        let uidsGroup = new Array();
        async.eachSeries(onlineMembers, function iterator(val, cb) {
            let group = {
                uid: val.uid,
                sid: val.serverId
            };
            uidsGroup.push(group);

            cb();
        }, function done() {
            channelService.pushMessageByUids(onChat.route, onChat.data, uidsGroup);

            //<!-- Push message to off line users via parse.
            if (!!offlineMembers && offlineMembers.length > 0) {
                // simplePushNotification(app, session, offlineMembers, room, message.sender);
            }
        });
    });
}