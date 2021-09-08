/**
 * Abstractions for data storage.
 */

// databases may be async or not; better-sqlite3 is synchronous while pg is async
type MaybePromise<T> = T | Promise<T>;

export interface UserData {
    id: string;
    passwordHash: string;
    registrationTime: Date;
    ip: string;
}

// TODO: unit tests for this
/** Abstract database interface, which can be implemented inn SQLite, Postgres, etc */
export interface Database {
    addUser(data: UserData): MaybePromise<void>;
    deleteUser(userid: string): MaybePromise<void>;

    // there should be no need to alter registration time or IP address
    updatePasswordHash(userid: string, newHash: string): MaybePromise<void>;

    getUserByID(userid: string): MaybePromise<UserData | null>;
    getUsersByIP(ip: string): MaybePromise<UserData[]>;
}

export {SQLiteDatabase} from './sqlite';
