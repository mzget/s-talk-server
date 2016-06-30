import MAccess = require('./RoomAccessData');
import UserRole = require('./UserRole');
var generic = require('../util/collections');

interface IUser { 
    uid: string;
};
export class OnlineUser implements IUser {
    uid: string;
    registrationIds: string[];
    username: string;
    serverId: string;
};
export class UserTransaction implements IUser {
    uid: string;
    username: string;
}
export interface IOnlineUser {
    [uid: string]: OnlineUser;
};

export class StalkAccount {
    _id: string;
    displayname: string;
    username: string;
    password : string;
    firstname: string;
    lastname: string;
    tel: string;
    mail: string;
    image: string; //!-- mean image url.
    role: UserRole.UserRole;
    department: string;
    jobLevel: JobLevel;
    jobPosition: string;
    status: string;
    roomAccess: MAccess.RoomAccessData[];
    memberOfRooms: string[];
    lastEditProfile: Date;
    favoriteUsers: string[]; // user_id
    favoriteGroups: string[]; // room_id
    closedNoticeUsers: string[]; // user_id
    closedNoticeGroups: string[]; // room_id
    deviceTokens: string[];
};

export class BOLAccount {
    _id: string;
    displayname: string;
    password : string;
    first_name: string;
    last_name: string;
    tel: string;
    mail: string;
    image: string; //!-- mean image url.
    role: UserRole.UserRole;
    department: string;
    jobLevel: JobLevel;
    jobPosition: string;
    status: string;
    roomAccess: MAccess.RoomAccessData[];
    memberOfRooms: string[];
    lastEditProfile: Date;
    favoriteUsers: string[]; // user_id
    favoriteGroups: string[]; // room_id
    closedNoticeUsers: string[]; // user_id
    closedNoticeGroups: string[]; // room_id
    devicesToken: string[];
};