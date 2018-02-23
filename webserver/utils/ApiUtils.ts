export namespace ApiStatus {
    export const Success = 200;
    export const NoContent = 204;
    export const BadRequest = 400; // validation fail , request fail.
    export const Forbidden = 403; // invalid permission.
    export const Error = 500;
}

export class ApiResponse {
    public success: boolean;
    public message: any;
    public result: any;

    constructor(success: boolean, message?: any, result?: any) {
        if (message) {
            console.error("API fail: ", message);
        }

        this.success = success;
        this.message = message;
        this.result = result;
    }
}
