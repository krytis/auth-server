/**
 * Implementation of a SQLite database wrapper.
 */

import type {Database, UserData} from '.';
import {PublicFacingError} from '../api';

import * as SQLite from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class SQLiteDatabase implements Database {
    private readonly database: SQLite.Database;

    private readonly addUserQuery: SQLite.Statement<[string, string, number, string]>;
    private readonly deleteUserQuery: SQLite.Statement<number>;
    private readonly updatePasswordQuery: SQLite.Statement<[string, number]>;
    private readonly updateUsernameQuery: SQLite.Statement<[string, number]>;

    private readonly getUserByIDQuery: SQLite.Statement<number>;
    private readonly getUsersByIPQuery: SQLite.Statement<string>;
    private readonly getUsersByIPRangeQuery: SQLite.Statement<string>;
    private readonly getUserIDQuery: SQLite.Statement<string>;

    private readonly addTokenQuery: SQLite.Statement<[number, string, number]>;
    private readonly getTokensQuery: SQLite.Statement<number>;
    private readonly deleteTokensForUserQuery: SQLite.Statement<number>;
    private readonly deleteSingleTokenQuery: SQLite.Statement<string>;
    private readonly getTokensTransaction: SQLite.Transaction;

    constructor(databasePath: string) {
        this.database = new SQLite(databasePath);
        this.database.pragma('foreign_keys = ON');

        const {hasUsers} = this.database
            .prepare(`SELECT count(*) AS hasUsers FROM sqlite_master WHERE type = 'table' AND name = 'users'`)
            .get();
        if (hasUsers === 0) {
            // we need to set up the database
            const schemaLocation = path.resolve(__dirname, '..', '..', 'schemas', 'sqlite', 'users.sql');
            const schema = fs.readFileSync(schemaLocation).toString();
            this.database.exec(schema);
            // TODO: support migrations
        }

        this.addUserQuery = this.database.prepare(
            'INSERT INTO users (name, password_hash, registered_at, registration_ip) ' +
            'VALUES (?, ?, ?, ?) RETURNING id'
        );
        this.deleteUserQuery = this.database.prepare('DELETE FROM users WHERE id = ?');
        this.updatePasswordQuery = this.database.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        this.updateUsernameQuery = this.database.prepare('UPDATE users SET name = ? WHERE id = ?');
        this.getUserByIDQuery = this.database.prepare('SELECT * FROM users WHERE id = ?');
        this.getUsersByIPQuery = this.database.prepare('SELECT * FROM users WHERE registration_ip = ?');
        this.getUsersByIPRangeQuery = this.database.prepare('SELECT * FROM users WHERE registration_ip LIKE ?');
        this.getUserIDQuery = this.database.prepare('SELECT id FROM users WHERE name = ?');

        this.addTokenQuery = this.database.prepare('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
        this.getTokensQuery = this.database.prepare('SELECT token, expires_at FROM tokens WHERE user_id = ?');
        this.deleteTokensForUserQuery = this.database.prepare('DELETE FROM tokens WHERE user_id = ?');
        this.deleteSingleTokenQuery = this.database.prepare('DELETE FROM tokens WHERE token = ?');

        this.getTokensTransaction = this.database.transaction((userid: number) => {
            const tokens: Set<string> = new Set();
            const results = this.getTokensQuery.all(userid);

            for (const {token, expires_at} of results) {
                if (expires_at < Date.now()) {
                    this.deleteSingleTokenQuery.run(token);
                    continue;
                }
                tokens.add(token);
            }

            return tokens;
        });
    }

    addUser(data: UserData) {
        try {
            const {id} = this.addUserQuery.get(data.name, data.passwordHash, data.registrationTime, data.ip);
            return Promise.resolve(id);
        } catch (err: any) {
            if (err.code.startsWith('SQLITE_CONSTRAINT')) {
                return Promise.reject(new PublicFacingError(`User ${data.name} already exists`));
            }
            return Promise.reject(err);
        }
    }

    deleteUser(userid: number) {
        const res = this.deleteUserQuery.run(userid);
        if (res.changes === 0) throw new PublicFacingError(`User ${userid} does not exist`);
        return Promise.resolve();
    }

    updatePasswordHash(userid: number, passwordHash: string) {
        const res = this.updatePasswordQuery.run(passwordHash, userid);
        if (res.changes === 0) return Promise.reject(new PublicFacingError(`User ${userid} does not exist`));
        return Promise.resolve();
    }

    updateUsername(userid: number, newName: string) {
        const res = this.updateUsernameQuery.run(newName, userid);
        if (res.changes === 0) return Promise.reject(new PublicFacingError(`User ${userid} does not exist`));
        return Promise.resolve();
    }

    getUserByID(userid: number): Promise<UserData | null> {
        const res = this.getUserByIDQuery.get(userid);
        return Promise.resolve(res ? SQLiteDatabase.rowToUserData(res) : null);
    }

    getUsersByIP(ip: string): Promise<UserData[]> {
        ip = ip.replace(/\*$/, '%');
        const query = ip.endsWith('%') ? this.getUsersByIPRangeQuery : this.getUsersByIPQuery;
        const res = query.all(ip);
        return Promise.resolve(res.map(SQLiteDatabase.rowToUserData));
    }

    getUserID(username: string): Promise<number | null> {
        const res = this.getUserIDQuery.get(username);
        return Promise.resolve(res ? res.id : null);
    }

    addToken(userid: number, token: string, expiresAt: number) {
        try {
            this.addTokenQuery.run(userid, token, expiresAt);
        } catch (err: any) {
            if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                return Promise.reject(new PublicFacingError(`The user ${userid} does not exist`));
            }
            return Promise.reject(err);
        }
        return Promise.resolve();
    }

    getUserTokens(userid: number): Promise<Set<string>> {
        return Promise.resolve(this.getTokensTransaction(userid));
    }

    deleteAllTokens(userid: number) {
        this.deleteTokensForUserQuery.run(userid);
        return Promise.resolve();
    }

    toString() {
        return 'SQLiteDatabase';
    }

    private static rowToUserData(row: any): UserData {
        return {
            name: row.name,
            passwordHash: row.password_hash,
            registrationTime: row.registered_at,
            ip: row.registration_ip,
        };
    }
}
