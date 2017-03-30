const pomelo = require('pomelo');
import routeUtil from './app/util/routeUtil';
//var HttpDebug = require('./app/util/httpServer');
//var netserver = require('./app/util/netServer');
import mongodb = require('mongodb');
import { AccountService } from './app/services/accountService';

process.env.TZ = 'UTC';
process.env.NODE_ENV = 'development';
process.on('uncaughtException', function (err) {
    console.error(' Caught exception: ' + err.stack);
});

import webConfig = require('./config/config');

/**
 * Init app for client.
 */
const app = pomelo.createApp();
app.set('name', 'stalk-node-server');

// app configure
app.configure('production|development', function () {
    // filter configures
    //    app.before(pomelo.filters.toobusy(100));
    //    app.filter(pomelo.filters.serial(5000));

    // route configures
    app.route('chat', routeUtil);

    //    app.set('pushSchedulerConfig', { scheduler: pomelo.pushSchedulers.buffer});

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

mongodb.MongoClient.connect(webConfig.Config.chatDB).then(db => {
    db.stats(function (err, stat) {
        console.log("api status ready.", stat.db);
        db.close();
    });
}).catch(err => {
    console.warn("Cannot connect database", err);
});

// start app
app.start();