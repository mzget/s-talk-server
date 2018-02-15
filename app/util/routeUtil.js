"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dispatcher_1 = require("./dispatcher");
/**
 * routeUtil
 */
const chatRoute = (session, msg, app, cb) => {
    const chatServers = app.getServersByType("chat");
    const rid = session.get("rid") || "global";
    if (!chatServers || chatServers.length === 0) {
        cb(new Error("can not find chat servers."));
        return;
    }
    const res = dispatcher_1.default(rid, chatServers);
    cb(null, res.id);
};
exports.default = chatRoute;
