/**
 * Implementation of a SQLite database wrapper.
 */

import type {Database, UserData} from '..';
import * as SQLite from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class SQLiteDatabase implements Database {
    private readonly database: SQLite.Database;

    private readonly addUserQuery: SQLite.Statement<[string, string, number, string]>;
    private readonly deleteUserQuery: SQLite.Statement<string>;
    private readonly updatePasswordQuery: SQLite.Statement<[string, string]>;
    private readonly getUserByIDQuery: SQLite.Statement<string>;
    private readonly getUsersByIPQuery: SQLite.Statement<string>;
    private readonly getUsersByIPRangeQuery: SQLite.Statement<string>;

    constructor(databasePath: string) {
        this.database = new SQLite(databasePath);

        const {hasDBInfo} = this.database
            .prepare(`SELECT count(*) AS hasDBInfo FROM sqlite_master WHERE type = 'table' AND name = 'db_info'`)
            .get();
        if (hasDBInfo === 0) {
            // we need to set up the database
            const schema = fs.readFileSync(path.resolve(__dirname, 'schemas', 'users.sql')).toString();
            this.database.exec(schema);
            // TODO: support migrations
        }

        this.addUserQuery = this.database.prepare(
            'INSERT INTO users (id, password_hash, registered_at, registration_ip) VALUES (?, ?, ?, ?)'
        );
        this.deleteUserQuery = this.database.prepare('DELETE FROM users WHERE id = ?');
        this.updatePasswordQuery = this.database.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        this.getUserByIDQuery = this.database.prepare('SELECT * FROM users WHERE id = ?');
        this.getUsersByIPQuery = this.database.prepare('SELECT * FROM users WHERE registration_ip = ?');
        this.getUsersByIPRangeQuery = this.database.prepare('SELECT * FROM users WHERE registration_ip LIKE ?');
    }

    addUser(data: UserData) {
        try {
            this.addUserQuery.run(data.id, data.passwordHash, data.registrationTime, data.ip);
        } catch (err: any) {
            if (err.code.startsWith('SQLITE_CONSTRAINT')) {
                return Promise.reject(new Error(`User ${data.id} already exists`));
            }
            return Promise.reject(err);
        }
        return Promise.resolve();
    }

    deleteUser(userid: string) {
        const res = this.deleteUserQuery.run(userid);
        if (res.changes === 0) throw new Error(`User ${userid} does not exist`);
        return Promise.resolve();
    }

    updatePasswordHash(userid: string, passwordHash: string) {
        const res = this.updatePasswordQuery.run(passwordHash, userid);
        if (res.changes === 0) return Promise.reject(new Error(`User ${userid} does not exist`));
        return Promise.resolve();
    }

    getUserByID(userid: string): Promise<UserData | null> {
        const res = this.getUserByIDQuery.get(userid);
        return Promise.resolve(res ? SQLiteDatabase.rowToUserData(res) : null);
    }

    getUsersByIP(ip: string): Promise<UserData[]> {
        ip = ip.replace(/\*$/, '%');
        const query = ip.endsWith('%') ? this.getUsersByIPRangeQuery : this.getUsersByIPQuery;
        const res = query.all(ip);
        return Promise.resolve(res.map(SQLiteDatabase.rowToUserData));
    }

    toString() {
        return 'SQLiteDatabase';
    }

    private static rowToUserData(row: any): UserData {
        return {
            id: row.id,
            passwordHash: row.password_hash,
            registrationTime: row.registered_at,
            ip: row.registration_ip,
        };
    }
}
