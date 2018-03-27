"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Code_1 = require("../../../../shared/Code");
const tokenService_1 = require("../../../services/tokenService");
const dispatcher_1 = require("../../../utils/dispatcher");
const config_1 = require("../../../../config/config");
const Const_1 = require("../../../Const");
const Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);
const ValidationSchema_1 = require("../../../utils/ValidationSchema");
const tokenService = new tokenService_1.default();
module.exports = function (app) {
    return new GateHandler(app);
};
class GateHandler {
    constructor(app) {
        this.app = app;
    }
    /**
     * Gate handler that dispatch user to connectors.
     *
     * @param {Object} msg message from client
     * @param {Object} session
     * @param {Function} next next stemp callback
     *
     */
    queryEntry(msg, session, next) {
        let schema = ValidationSchema_1.default({
            "uid": Joi.string().required(),
        });
        const result = Joi.validate(msg, schema);
        if (result.error) {
            return next(null, { code: Code_1.default.FAIL, message: result.error });
        }
        let uid = msg["uid"];
        let apiKey = msg[Const_1.X_API_KEY];
        let appId = msg[Const_1.X_APP_ID];
        let app = config_1.appInfo(appId);
        if (!app) {
            return next(null, { code: Code_1.default.FAIL, message: "Not found application registered" });
        }
        if (app.apikey != apiKey) {
            return next(null, { code: Code_1.default.FAIL, message: "authorized key fail." });
        }
        // get all connectors
        let connectors = this.app.getServersByType("connector");
        if (!connectors || connectors.length === 0) {
            next(null, { code: Code_1.default.FAIL, message: connectors });
            return;
        }
        // select connector
        let res = dispatcher_1.default(uid, connectors);
        next(null, { code: Code_1.default.OK, host: res.host, port: res.clientPort });
    }
    ;
    authenGateway(msg, session, next) {
        tokenService.ensureAuthorized(msg.token, function (err, res) {
            if (err) {
                console.warn("authenGateway err: ", err);
                next(null, { code: Code_1.default.FAIL, message: err });
            }
            else {
                console.log("authenGateway response: ", res);
                next(null, { code: Code_1.default.OK, data: res });
            }
        });
    }
    ;
}
