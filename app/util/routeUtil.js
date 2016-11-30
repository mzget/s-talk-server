"use strict";
var dispatcher_1 = require('./dispatcher');
/**
 * routeUtil
 */
var chatRoute = function (session, msg, app, cb) {
    var chatServers = app.getServersByType('chat');
    var rid = session.get('rid') || 'global';
    if (!chatServers || chatServers.length === 0) {
        cb(new Error('can not find chat servers.'));
        return;
    }
    var res = dispatcher_1.default(rid, chatServers);
    cb(null, res.id);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = chatRoute;
