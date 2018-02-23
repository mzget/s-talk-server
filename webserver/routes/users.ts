import express = require("express");
const path = require("path");
const router = express.Router();

import { Config, getWebhook } from "../../config/config";
import { AccountService } from "../../app/services/accountService";

router.get("/onlineUsers", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService") as AccountService;
    console.log(accountService.OnlineUsers());

    res.status(200).send({ title: process.env.npm_package_name });
});

router.get("/removeAllKey", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService") as AccountService;
    accountService.removeAllKeys();

    res.status(200).send("removeAllKey");
});

export const UsersRouter = router;