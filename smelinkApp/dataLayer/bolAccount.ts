import RoomAccessData from '../../app/model/RoomAccessData';
export class BOLAccount {
    _id: string;
    password: string;
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
    devicesToken: string[];
    registerDate: string;
    linkeds: string[];
    follower: string[];
    sharedBy: string[];
    companies: string[];
    link_requests: string[];
    trash_link_requests: string[];

    roomAccess: RoomAccessData[];
    memberOfRooms: string[];
};