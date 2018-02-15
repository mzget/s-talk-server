const pomelo = require("pomelo");
import routeUtil from "./app/util/routeUtil";
import mongodb = require("mongodb");
import * as fs from "fs";
import * as path from "path";
import { AccountService } from "./app/services/accountService";

process.env.TZ = "UTC";
process.env.NODE_ENV = "production";
process.on("uncaughtException", (err: any) => {
    console.error(" Caught exception: " + err.stack);
});

import { Config } from "./config/config";
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
app.configure("development", () => {
    // filter configures
    //    app.before(pomelo.filters.toobusy(100));
    //    app.filter(pomelo.filters.serial(5000));

    // route configures
    app.route("chat", routeUtil);

    //    app.set('pushSchedulerConfig', { scheduler: pomelo.pushSchedulers.buffer});
    app.set("connectorConfig", {
        connector: pomelo.connectors.hybridconnector,
        // connector: pomelo.connectors.sioconnector,
        transports: ["websocket"],   // websocket, polling
        heartbeatTimeout: 60,
        heartbeatInterval: 25,
    });

    // @ require monitor in pomelo@2x
    //   app.set('monitorConfig',
    //     {
    //       monitor : pomelo.monitors.zookeepermonitor,
    //       servers: "git.animation-genius.com:2181"
    //     });
});
app.configure("production", () => {
    // filter configures
    //    app.before(pomelo.filters.toobusy(100));
    //    app.filter(pomelo.filters.serial(5000));

    // route configures
    app.route("chat", routeUtil);

    //    app.set('pushSchedulerConfig', { scheduler: pomelo.pushSchedulers.buffer});

    // let certsFolder = path.join(__dirname, "/certs");
    // fs.readdirSync(certsFolder).forEach(file => {
    //     console.log(file);
    // });
    const privateKey = path.join("/etc/letsencrypt/live/chitchats.ga", "/privkey.pem");
    const cert = path.join("/etc/letsencrypt/live/chitchats.ga", "/cert.pem");
    const chain = path.join("/etc/letsencrypt/live/chitchats.ga", "/chain.pem");
    const options = {
        cert: fs.readFileSync(cert),
        key: fs.readFileSync(privateKey),

        // This is necessary only if using the client certificate authentication.
        // requestCert: true,
        ca: [fs.readFileSync(chain)],
    };
    app.set("connectorConfig", {
        connector: pomelo.connectors.hybridconnector,
        // connector: pomelo.connectors.sioconnector,
        transports: ["websocket"],   // websocket, polling
        heartbeatTimeout: 60,
        heartbeatInterval: 25,
        ssl: options,
    });

    // @ require monitor in pomelo@2x
    //   app.set('monitorConfig',
    //     {
    //       monitor : pomelo.monitors.zookeepermonitor,
    //       servers: "git.animation-genius.com:2181"
    //     });
});

// Configure for auth server
app.configure("production|development", "auth", () => {
    console.log("start auth server");
    app.set("accountService", new AccountService(app));
});

app.configure("production|development", "chat", () => {
    console.log("start chat server");
});

// start app
app.start();
