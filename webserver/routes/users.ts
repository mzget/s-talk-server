import express = require("express");
const path = require("path");
const router = express.Router();

import { Config, getWebhook, appInfo } from "../../config/config";
import { ApiResponse, ApiStatus } from "../utils/ApiUtils";
import { AccountService } from "../../app/services/accountService";

router.get("/onlineUsers/:appname?", async (req, res, next) => {
    const appname = req.params.appname;

    console.log(req.params);

    const app = req["pomelo"];
    const accountService = app.get("accountService") as AccountService;
    if (!!appname) {
        const info = appInfo(appname);
        if (info) {
            const appId = info.appId;

            const users = await accountService.getOnlineUserByAppId(appId);
            res.status(200).send({ title: appname, count: users.length, users });
        }
        else {
            res.status(ApiStatus.NoContent).send(new ApiResponse(false, "Not found"));
        }
    }
    else {
        const users = await accountService.OnlineUsers();

        res.status(200).send({ title: process.env.npm_package_name, count: users.length, users });
    }
});

router.get("/removeAllKey", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService") as AccountService;
    accountService.removeAllKeys();

    res.status(200).send("removeAllKey");
});

export const UsersRouter = router;