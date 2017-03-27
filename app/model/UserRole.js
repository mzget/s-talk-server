"use strict";
var UserRole;
(function (UserRole) {
    UserRole[UserRole["personnel"] = 0] = "personnel";
    UserRole[UserRole["section_chief"] = 1] = "section_chief";
    UserRole[UserRole["department_chief"] = 2] = "department_chief";
    UserRole[UserRole["division_chief"] = 3] = "division_chief";
    UserRole[UserRole["admin"] = 4] = "admin";
})(UserRole || (UserRole = {}));
;
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = UserRole;
