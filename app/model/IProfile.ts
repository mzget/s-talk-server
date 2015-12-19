
import UserRole = require("./UserRole");

module IProfile {
    export interface IProfile {
        uid: string;
        username: string;
        password: string;
        firstname: string;
        lastname: string;
        status: string;
        tel: string;
        mail: string;
        image: any;
        role: UserRole.UserRole;
    }

    export class Profile implements IProfile {
        uid: string;
        username: string;
        password: string;
        firstname: string;
        lastname: string;
        status: string;
        tel: string;
        mail: string;
        image: any;
        role: UserRole.UserRole;
    }
}
export = IProfile;
