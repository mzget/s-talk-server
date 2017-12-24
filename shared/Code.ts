export default class Code {
    static OK = 200;
    static RequestTimeout = 408;
    static FAIL = 500;

    static DuplicatedLogin = 1004;

    ENTRY = {
        FA_TOKEN_INVALID: 1001,
        FA_TOKEN_EXPIRE: 1002,
        FA_USER_NOT_EXIST: 1003
    };

    GATE = {
        FA_NO_SERVER_AVAILABLE: 2001
    };

    static CHAT = {
        FA_CHANNEL_CREATE: 3001,
        FA_CHANNEL_NOT_EXIST: 3002,
        FA_UNKNOWN_CONNECTOR: 3003,
        FA_USER_NOT_ONLINE: 3004
    };

    public static sharedEvents = {
        onGetMessagesReaders: "onGetMessagesReaders",
        onMessageRead: "onMessageRead",
        onUserUpdateImgProfile: "onUserUpdateImgProfile",
        onUserUpdateProfile: "onUserUpdateProfile",
        onUserLogin: "onUserLogin",
        onUserLogout: "onUserLogout",

        /**@deprecated */
        onChat: "onChat",

        ON_CHAT: "ON_CHAT",
        ON_PUSH: "ON_PUSH",

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
    }

    public static friendEvents = {
        addFriendEvent: "addFriendEvent"
    }
}

export interface SessionInfo {
    id: string;
    frontendId: string;
    uid: string;
}