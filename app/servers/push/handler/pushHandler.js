"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Code_1 = require("../../../../shared/Code");
const config_1 = require("../../../../config/config");
const ValidationSchema_1 = require("../../../utils/ValidationSchema");
const PushMessage_1 = require("../../../utils/PushMessage");
const Joi = require("joi");
module.exports = function (app) {
    return new PushHandler(app);
};
class PushHandler {
    constructor(app) {
        this.app = app;
        this.channelService = this.app.get("channelService");
        this.accountService = this.app.get("accountService");
    }
    push(msg, session, next) {
        let self = this;
        let schema = ValidationSchema_1.default({
            payload: Joi.object({
                event: Joi.string().required(),
                message: Joi.string().required(),
                members: Joi.any(),
            }).required(),
        });
        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code_1.default.FAIL, message: result.error });
        }
        let timeout_id = setTimeout(function () {
            next(null, { code: Code_1.default.RequestTimeout, message: "Push message timeout..." });
        }, config_1.Config.timeout);
        // <!-- send callback to user who send push msg.
        let sessionInfo = { id: session.id, frontendId: session.frontendId, uid: session.uid };
        let params = {
            session: sessionInfo
        };
        next(null, { code: Code_1.default.OK, data: params });
        clearTimeout(timeout_id);
        PushMessage_1.pushMessage(self.app, session, msg.payload)(this.accountService).then(data => {
            if (data) {
                this.channelService.pushMessageByUids(data.param.route, data.param.data, data.uids);
            }
            else {
                console.warn("No push data");
            }
        }).catch(console.warn);
    }
}
