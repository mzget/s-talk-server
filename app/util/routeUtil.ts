import dispatcher from './dispatcher';

/**
 * routeUtil
 */
const chatRoute = function (session, msg, app, cb) {
	let chatServers = app.getServersByType('chat');
	let rid = session.get('rid') || 'global';

	if (!chatServers || chatServers.length === 0) {
		cb(new Error('can not find chat servers.'));
		return;
	}

	let res = dispatcher(rid, chatServers);

	cb(null, res.id);
};
export default chatRoute;