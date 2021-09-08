/**
 * Implementation of a SQLite database wrapper.
 */

import type {Database, UserData} from '..';
import * as SQLite from 'better-sqlite3';

export class SQLiteDatabase implements Database {
    private readonly database: SQLite.Database;

    private readonly addUserQuery: SQLite.Statement<[string, string, number, string]>;
    private readonly deleteUserQuery: SQLite.Statement<string>;
    private readonly updatePasswordQuery: SQLite.Statement<[string, string]>;
    private readonly getUserByIDQuery: SQLite.Statement<string>;
    private readonly getUsersByIPQuery: SQLite.Statement<string>;

    constructor(path: string) {
        this.database = new SQLite(path);
        // TODO: actually run schemas/migrations and initialize the database

        this.addUserQuery = this.database.prepare(
            'INSERT INTO users (id, password_hash, registered_at, registration_ip) VALUES (?, ?, ?, ?)'
        );
        this.deleteUserQuery = this.database.prepare('DELETE FROM users WHERE id = ?');
        this.updatePasswordQuery = this.database.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        this.getUserByIDQuery = this.database.prepare('SELECT * FROM users WHERE id = ?');
        this.getUsersByIPQuery = this.database.prepare('SELECT * FROM users WHERE registration_ip = ?');
    }

    addUser(data: UserData) {
        try {
            this.addUserQuery.run(data.id, data.passwordHash, data.registrationTime.getTime() / 1000, data.ip);
        } catch (err: any) {
            if (err.code === 'SQLITE_CONSTRAINT') throw new Error(`User ${data.id} already exists`);
            throw err;
        }
    }

    deleteUser(userid: string) {
        const res = this.deleteUserQuery.run(userid);
        if (res.changes === 0) throw new Error(`User ${userid} does not exist`);
    }

    updatePasswordHash(userid: string, passwordHash: string) {
        const res = this.updatePasswordQuery.run(userid, passwordHash);
        if (res.changes === 0) throw new Error(`User ${userid} does not exist`);
    }

    getUserByID(userid: string): UserData | null {
        const res = this.getUserByIDQuery.get(userid);
        if (!res) return null;
        return SQLiteDatabase.rowToUserData(res);
    }

    getUsersByIP(ip: string): UserData[] {
        const res = this.getUsersByIPQuery.all(ip);
        return res.map(SQLiteDatabase.rowToUserData);
    }

    private static rowToUserData(row: any): UserData {
        return {
            id: row.id,
            passwordHash: row.password_hash,
            registrationTime: new Date(row.registered_at * 1000),
            ip: row.registration_ip,
        };
    }
}
