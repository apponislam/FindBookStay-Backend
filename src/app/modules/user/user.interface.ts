export interface IUserStats {
    totalUsers: number;
    activeUsers: number;
    disabledUsers: number;
    deletedUsers: number;
    verifiedUsers: number;
    adminCount: number;
    publishers: {
        home: number;
        stay: number;
        turf: number;
        property: number;
    };
    newUsersLast7Days: number;
    newUsersLast30Days: number;
}

