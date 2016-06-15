/// <reference path="./typings/tsd.d.ts" />

const pomelo = require('pomelo');
const routeUtil = require('./app/util/routeUtil');
import { AccountService } from './app/services/accountService';
//var HttpDebug = require('./app/util/httpServer');
//var netserver = require('./app/util/netServer');
const webConfig = require('./config/webConfig');

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
    app.filter(pomelo.filters.timeout(webConfig.timeout));
});

// Configure for auth server
app.configure('production|development', 'auth', function () {
    app.set('accountService', new AccountService(app));
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