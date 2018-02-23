"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const router = express.Router();
const config_1 = require("../../config/config");
const ApiUtils_1 = require("../utils/ApiUtils");
router.get("/onlineUsers/:appname?", (req, res, next) => __awaiter(this, void 0, void 0, function* () {
    const appname = req.params.appname;
    console.log(req.params);
    const app = req["pomelo"];
    const accountService = app.get("accountService");
    if (!!appname) {
        const info = config_1.appInfo(appname);
        if (info) {
            const appId = info.appId;
            const users = yield accountService.getOnlineUserByAppId(appId);
            res.status(200).send({ title: appname, count: users.length, users });
        }
        else {
            res.status(ApiUtils_1.ApiStatus.NoContent).send(new ApiUtils_1.ApiResponse(false, "Not found"));
        }
    }
    else {
        const users = yield accountService.OnlineUsers();
        res.status(200).send({ title: process.env.npm_package_name, count: users.length, users });
    }
}));
router.get("/removeAllKey", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService");
    accountService.removeAllKeys();
    res.status(200).send("removeAllKey");
});
exports.UsersRouter = router;
