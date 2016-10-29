"use strict";
const Code_1 = require('../../../../shared/Code');
const tokenService_1 = require('../../../services/tokenService');
const dispatcher_1 = require('../../../util/dispatcher');
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
    let uid = msg.uid;
    if (!uid) {
        next(null, {
            code: Code_1.default.FAIL, message: "uid is invalid."
        });
        return;
    }
    // get all connectors
    let connectors = this.app.getServersByType('connector');
    if (!connectors || connectors.length === 0) {
        next(null, {
            code: Code_1.default.FAIL, message: connectors
        });
        return;
    }
    // select connector
    let res = dispatcher_1.default(uid, connectors);
    next(null, {
        code: Code_1.default.OK,
        host: res.host,
        port: res.clientPort
    });
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
