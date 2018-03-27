import Code from "../../../../shared/Code";
import TokenService from "../../../services/tokenService";
import dispatcher from "../../../utils/dispatcher";
import { Config, appInfo } from "../../../../config/config";
import { X_API_KEY, X_APP_ID } from "../../../Const";
import Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);

import withValidation from "../../../utils/ValidationSchema";

const tokenService = new TokenService();

module.exports = function (app) {
	return new GateHandler(app);
};

class GateHandler {
	app: any;

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

		let schema = withValidation({
			"uid": Joi.string().required(),
		});

		const result = Joi.validate(msg, schema);
		if (result.error) {
			return next(null, { code: Code.FAIL, message: result.error });
		}

		let uid = msg["uid"];
		let apiKey = msg[X_API_KEY];
		let appId = msg[X_APP_ID];

		let app = appInfo(appId);
		if (!app) {
			return next(null, { code: Code.FAIL, message: "Not found application registered" });
		}
		if (app.apikey != apiKey) {
			return next(null, { code: Code.FAIL, message: "authorized key fail." });
		}

		// get all connectors
		let connectors = this.app.getServersByType("connector");
		if (!connectors || connectors.length === 0) {
			next(null, { code: Code.FAIL, message: connectors });
			return;
		}
		// select connector
		let res = dispatcher(uid, connectors);
		next(null, { code: Code.OK, host: res.host, port: res.clientPort });
	};

	authenGateway(msg, session, next) {
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
}
