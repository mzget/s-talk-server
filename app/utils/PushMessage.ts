import async = require("async");

import { UserSession } from "../model/User";
import Code from "../../shared/Code";
import { X_APP_ID } from "../Const";

import { AccountService } from "../services/accountService";
import { getUsersGroup } from "../util/ChannelHelper";

export interface IPushMessage {
    event: string;
    message: string;
    members: string[] | string;
}

export function pushMessage(app, session, body: IPushMessage) {
    return async (accountService: AccountService) => {
        // @ Try to push message to others.
        if (body.members == "*") {
            let param = {
                route: Code.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };

            let userSessions = await accountService.getOnlineUserByAppId(session.get(X_APP_ID)) as Array<UserSession>;
            let uids = getUsersGroup(userSessions);
            return { param, uids };

            // channelService.broadcast("connector", onPush.route, onPush.data);
        }
        else if (body.members instanceof Array) {
            const waitForMembers = new Promise((resolve: (data: { onlines: UserSession[], offlines: string[] }) => void, reject) => {

                let onlineMembers = new Array<UserSession>();
                let offlineMembers = new Array<string>();

                async.map((body.members as string[]), (item, resultCallback) => {
                    accountService.getOnlineUser(item).then((user) => {
                        onlineMembers.push(user);
                        resultCallback(undefined, item);
                    }).catch(err => {
                        offlineMembers.push(item);
                        resultCallback(undefined, item);
                    });
                }, (err, results) => {
                    console.log("online %s: offline %s: push.members %s:", onlineMembers.length, offlineMembers.length, body.members.length);

                    resolve({ onlines: onlineMembers, offlines: offlineMembers });
                });
            });

            const { onlines, offlines } = await waitForMembers;
            // <!-- push chat data to other members in room.
            let param = {
                route: Code.sharedEvents.ON_PUSH,
                data: { event: body.event, message: body.message }
            };

            // <!-- Push new message to online users.
            let uids = onlines.map(val => {
                return { uid: val.uid, sid: val.serverId };
            });
            // <!-- Push message to off line users via push-notification.
            if (!!offlines && offlines.length > 0) {
                // simplePushNotification(app, session, offlineMembers, room, message.sender);
            }

            return { param, uids };
        }
    }
}