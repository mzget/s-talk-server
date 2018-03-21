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
router.get("/appIds", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, appIds: config_1.Config.appIds });
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
exports.DefaultRouter = router;
