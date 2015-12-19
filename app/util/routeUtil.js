var exp = module.exports;
var dispatcher = require('./dispatcher');

exp.chat = function(session, msg, app, cb) {
	var chatServers = app.getServersByType('chat');
	var rid = session.get('rid') || 'global';

	if(!chatServers || chatServers.length === 0) {
		cb(new Error('can not find chat servers.'));
		return;
	}

	var res = dispatcher.dispatch(rid, chatServers);

	cb(null, res.id);
};