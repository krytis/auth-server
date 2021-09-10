/**
 * Abstractions for data storage.
 */

export interface UserData {
    id: string;
    passwordHash: string;
    /** UNIX time in milliseconds */
    registrationTime: number;
    ip: string;
}

// TODO: unit tests for this
/** Abstract database interface, which can be implemented inn SQLite, Postgres, etc */
export interface Database {
    addUser(data: UserData): Promise<void>;
    deleteUser(username: string): Promise<void>;

    // there should be no need to alter registration time or IP address
    updatePasswordHash(username: string, newHash: string): Promise<void>;

    getUserByID(username: string): Promise<UserData | null>;
    /** should accept IPs (127.0.0.1) and IP ranges (127.0.*) */
    getUsersByIP(ip: string): Promise<UserData[]>;

    addToken(username: string, token: string, expiresAt: number): Promise<void>;
    getUserTokens(username: string): Promise<Set<string>>;
    deleteAllTokens(username: string): Promise<void>;
}

export {SQLiteDatabase} from './sqlite';
