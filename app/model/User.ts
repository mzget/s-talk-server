//import UserRole = require("UserRole");
//import JobLevel = require("JobLevel");
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

export class User {
    _id: string;
    password : string;
    first_name: string;
    last_name: string;
    mobile: string;
    gender: string;
    birthday: string;
    occupation: string;
    facebookId: string;
    email: string;
    avatar: string; //!-- mean image url.    
    favoriteUsers: string[]; // user_id
    favoriteGroups: string[]; // room_id
    closedNoticeUsers: string[]; // user_id
    closedNoticeGroups: string[]; // room_id
    devicesToken: string;
    registerDate: string;
    linkeds: string[];
    follower: string[];
    sharedBy: string[];
    companies: string[];
    link_requests: string[];
    trash_link_requests: string[];

    roomAccess: MAccess.RoomAccessData[];
    memberOfRooms: string[];
    
    toString() {
        return generic.collections.makeString(this);
    }
};