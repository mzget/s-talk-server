"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jwt = require("jsonwebtoken");
var config_1 = require("../../config/config");
var TokenService = (function () {
    //	private DEFAULT_EXPIRE = 24 * 60 * 365;	// default session expire time: 24 hours
    function TokenService() {
        this.secret = "";
        this.secret = config_1.Config.session.secret;
        this.expire = config_1.Config.session.expire;
    }
    TokenService.prototype.signToken = function (signObj, callback) {
        jwt.sign(signObj, this.secret, {}, callback);
    };
    /**
     * reture token decoded.
     */
    TokenService.prototype.ensureAuthorized = function (token, callback) {
        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, this.secret, function (err, decoded) {
                if (err) {
                    callback(err, { success: false, message: 'Failed to authenticate token.' });
                }
                else {
                    // if everything is good, save to request for use in other routes
                    callback(null, { success: true, decoded: decoded });
                }
            });
        }
        else {
            // if there is no token
            // return an error
            callback(new Error("There is no token provide."), {
                success: false,
                message: 'No token provided.'
            });
        }
    };
    return TokenService;
}());
exports.default = TokenService;
