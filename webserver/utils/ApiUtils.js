"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ApiStatus;
(function (ApiStatus) {
    ApiStatus.Success = 200;
    ApiStatus.NoContent = 204;
    ApiStatus.BadRequest = 400; // validation fail , request fail.
    ApiStatus.Forbidden = 403; // invalid permission.
    ApiStatus.Error = 500;
})(ApiStatus = exports.ApiStatus || (exports.ApiStatus = {}));
class ApiResponse {
    constructor(success, message, result) {
        if (message) {
            console.error("API fail: ", message);
        }
        this.success = success;
        this.message = message;
        this.result = result;
    }
}
exports.ApiResponse = ApiResponse;
