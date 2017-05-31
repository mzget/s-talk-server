"use strict";
const https = require("https");
const http = require("http");
const config_1 = require("../../config/config");
class ParsePushService {
    constructor() {
    }
    queryingInstallations() {
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
    }
    sendPushToChannels(channels, alert) {
        //var data = "{\"where\": { \"channels\": \"RFL\" }, \"data\": { \"alert\": \"The Giants scored a run! The score is now 2-2.\"}}";
        let self = this;
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
                "X-Parse-Application-Id": config_1.Config.ParseApplicationId,
                'X-Parse-REST-API-Key': config_1.Config.ParseRESTAPIKey,
                'Content-Type': "application/json"
            }
        };
        let request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on("data", function (data) {
                console.log("Response: " + data);
                let json = JSON.parse(JSON.stringify(data));
                if (json.results === false) {
                }
                else {
                }
            });
        });
        request.on("error", function (e) {
            console.log("problem with request: " + e.message);
        });
        request.write(postJson);
        request.end();
    }
    sendPushToInstallationsId(installationsId, alert) {
        let self = this;
        if (!installationsId || installationsId.length === 0) {
            return;
        }
        //        where = { "score": { "$in": [1, 3, 5, 7, 9] } }
        let data = {
            "where": {
                "installationId": { "$in": installationsId }
            },
            "data": {
                "alert": alert,
                "content-available": 1
            }
        };
        let postJson = JSON.stringify(data);
        let options = {
            hostname: config_1.Config.pushServer,
            port: 443,
            path: "/1/push",
            method: "POST",
            headers: {
                "X-Parse-Application-Id": config_1.Config.ParseApplicationId,
                "X-Parse-REST-API-Key": config_1.Config.ParseRESTAPIKey,
                "Content-Type": "application/json"
            }
        };
        let request = https.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on("data", function (data) {
                console.log("Response: " + data);
                let json = JSON.parse(JSON.stringify(data));
                if (json.results === false) {
                }
                else {
                }
            });
        });
        request.on("error", function (e) {
            console.log("problem with request: " + e.message);
        });
        request.write(postJson);
        request.end();
    }
    sendPushToTargetDevices(registrationIds, alert) {
        let self = this;
        if (!registrationIds || registrationIds.length === 0) {
            return;
        }
        //        where = { "score": { "$in": [1, 3, 5, 7, 9] } }
        let data = {
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
        let postJson = JSON.stringify(data);
        let options = {
            host: config_1.Config.pushServer,
            port: config_1.Config.pushPort,
            path: config_1.Config.pushPath,
            method: "POST",
            headers: {
                "X-Parse-Application-Id": config_1.Config.ParseApplicationId,
                "X-Parse-REST-API-Key": config_1.Config.ParseRESTAPIKey,
                "X-Parse-Master-Key": config_1.Config.ParseMasterKey,
                "Content-Type": "application/json"
            }
        };
        let request = http.request(options, function (res) {
            console.log("statusCode: ", res.statusCode);
            console.log("headers: ", res.headers);
            res.on("data", function (data) {
                console.log("Response: " + data);
                let json = JSON.parse(JSON.stringify(data));
                if (json.results === false) {
                }
                else {
                }
            });
        });
        request.on("error", function (e) {
            console.log("problem with request: " + e.message);
        });
        request.write(postJson);
        request.end();
    }
}
exports.ParsePushService = ParsePushService;
