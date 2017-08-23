"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pomelo = require("pomelo");
const routeUtil_1 = require("./app/util/routeUtil");
const fs = require("fs");
const path = require("path");
const accountService_1 = require("./app/services/accountService");
process.env.TZ = "UTC";
process.env.NODE_ENV = "development";
process.on("uncaughtException", function (err) {
    console.error(" Caught exception: " + err.stack);
});
/**
 * Logging database.
 */
/*
import { InitDatabaseConnection } from "./app/DbClient";
InitDatabaseConnection().then(db => {
    db.stats().then(stat => {
        console.log("api status ready.", stat.db);
    }).catch(err => {
        console.warn("Cannot get db state!", err);
    });
}).catch(err => {
    console.warn("Cannot connect database", err);
});
*/
/**
 * Init app for client.
 */
const app = pomelo.createApp();
app.set("name", "stalk-node-server");
// app configure
app.configure("production|development", function () {
    // filter configures
    //    app.before(pomelo.filters.toobusy(100));
    //    app.filter(pomelo.filters.serial(5000));
    // route configures
    app.route("chat", routeUtil_1.default);
    //    app.set('pushSchedulerConfig', { scheduler: pomelo.pushSchedulers.buffer});
    let _p = path.join(__dirname, "../../chitchats.ga", "/privkey1.pem");
    // let _c = path.join(__dirname, "../../chitchats.ga", "/cert1.pem");
    let _c = path.join(__dirname, "../../chitchats.ga", "/fullchain1.pem");
    const options = {
        key: fs.readFileSync(_p),
        cert: fs.readFileSync(_c),
    };
    app.set("connectorConfig", {
        connector: pomelo.connectors.hybridconnector,
        // connector: pomelo.connectors.sioconnector,
        transports: ["websocket"],
        heartbeatTimeout: 60,
        heartbeatInterval: 25,
        ssl: options
    });
    // @ require monitor in pomelo@2x
    //   app.set('monitorConfig',
    //     {
    //       monitor : pomelo.monitors.zookeepermonitor,
    //       servers: "git.animation-genius.com:2181"
    //     });
});
// Configure for auth server
app.configure("production|development", "auth", function () {
    console.log("start auth server");
    app.set("accountService", new accountService_1.AccountService(app));
});
app.configure("production|development", "chat", function () {
    console.log("start chat server");
});
// start app
app.start();
