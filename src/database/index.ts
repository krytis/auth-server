/**
 * Abstractions for data storage.
 */

export interface UserData {
    name: string;
    passwordHash: string;
    /** UNIX time in milliseconds */
    registrationTime: number;
    ip: string;
}

/** Abstract database interface, which can be implemented inn SQLite, Postgres, etc */
export interface Database {
    addUser(data: UserData): Promise<number>;
    deleteUser(userid: number): Promise<void>;

    // there should be no need to alter registration time or IP address
    updatePasswordHash(userid: number, newHash: string): Promise<void>;
    updateUsername(userid: number, newName: string): Promise<void>;

    getUserByID(userid: number): Promise<UserData | null>;
    /** should accept IPs (127.0.0.1) and IP ranges (127.0.*) */
    getUsersByIP(ip: string): Promise<UserData[]>;
    getUserID(username: string): Promise<number | null>;

    addToken(userid: number, token: string, expiresAt: number): Promise<void>;
    getUserTokens(userid: number): Promise<Set<string>>;
    deleteAllTokens(userid: number): Promise<void>;
}

export {SQLiteDatabase} from './sqlite';
export {PostgresDatabase} from './postgres';
