import express = require("express");
const path = require("path");
const router = express.Router();

import { Config, getWebhook } from "../../config/config";
import { AccountService } from "../../app/services/accountService";

/* GET home page. */
router.get("/", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, env: process.env.NODE_ENV, version: process.env.npm_package_version });
});

router.get("/apikeys", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, keys: Config.appIds });
});

router.get("/app/:key", (req, res, next) => {
    const key = req.params.key;
    const appInfo = getWebhook(key);
    if (appInfo) {
        res.status(200).send({ title: process.env.npm_package_name, appInfo });
    }
    else {
        res.status(200).send({ title: process.env.npm_package_name, message: `not found : ${key}` });
    }
});

export const DefaultRouter = router;
