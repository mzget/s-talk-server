"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const router = express.Router();
/* GET home page. */
router.get("/", (req, res, next) => {
    res.status(200).send({ title: process.env.npm_package_name, env: process.env.NODE_ENV, version: process.env.npm_package_version });
});
exports.DefaultRouter = router;
