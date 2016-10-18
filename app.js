/// <reference path="./typings/index.d.ts" />
"use strict";
var pomelo = require('pomelo');
var routeUtil = require('./app/util/routeUtil');
var accountService_1 = require('./app/services/accountService');
//var HttpDebug = require('./app/util/httpServer');
//var netserver = require('./app/util/netServer');
/**
 * Init app for client.
 */
var app = pomelo.createApp();
app.set('name', 'stalk-node-server');
// app configure
app.configure('production|development', function () {
    // filter configures
    //    app.before(pomelo.filters.toobusy(100));
    //    app.filter(pomelo.filters.serial(5000));
    // route configures
    app.route('chat', routeUtil.chat);
    //    app.set('pushSchedulerConfig', { scheduler: pomelo.pushSchedulers.buffer});
    // filter configures
    // app.filter(pomelo.filters.timeout(webConfig.timeout));
    app.set('connectorConfig', {
        connector: pomelo.connectors.hybridconnector,
        // connector : pomelo.connectors.sioconnector,
        //websocket, polling
        transports: ['websocket'],
        heartbeatTimeout: 60,
        heartbeatInterval: 25
    });
    //@ require monitor in pomelo@2x
    //   app.set('monitorConfig',
    //     {
    //       monitor : pomelo.monitors.zookeepermonitor,
    //       servers: "git.animation-genius.com:2181"
    //     });
});
// Configure for auth server
app.configure('production|development', 'auth', function () {
    app.set('accountService', new accountService_1.AccountService(app));
});
app.configure('production|development', 'chat', function () {
});
//app.configure('production|development', 'master', function () {
//var http = new HttpDebug();
//http.start();
//var net = new netserver.NetServer();
//net.Start();
//});
// start app
process.env.TZ = 'UTC';
process.env.NODE_ENV = 'production';
process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});
app.start();
