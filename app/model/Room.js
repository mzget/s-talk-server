(function (MemberRole) {
    MemberRole[MemberRole["member"] = 0] = "member";
    MemberRole[MemberRole["admin"] = 1] = "admin";
    MemberRole[MemberRole["owner"] = 2] = "owner";
})(exports.MemberRole || (exports.MemberRole = {}));
var MemberRole = exports.MemberRole;
var Member = (function () {
    function Member() {
    }
    return Member;
})();
exports.Member = Member;
(function (RoomType) {
    RoomType[RoomType["organizationGroup"] = 0] = "organizationGroup";
    RoomType[RoomType["projectBaseGroup"] = 1] = "projectBaseGroup";
    RoomType[RoomType["privateGroup"] = 2] = "privateGroup";
    RoomType[RoomType["privateChat"] = 3] = "privateChat";
})(exports.RoomType || (exports.RoomType = {}));
var RoomType = exports.RoomType;
;
(function (RoomStatus) {
    RoomStatus[RoomStatus["active"] = 0] = "active";
    RoomStatus[RoomStatus["disable"] = 1] = "disable";
    RoomStatus[RoomStatus["delete"] = 2] = "delete";
})(exports.RoomStatus || (exports.RoomStatus = {}));
var RoomStatus = exports.RoomStatus;
;
var Room = (function () {
    function Room() {
    }
    return Room;
})();
exports.Room = Room;
