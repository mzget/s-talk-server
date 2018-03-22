import async = require("async");

import ChannelService from "../../../util/ChannelService";
import { getUsersGroup } from "../../../util/ChannelHelper";
import Code, { SessionInfo } from "../../../../shared/Code";
import { X_APP_ID } from "../../../Const";
import User, { UserSession } from "../../../model/User";
import * as Room from "../../../model/Room";
import { Config } from "../../../../config/config";
import withValidation from "../../../utils/ValidationSchema";
import { AccountService } from "../../../services/accountService";
import { pushMessage, IPushMessage, withChannelService } from "../../../utils/PushMessage";
import Joi = require("joi");
let channelService: ChannelService;
let accountService: AccountService;


module.exports = function (app) {
    return new PushHandler(app);
};

class PushHandler {
    app: any;

    constructor(app: any) {
        console.info("pushHandler construc...");

        this.app = app;
        channelService = this.app.get("channelService");
        accountService = this.app.get("accountService");
    }

    push(msg, session, next) {
        let self = this;
        let schema = withValidation({
            payload: Joi.object({
                event: Joi.string().required(),
                message: Joi.string().required(),
                members: Joi.any(),
            }).required(),
        });

        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code.FAIL, message: result.error });
        }

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

        pushMessage(self.app, session, msg.payload)(accountService).then(data => {
            if (data) {
                channelService.pushMessageByUids(data.param.route, data.param.data, data.uids);
            } else {
                console.warn("No push data");
            }
        }).catch(console.warn);
    }
}
