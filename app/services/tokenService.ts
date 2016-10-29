import jwt = require('jsonwebtoken');
import { Config } from '../../config/config';

export default class TokenService {
	private secret = "";
	private expire: string | number;
	//	private DEFAULT_EXPIRE = 24 * 60 * 365;	// default session expire time: 24 hours

	constructor() {
		this.secret = Config.session.secret;
		this.expire = Config.session.expire; // || this.DEFAULT_EXPIRE;
	}

	public signToken(signObj, callback: (err, encode) => void) {
		jwt.sign(signObj, this.secret, {}, callback);
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
					callback(null, { success: true, decoded: decoded });
				}
			});

		} else {
			// if there is no token
			// return an error
			callback(new Error("There is no token provide."), {
				success: false,
				message: 'No token provided.'
			});
		}
	}
}