"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const router = express.Router();
const config_1 = require("../../config/config");
/* GET home page. */
router.get("/", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, env: process.env.NODE_ENV, version: process.env.npm_package_version });
});
router.get("/apikeys", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, keys: config_1.Config.apiKeys });
});
router.get("/app/:key", (req, res, next) => {
    const key = req.params.key;
    const appInfo = config_1.getWebhook(key);
    if (appInfo) {
        res.status(200).send({ title: process.env.npm_package_name, appInfo });
    }
    else {
        res.status(200).send({ title: process.env.npm_package_name, message: `not found : ${key}` });
    }
});
router.get("/onlineUsers", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService");
    console.log(accountService.OnlineUsers());
    res.status(200).send({ title: process.env.npm_package_name });
});
exports.DefaultRouter = router;
