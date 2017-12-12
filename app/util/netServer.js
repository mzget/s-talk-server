"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require('net');
var fs = require('fs');
var Db = require('mongodb').Db, MongoClient = require('mongodb').MongoClient, Server = require('mongodb').Server, ReplSetServers = require('mongodb').ReplSetServers, ObjectID = require('mongodb').ObjectID, Binary = require('mongodb').Binary, GridStore = require('mongodb').GridStore, Grid = require('mongodb').Grid, Code = require('mongodb').Code, BSON = require('mongodb').BSON, assert = require('assert');
class NetServer {
    constructor() { }
    Start() {
        console.log("NetServer start.");
        http.listen(3000, function () {
            console.log('listening on *:3000');
        });
    }
    Demo() {
        var server = net.createServer(function (socket) {
            console.log("connected: ", socket);
            var buffer = null;
            socket.on('data', function (data) {
                console.log("data received:", data.toString());
                buffer = data;
                socket.write(data);
            });
            socket.on("end", function (data) {
                var file = { body: buffer, createTime: new Date() };
            });
            socket.on('onopen', function (data) {
                console.log("onopen:", data.toString());
            });
            socket.emit('onopen', "onopen");
            socket.write('hello\r\n');
            socket.pipe(socket);
            //            websocket.onopen = function (evt) {
            //                console.log("onOpen(evt)");
            //};
            //            websocket.onclose = function (evt) {
            //                console.log("onClose(evt)");
            //};
            //            websocket.onmessage = function (evt) {
            //                console.log("onMessage(evt)");
            //};
            //            websocket.onerror = function (evt) {
            //                console.log("onError(evt)");
            //};
        });
        server.listen(port, '127.0.0.1');
    }
}
exports.NetServer = NetServer;
