"use strict";
const mongodb = require('mongodb');
const async = require('async');
const Code_1 = require("../../../../shared/Code");
var webConfig = rootRequire;
('config/config');
const ObjectID = mongodb.ObjectID;
var channelService;
module.exports = function (app) {
    return new Handler(app);
};
const Handler = function (app) {
    console.info("pushHandler construc...");
    this.app = app;
    channelService = this.app.get('channelService');
};
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
        next(null, { code: Code_1.default.RequestTimeout, message: "Push message timeout..." });
    }, webConfig.timeout);
    //<!-- send callback to user who send chat msg.
    let sessionInfo = { id: session.id, frontendId: session.frontendId, uid: session.uid };
    let params = {
        session: sessionInfo
    };
    next(null, { code: Code_1.default.OK, data: params });
    clearTimeout(timeout_id);
    // self.app.rpc.auth.authRemote.getRoomMap(session, rid, function (err, room) {
    //     console.log("get members from room: %s name: %s members: %s", rid, room.name, room.members.length);
    // });
};
function pushMessage(app, session, room, message) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
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
            route: Code_1.default.sharedEvents.onChat,
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
            }
        });
    });
}
