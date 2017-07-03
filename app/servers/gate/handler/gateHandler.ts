import Code from "../../../../shared/Code";
import TokenService from "../../../services/tokenService";
import dispatcher from "../../../util/dispatcher";
import { Config } from "../../../../config/config";
import Joi = require("joi");
Joi["objectId"] = require("joi-objectid")(Joi);
const tokenService = new TokenService();

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
		"x-api-key": Joi.string().required(),
		"__route__": Joi.any()
	};

	const result = Joi.validate(msg, schema);
	if (result.error) {
		return next(null, { code: Code.FAIL, message: result.error });
	}

	let uid = msg["uid"];
	let apiKey = msg["x-api-key"];

	if (apiKey != Config.apiKey) {
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
