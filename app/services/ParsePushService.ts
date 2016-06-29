import https = require('https');
import MWebConfig = require('../../config/WebConfig');

const configJson = require('../../config/webConfig.json');

export class ParsePushService {

    webConfig = new MWebConfig.WebConfig();

    constructor() {
        this.webConfig = JSON.parse(JSON.stringify(configJson));
    }

    public queryingInstallations() {
        var options = {
            hostname: this.webConfig.pushServer,
            port: 443,
            path: "/1/installations",
            method: 'GET',
            headers: {
                'X-Parse-Application-Id': this.webConfig.ParseApplicationId,
                'X-Parse-Master-Key': this.webConfig.ParseMasterKey
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

    public sendPushToChannels(channels: string[], alert: string) {
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
            hostname: self.webConfig.pushServer,
            port: 443,
            path: "/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': self.webConfig.ParseApplicationId,
                'X-Parse-REST-API-Key': self.webConfig.ParseRESTAPIKey,
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
    }

    public sendPushToInstallationsId(installationsId: string[], alert: string) {
        let self = this;
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
            hostname: self.webConfig.pushServer,
            port: 443,
            path: "/1/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': self.webConfig.ParseApplicationId,
                'X-Parse-REST-API-Key': self.webConfig.ParseRESTAPIKey,
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
    }

    public sendPushToTargetDevices(registrationIds: string[], alert: string) {
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
            hostname: self.webConfig.pushServer,
            // port: 443,
            // path: "/push",
            method: 'POST',
            headers: {
                'X-Parse-Application-Id': self.webConfig.ParseApplicationId,
                'X-Parse-REST-API-Key': self.webConfig.ParseRESTAPIKey,
                'X-Parse-Master-Key': self.webConfig.ParseMasterKey,
                'Content-Type': 'application/json'
            }
        };
        let request = https.request(options, function (res) {
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
    }
}