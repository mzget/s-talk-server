import async = require("async");

import Code, { SessionInfo } from "../../../../shared/Code";
import * as User from "../../../model/User";
import * as Room from "../../../model/Room";
import { Config } from "../../../../config/config";
let channelService;


module.exports = function (app) {
    return new Handler(app);
};

const Handler = function (app) {
    console.info("pushHandler construc...");
    this.app = app;
    channelService = this.app.get("channelService");
};

const handler = Handler.prototype;

handler.push = function (msg, session, next) {
    let self = this;

    let timeout_id = setTimeout(function () {
        next(null, { code: Code.RequestTimeout, message: "Push message timeout..." });
    }, Config.timeout);

    // <!-- send callback to user who send push msg.
    let sessionInfo: SessionInfo = { id: session.id, frontendId: session.frontendId, uid: session.uid };
    let params = {
        session: sessionInfo
    };
    next(null, { code: Code.OK, data: params });
    clearTimeout(timeout_id);

    pushMessage(self.app, session, msg);
};

function pushMessage(app, session, body: { event: string, message: string, members: string[] | string }) {
    let onlineMembers = new Array<User.UserSession>();
    let offlineMembers = new Array<string>();

    // @ Try to push message to others.
    if (body.members == "*") {
        let onPush = {
            route: Code.sharedEvents.ON_PUSH,
            data: { event: body.event, message: body.message }
        };

        channelService.broadcast("connector", onPush.route, onPush.data);
    }
    else if (body.members instanceof Array) {
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
            console.log("online %s: offline %s: push.members %s:", onlineMembers.length, offlineMembers.length, body.members.length);

            // <!-- push chat data to other members in room.
            let onPush = {
                route: Code.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };

            // <!-- Push new message to online users.
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

                // <!-- Push message to off line users via parse.
                if (!!offlineMembers && offlineMembers.length > 0) {
                    // simplePushNotification(app, session, offlineMembers, room, message.sender);
                }
            });
        });
    }
}