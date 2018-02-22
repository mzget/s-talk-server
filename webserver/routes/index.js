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
exports.DefaultRouter = router;
