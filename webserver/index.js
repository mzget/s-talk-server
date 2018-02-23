"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const routes_1 = require("./routes");
const users_1 = require("./routes/users");
function createWebServer(pomeloServer) {
    const app = express();
    app.use((req, res, next) => {
        req["pomelo"] = pomeloServer;
        next();
    });
    app.use(routes_1.DefaultRouter);
    app.use(users_1.UsersRouter);
    app.listen(3004, () => console.log("Web Server listening on port 3004!"));
}
exports.default = createWebServer;
