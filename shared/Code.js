"use strict";
var Code = (function () {
    function Code() {
        this.ENTRY = {
            FA_TOKEN_INVALID: 1001,
            FA_TOKEN_EXPIRE: 1002,
            FA_USER_NOT_EXIST: 1003
        };
        this.GATE = {
            FA_NO_SERVER_AVAILABLE: 2001
        };
    }
    Code.OK = 200;
    Code.RequestTimeout = 408;
    Code.FAIL = 500;
    Code.DuplicatedLogin = 1004;
    Code.CHAT = {
        FA_CHANNEL_CREATE: 3001,
        FA_CHANNEL_NOT_EXIST: 3002,
        FA_UNKNOWN_CONNECTOR: 3003,
        FA_USER_NOT_ONLINE: 3004
    };
    Code.sharedEvents = {
        onGetMessagesReaders: "onGetMessagesReaders",
        onMessageRead: "onMessageRead",
        onUserUpdateImgProfile: "onUserUpdateImgProfile",
        onUserUpdateProfile: "onUserUpdateProfile",
        onUserLogin: "onUserLogin",
        onChat: "onChat",
        onAccessRooms: "onAccessRooms",
        onUpdatedLastAccessTime: "onUpdatedLastAccessTime",
        onAddRoomAccess: "onAddRoomAccess",
        onVideoCall: "onVideoCall",
        onVoiceCall: "onVoiceCall",
        onHangupCall: "onHangupCall",
        onTheLineIsBusy: "onTheLineIsBusy",
        onGetMe: "onGetMe",
        onGetCompanyInfo: "onGetCompanyInfo",
        onGetCompanyMembers: "onGetCompanyMembers",
        onGetPrivateGroups: "onGetPrivateGroups",
        onGetOrganizeGroups: "onGetOrganizeGroups",
        onGetProjectBaseGroups: "onGetProjectBaseGroups",
        onCreateGroupSuccess: "onCreateGroupSuccess",
        onEditGroupMembers: "onEditGroupMembers",
        onEditGroupName: "onEditGroupName",
        onEditGroupImage: "onEditGroupImage",
        onNewGroupCreated: "onNewGroupCreated",
        onUpdateMemberInfoInProjectBase: "onUpdateMemberInfoInProjectBase"
    };
    Code.friendEvents = {
        addFriendEvent: "addFriendEvent"
    };
    return Code;
}());
exports.Code = Code;
