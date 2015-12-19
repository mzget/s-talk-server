var dispatcher = require('../../../util/dispatcher');
var Code = require('../../../../shared/Code');
var TokenService = require('../../../services/tokenService');
var tokenService = new TokenService();
module.exports = function (app) {
    return new Handler(app);
};
var Handler = function (app) {
    this.app = app;
};
var handler = Handler.prototype;
/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */
handler.queryEntry = function (msg, session, next) {
    var uid = msg.uid;
    if (!uid) {
        next(null, {
            code: Code.FAIL, message: "uid is invalid."
        });
        return;
    }
    // get all connectors
    var connectors = this.app.getServersByType('connector');
    if (!connectors || connectors.length === 0) {
        next(null, {
            code: Code.FAIL, message: connectors
        });
        return;
    }
    // select connector
    var res = dispatcher.dispatch(uid, connectors);
    next(null, {
        code: Code.OK,
        host: res.host,
        port: res.clientPort
    });
};
handler.authenGateway = function (msg, session, next) {
    tokenService.ensureAuthorized(msg.token, function (err, res) {
        if (err) {
            console.warn("authenGateway err: ", err);
            next(null, { code: Code.FAIL, message: err });
        }
        else {
            console.log("authenGateway response: ", res);
            next(null, { code: Code.OK, data: res });
        }
    });
};
//# sourceMappingURL=gateHandler.js.map