"use strict";
const async = require('async');
const Code_1 = require("../../../../shared/Code");
const config_1 = require("../../../../config/config");
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
handler.push = function (msg, session, next) {
    let self = this;
    let timeout_id = setTimeout(function () {
        next(null, { code: Code_1.default.RequestTimeout, message: "Push message timeout..." });
    }, config_1.Config.timeout);
    //<!-- send callback to user who send chat msg.
    let sessionInfo = { id: session.id, frontendId: session.frontendId, uid: session.uid };
    let params = {
        session: sessionInfo
    };
    next(null, { code: Code_1.default.OK, data: params });
    clearTimeout(timeout_id);
    pushMessage(self.app, session, msg);
};
function pushMessage(app, session, body) {
    let onlineMembers = new Array();
    let offlineMembers = new Array();
    //@ Try to push message to other ...
    async.map(body.members, (item, resultCallback) => {
        app.rpc.auth.authRemote.getOnlineUser(session, item, function (err, user) {
            if (err || user === null) {
                offlineMembers.push(item);
            }
            else {
                onlineMembers.push(user);
            }
            resultCallback(null, item);
        });
    }, (err, results) => {
        console.log("online %s: offline %s: room.members %s:", onlineMembers.length, offlineMembers.length, body.members.length);
        //<!-- push chat data to other members in room.
        let onPush = {
            route: Code_1.default.sharedEvents.ON_PUSH,
            data: { event: body.event, message: body.message }
        };
        //<!-- Push new message to online users.
        let uidsGroup = new Array();
        async.map(onlineMembers, function iterator(val, cb) {
            let group = {
                uid: val.uid,
                sid: val.serverId
            };
            uidsGroup.push(group);
            cb(null, null);
        }, function done() {
            channelService.pushMessageByUids(onPush.route, onPush.data, uidsGroup);
            //<!-- Push message to off line users via parse.
            if (!!offlineMembers && offlineMembers.length > 0) {
            }
        });
    });
}
