/// <reference path="../../typings/tsd.d.ts" />
var https = require('https');
var MWebConfig = require('../../config/WebConfig');
var webConfig = new MWebConfig.WebConfig();
var configJson = require('../../config/webConfig.json');
var ParsePushService = (function () {
    function ParsePushService() {
        webConfig = JSON.parse(JSON.stringify(configJson));
    }
    ParsePushService.prototype.queryingInstallations = function () {
        var options = {
            hostname: webConfig.pushServer,
            port: 443,
            path: "/1/installations",
            method: 'GET',
            headers: {
                'X-Parse-Application-Id': webConfig.ParseApplicationId,
                'X-Parse-Master-Key': webConfig.ParseMasterKey
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
            hostname: webConfig.pushServer,
            port: 443,
            path: "/1/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': webConfig.ParseApplicationId,
                'X-Parse-REST-API-Key': webConfig.ParseRESTAPIKey,
                'Content-Type': 'application/json'
            }
        };
        var request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                var json = JSON.parse(data);
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
            hostname: webConfig.pushServer,
            port: 443,
            path: "/1/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': webConfig.ParseApplicationId,
                'X-Parse-REST-API-Key': webConfig.ParseRESTAPIKey,
                'Content-Type': 'application/json'
            }
        };
        var request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                var json = JSON.parse(data);
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
            hostname: webConfig.pushServer,
            port: 443,
            path: "/1/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': webConfig.ParseApplicationId,
                'X-Parse-REST-API-Key': webConfig.ParseRESTAPIKey,
                'Content-Type': 'application/json'
            }
        };
        var request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on('data', function (data) {
                console.log('Response: ' + data);
                var json = JSON.parse(data);
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
})();
exports.ParsePushService = ParsePushService;
