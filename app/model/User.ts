import RoomAccessData from './RoomAccessData';
import UserRole from './UserRole';
import JobLevel from './JobLevel';

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
    password: string;
    firstname: string;
    lastname: string;
    tel: string;
    mail: string;
    image: string; //!-- mean image url.
    role: UserRole;
    department: string;
    jobLevel: JobLevel;
    jobPosition: string;
    status: string;
    roomAccess: RoomAccessData[];
    memberOfRooms: string[];
    lastEditProfile: Date;
    favoriteUsers: string[]; // user_id
    favoriteGroups: string[]; // room_id
    closedNoticeUsers: string[]; // user_id
    closedNoticeGroups: string[]; // room_id
    deviceTokens: string[];
};