var http = require('http');
var port = 1337;
var timeout = 100000;
var fs = require('fs');
var path = require('path');
var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"
};
module.exports = function (app, opts) {
    return new HttpDebug(app, opts);
};
var HttpDebug = function (app, opts) {
    this.app = app;
    this.name = '__httpdebug__';
    this.userDicPath = null;
    this.opts = opts;
};
var server = null;
HttpDebug.prototype.start = function (cb) {
    console.log("HttpDebug.prototype.start");
    httpStart();
};
var httpStop = function () {
    server.close(function () {
        console.log(' http server stop port ' + port);
        server = null;
    });
};
var httpStart = function () {
    console.log("httpStart");
    server = http.createServer(function (req, res) {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        if (req.method === "GET") {
            var url = require('url').parse(req.url, true);
            return res.end("hello world");
        }
        ;
        if (req.method == 'POST') {
            var body = '';
            req.on('data', function (data) {
                body += data;
            });
            req.on('end', function () {
                var result = 'ok';
                try {
                }
                catch (ex) {
                    result = ex.stack;
                }
                res.writeHead(200, "OK", { 'Content-Type': 'text/html' });
                return res.end(JSON.stringify(result));
            });
        }
    });
    server.listen(port);
    server.addListener("connection", function (socket) {
        //socket.setTimeout(timeout);
        console.log("Echo server: ", socket);
    });
    console.log('Http server start at port ' + port);
};
process.on('SIGUSR1', function () {
    if (server === null) {
        httpStart();
    }
    else {
        httpStop();
    }
});
