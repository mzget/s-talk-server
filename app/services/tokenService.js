"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jwt = require("jsonwebtoken");
const config_1 = require("../../config/config");
class TokenService {
    // 	private DEFAULT_EXPIRE = 24 * 60 * 365;	// default session expire time: 24 hours
    constructor() {
        this.secret = "";
        this.secret = config_1.Config.session.secret;
        this.expire = config_1.Config.session.expire;
    }
    signToken(signObj, callback) {
        jwt.sign(signObj, this.secret, { expiresIn: this.expire }, callback);
    }
    /**
     * reture token decoded.
     */
    ensureAuthorized(token, callback) {
        // decode token
        if (token) {
            // verifies secret and checks exp
            jwt.verify(token, this.secret, function (err, decoded) {
                if (err) {
                    callback(err, null);
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
            callback(new Error("There is no token provide."), null);
        }
    }
}
exports.default = TokenService;
