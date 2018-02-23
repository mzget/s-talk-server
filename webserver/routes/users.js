"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const router = express.Router();
router.get("/onlineUsers", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService");
    console.log(accountService.OnlineUsers());
    res.status(200).send({ title: process.env.npm_package_name });
});
router.get("/removeAllKey", (req, res, next) => {
    const app = req["pomelo"];
    const accountService = app.get("accountService");
    accountService.removeAllKeys();
    res.status(200).send("removeAllKey");
});
exports.UsersRouter = router;
