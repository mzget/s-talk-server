"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Code_1 = require("../../../../shared/Code");
const tokenService_1 = require("../../../services/tokenService");
const dispatcher_1 = require("../../../util/dispatcher");
const config_1 = require("../../../../config/config");
const Const_1 = require("../../../Const");
const Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);
const R = require("ramda");
const tokenService = new tokenService_1.default();
module.exports = function (app) {
    return new Handler(app);
};
const Handler = function (app) {
    console.log("gateHandler construc..");
    this.app = app;
};
const handler = Handler.prototype;
/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */
handler.queryEntry = function (msg, session, next) {
    let schema = {
        "uid": Joi.string().required(),
        X_API_KEY: Joi.string().required(),
        "__route__": Joi.any()
    };
    const result = Joi.validate(msg, schema);
    if (result.error) {
        return next(null, { code: Code_1.default.FAIL, message: result.error });
    }
    let uid = msg["uid"];
    let apiKey = msg[Const_1.X_API_KEY];
    let pass = R.contains(apiKey, config_1.Config.apiKeys);
    if (pass == false) {
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
};
handler.authenGateway = function (msg, session, next) {
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
};
