/**********************************************
* UserProfile Management;
* for edit user profile info.
***********************************************/
"use strict";
var Mdb = require('../../../db/dbClient');
var code = require('../../../../shared/Code');
var MUser = require('../../../controller/UserManager');
var User = require('../../../model/User');
var Room = require('../../../model/Room');
var dbClient = Mdb.DbController.DbClient.GetInstance();
var ObjectID = require('mongodb').ObjectID;
var userManager = MUser.Controller.UserManager.getInstance();
var channelService;
module.exports = function (app) {
    console.info("instanctiate profileHandler.");
    return new ProfileHandler(app);
};
var ProfileHandler = function (app) {
    this.app = app;
    channelService = app.get('channelService');
};
var profileHandler = ProfileHandler.prototype;
/*
* update or edit user profile.
*/
profileHandler.profileUpdate = function (msg, session, next) {
    if (!msg._id) {
        next(null, { code: code.FAIL, message: "profile info is empty or null." });
        return;
    }
    else {
        console.info("profileUpdate: ", msg);
    }
    var uid = msg._id;
    var updateParams = new User.User();
    if (msg.displayname && msg.displayname !== "")
        updateParams.displayname = msg.displayname;
    //if (msg.firstname && msg.firstname !== "")
    //    updateParams.firstname = msg.firstname;
    //if (msg.lastname && msg.lastname !== "")
    //    updateParams.lastname = msg.lastname;
    if (msg.mail && msg.mail !== "")
        updateParams.email = msg.mail;
    if (msg.tel && msg.tel !== "")
        updateParams.mobile = msg.tel;
    if (msg.status && msg.status !== "")
        updateParams.status = msg.status;
    if (!updateParams) {
        next(null, { code: code.FAIL, message: "Fail to update user profile." });
        return;
    }
    //<!-- Finally  add last edit time to params.
    updateParams.lastEditProfile = new Date();
    dbClient.UpdateDocuments(Mdb.DbController.userColl, function (result) {
        if (!result) {
            console.error("profileUpdate fail.!");
        }
        else {
            var param = {
                route: code.sharedEvents.onUserUpdateProfile,
                data: { _id: uid, params: updateParams }
            };
            channelService.broadcast("connector", param.route, param.data);
        }
    }, { _id: new ObjectID(uid) }, { $set: updateParams }, { w: 1 });
    next(null, { code: code.OK });
};
/**
 * Call this func. when user upload new "ProfileImage" complete via Http server.
 * Then tell me for
 * - success url, and
 * - user_id
 *  who update image.
 */
profileHandler.profileImageChanged = function (msg, session, next) {
    var uid = msg.userId;
    if (!uid) {
        next(null, { code: code.FAIL, message: "profile info is empty or null." });
        return;
    }
    var newUrl = msg.path;
    if (!newUrl) {
        next(null, { code: code.FAIL, message: "newUrl of profileImage is empty or null." });
        return;
    }
    userManager.updateImageProfile(uid, newUrl, function (err, res) {
        if (err) {
            console.error("updateImageProfile fail.", err);
        }
        else {
            var param = {
                route: code.sharedEvents.onUserUpdateImgProfile,
                data: { _id: uid, path: newUrl }
            };
            channelService.broadcast("connector", param.route, param.data);
        }
    });
    next(null);
};
/*
* update or change password.
*/
profileHandler.passwordChange = function (msg, session, next) {
};
/*
* Get profile info for other user.
**************************************
* @request : {userId of target member }
* @reture : { profile data of target member.}
*/
profileHandler.getMemberProfile = function (msg, session, next) {
    var targetId = msg.userId;
    if (!targetId) {
        next(null, { code: code.FAIL, message: "target id of member is invalid." });
        return;
    }
    userManager.getMemberProfile(targetId, function (err, res) {
        if (err || res === null) {
            var message = "fail to getMemberProfile of " + targetId;
            next(null, { code: code.FAIL, message: message });
        }
        else {
            next(null, { code: code.OK, data: res });
        }
    });
};
//<!-- Update favorite members for user. -->
profileHandler.editFavoriteMembers = function (msg, session, next) {
    var token = msg.token;
    var editType = msg.editType;
    var member = msg.member;
    var uid = session.uid;
    if (!uid || !editType || !member || !token) {
        var _errMsg = "editFavoriteMembers: some params is invalid.";
        console.error(_errMsg);
        next(null, { code: code.FAIL, message: _errMsg });
        return;
    }
    userManager.updateFavoriteMembers(editType, member, uid, function (err, res) {
        if (err || res === null) {
            next(null, { code: code.FAIL });
        }
        else {
            next(null, { code: code.OK });
        }
    });
};
//<!-- Update favorite groups for user. -->
profileHandler.updateFavoriteGroups = function (msg, session, next) {
    var token = msg.token;
    var editType = msg.editType;
    var group = msg.group;
    var uid = session.uid;
    if (!uid || !editType || !group || !token) {
        var _errMsg = "updateFavoriteGroups: some params is invalid.";
        console.error(_errMsg);
        next(null, { code: code.FAIL, message: _errMsg });
        return;
    }
    userManager.updateFavoriteGroups(editType, group, uid, function (err, res) {
        if (err || res === null) {
            next(null, { code: code.FAIL });
        }
        else {
            next(null, { code: code.OK });
        }
    });
};
/**
 * For closed notification for user who never want to get notice from some members.
 */
profileHandler.updateClosedNoticeUsers = function (msg, session, next) {
    var token = msg.token;
    var editType = msg.editType;
    var member = msg.member;
    var uid = session.uid;
    if (!uid || !editType || !member || !token) {
        var _errMsg = "updateClosedNoticeUsers: some params is invalid.";
        console.error(_errMsg);
        next(null, { code: code.FAIL, message: _errMsg });
        return;
    }
    userManager.updateClosedNoticeUsersList(editType, member, uid, function (err, res) {
        if (err || res === null) {
            next(null, { code: code.FAIL });
        }
        else {
            next(null, { code: code.OK });
        }
    });
};
/**
 *  For closed notification for user who never want to get notice from some groups.
* @beware : only private group chat can close notification. Othor cannot do this.
 */
profileHandler.updateClosedNoticeGroups = function (msg, session, next) {
    var token = msg.token;
    var editType = msg.editType;
    var group = msg.group;
    var uid = session.uid;
    if (!uid || !editType || !group || !token) {
        var _errMsg = "updateClosedNoticeGroups: some params is invalid.";
        console.error(_errMsg);
        next(null, { code: code.FAIL, message: _errMsg });
        return;
    }
    this.app.rpc.chat.chatRoomRemote.checkedRoomType(session, group, function (err, res) {
        if (err || res === null) {
            console.error("checkedRoomType fail.");
            next(null, { code: code.FAIL, message: "checkedRoomType fail." });
        }
        else if (res.type === Room.RoomType.privateGroup) {
            userManager.updateClosedNoticeGroups(editType, group, uid, function (err, res) {
                if (err || res === null) {
                    next(null, { code: code.FAIL });
                }
                else {
                    next(null, { code: code.OK });
                }
            });
        }
        else {
            console.warn("RoomType is not a private group chat.");
            next(null, { code: code.FAIL, message: "RoomType is not a private group chat." });
        }
    });
};
