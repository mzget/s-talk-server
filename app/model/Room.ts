export enum MemberRole {
    member = 0,
    admin = 1,
    owner
}
export interface IMembersStatus {
    uid: string;
    status: string;
}
export class Member {
    id: string;
    role: MemberRole;
    joinTime: Date;
    status: string;
    jobPosition: string;
}
export enum RoomType { organizationGroup, projectBaseGroup, privateGroup, privateChat };
export enum RoomStatus { active, disable, delete };
export class Room {
    _id: string;
    nodeId: number;
    name: string;
    type: RoomType;
    members: Member[];
    image: string;
    description: string;
    status: RoomStatus;
    createTime: Date;
}