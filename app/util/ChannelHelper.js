"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function getUsersGroup(users) {
    let usersGroup = [];
    usersGroup = users.map(user => {
        return { uid: user.uid, sid: user.serverId };
    });
    return usersGroup;
}
exports.getUsersGroup = getUsersGroup;
exports.default = getUsersGroup;
