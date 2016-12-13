"use strict";
var https = require("https");
var http = require("http");
var config_1 = require("../../config/config");
var ParsePushService = (function () {
    function ParsePushService() {
    }
    ParsePushService.prototype.queryingInstallations = function () {
        var options = {
            hostname: config_1.Config.pushServer,
            port: 443,
            path: "/1/installations",
            method: 'GET',
            headers: {
                'X-Parse-Application-Id': config_1.Config.ParseApplicationId,
                'X-Parse-Master-Key': config_1.Config.ParseMasterKey
            }
        };
        var req = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                //var json = JSON.parse(data);
                //if (json.results === false) {
                //}
                //else {
                //}
            });
        });
        req.end();
    };
    ParsePushService.prototype.sendPushToChannels = function (channels, alert) {
        //var data = "{\"where\": { \"channels\": \"RFL\" }, \"data\": { \"alert\": \"The Giants scored a run! The score is now 2-2.\"}}";
        var self = this;
        var data = {
            "where": {
                "channels": channels
            },
            "data": {
                "alert": alert
            }
        };
        var postJson = JSON.stringify(data);
        var options = {
            hostname: config_1.Config.pushServer,
            port: 443,
            path: "/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': config_1.Config.ParseApplicationId,
                'X-Parse-REST-API-Key': config_1.Config.ParseRESTAPIKey,
                'Content-Type': 'application/json'
            }
        };
        var request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                var json = JSON.parse(JSON.stringify(data));
                if (json.results === false) {
                }
                else {
                }
            });
        });
        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        request.write(postJson);
        request.end();
    };
    ParsePushService.prototype.sendPushToInstallationsId = function (installationsId, alert) {
        var self = this;
        if (!installationsId || installationsId.length === 0) {
            return;
        }
        //        where = { "score": { "$in": [1, 3, 5, 7, 9] } }
        var data = {
            "where": {
                "installationId": { "$in": installationsId }
            },
            "data": {
                "alert": alert,
                "content-available": 1
            }
        };
        var postJson = JSON.stringify(data);
        var options = {
            hostname: config_1.Config.pushServer,
            port: 443,
            path: "/1/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': config_1.Config.ParseApplicationId,
                'X-Parse-REST-API-Key': config_1.Config.ParseRESTAPIKey,
                'Content-Type': 'application/json'
            }
        };
        var request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                var json = JSON.parse(JSON.stringify(data));
                if (json.results === false) {
                }
                else {
                }
            });
        });
        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        request.write(postJson);
        request.end();
    };
    ParsePushService.prototype.sendPushToTargetDevices = function (registrationIds, alert) {
        var self = this;
        if (!registrationIds || registrationIds.length === 0) {
            return;
        }
        //        where = { "score": { "$in": [1, 3, 5, 7, 9] } }
        var data = {
            "where": {
                "deviceToken": { "$in": registrationIds }
            },
            "data": {
                "alert": alert,
                "content-available": 1,
                "sound": "default",
                "badge": "Increment"
            }
        };
        var postJson = JSON.stringify(data);
        var options = {
            host: config_1.Config.pushServer,
            port: config_1.Config.pushPort,
            path: config_1.Config.pushPath,
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': config_1.Config.ParseApplicationId,
                'X-Parse-REST-API-Key': config_1.Config.ParseRESTAPIKey,
                'X-Parse-Master-Key': config_1.Config.ParseMasterKey,
                'Content-Type': 'application/json'
            }
        };
        var request = http.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                var json = JSON.parse(JSON.stringify(data));
                if (json.results === false) {
                }
                else {
                }
            });
        });
        request.on('error', function (e) {
            console.log('problem with request: ' + e.message);
        });
        request.write(postJson);
        request.end();
    };
    return ParsePushService;
}());
exports.ParsePushService = ParsePushService;
