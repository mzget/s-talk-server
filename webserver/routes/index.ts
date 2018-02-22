import express = require("express");
const path = require("path");
const router = express.Router();

import { Config } from "../../config/config";

/* GET home page. */
router.get("/", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, env: process.env.NODE_ENV, version: process.env.npm_package_version });
});

router.get("/apikeys", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, keys: Config.apiKeys });
});

export const DefaultRouter = router;
