import dispatcher from "./dispatcher";

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

  const res = dispatcher(rid, chatServers);

  cb(null, res.id);
};

export default chatRoute;
