/// <reference path="../../typings/index.d.ts" />

import jwt = require('jsonwebtoken');
const sessionConfig = require('../../config/session.json');

export default class TokenService {
	private secret = "";
	private DEFAULT_SECRET = 'ahoostudio_session_secret';
	private expire: string | number;
//	private DEFAULT_EXPIRE = 24 * 60 * 365;	// default session expire time: 24 hours
	
	constructor() {
    	this.secret = sessionConfig.secret || this.DEFAULT_SECRET;
        this.expire = sessionConfig.expire; // || this.DEFAULT_EXPIRE;
	}
	
	public signToken(signObj , callback:(err, encode) => void) {
		jwt.sign(signObj, this.secret, { }, callback);
	}
	
	/**
	 * reture token decoded.
	 */
    public ensureAuthorized(token, callback) {
		 // decode token
	    if (token) {
	        // verifies secret and checks exp
	        jwt.verify(token, this.secret, function (err, decoded) {
	            if (err) {
					callback(err, { success: false, message: 'Failed to authenticate token.' });
	            } 
				else {
	                // if everything is good, save to request for use in other routes
					callback(null, { success: true, decoded: decoded});
	            }
	        });
	
	    } else {
	        // if there is no token
	        // return an error
	        callback(new Error("There is no token provide."),{
	            success: false,
	            message: 'No token provided.'
	        });
	    }
	}
}