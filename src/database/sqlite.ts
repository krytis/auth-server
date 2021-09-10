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
    private readonly deleteUserQuery: SQLite.Statement<string>;
    private readonly updatePasswordQuery: SQLite.Statement<[string, string]>;
    private readonly getUserByIDQuery: SQLite.Statement<string>;
    private readonly getUsersByIPQuery: SQLite.Statement<string>;
    private readonly getUsersByIPRangeQuery: SQLite.Statement<string>;

    private readonly addTokenQuery: SQLite.Statement<[string, string, number]>;
    private readonly getTokensQuery: SQLite.Statement<string>;
    private readonly deleteTokensForUserQuery: SQLite.Statement<string>;
    private readonly deleteSingleTokenQuery: SQLite.Statement<string>;
    private readonly getTokensTransaction: SQLite.Transaction;

    constructor(databasePath: string) {
        this.database = new SQLite(databasePath);
        this.database.pragma('foreign_keys = ON');

        const {hasDBInfo} = this.database
            .prepare(`SELECT count(*) AS hasDBInfo FROM sqlite_master WHERE type = 'table' AND name = 'db_info'`)
            .get();
        if (hasDBInfo === 0) {
            // we need to set up the database
            const schemaLocation = path.resolve(__dirname, '..', '..', 'schemas', 'sqlite', 'users.sql');
            const schema = fs.readFileSync(schemaLocation).toString();
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

        this.addTokenQuery = this.database.prepare('INSERT INTO tokens (user_id, token, expires_at) VALUES (?, ?, ?)');
        this.getTokensQuery = this.database.prepare('SELECT token, expires_at FROM tokens WHERE user_id = ?');
        this.deleteTokensForUserQuery = this.database.prepare('DELETE FROM tokens WHERE user_id = ?');
        this.deleteSingleTokenQuery = this.database.prepare('DELETE FROM tokens WHERE token = ?');

        this.getTokensTransaction = this.database.transaction((username: string) => {
            const tokens: Set<string> = new Set();
            const results = this.getTokensQuery.all(username);

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
            this.addUserQuery.run(data.id, data.passwordHash, data.registrationTime, data.ip);
        } catch (err: any) {
            if (err.code.startsWith('SQLITE_CONSTRAINT')) {
                return Promise.reject(new PublicFacingError(`User ${data.id} already exists`));
            }
            return Promise.reject(err);
        }
        return Promise.resolve();
    }

    deleteUser(username: string) {
        const res = this.deleteUserQuery.run(username);
        if (res.changes === 0) throw new PublicFacingError(`User ${username} does not exist`);
        return Promise.resolve();
    }

    updatePasswordHash(username: string, passwordHash: string) {
        const res = this.updatePasswordQuery.run(passwordHash, username);
        if (res.changes === 0) return Promise.reject(new PublicFacingError(`User ${username} does not exist`));
        return Promise.resolve();
    }

    getUserByID(username: string): Promise<UserData | null> {
        const res = this.getUserByIDQuery.get(username);
        return Promise.resolve(res ? SQLiteDatabase.rowToUserData(res) : null);
    }

    getUsersByIP(ip: string): Promise<UserData[]> {
        ip = ip.replace(/\*$/, '%');
        const query = ip.endsWith('%') ? this.getUsersByIPRangeQuery : this.getUsersByIPQuery;
        const res = query.all(ip);
        return Promise.resolve(res.map(SQLiteDatabase.rowToUserData));
    }

    addToken(username: string, token: string, expiresAt: number) {
        try {
            this.addTokenQuery.run(username, token, expiresAt);
        } catch (err: any) {
            if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                return Promise.reject(new PublicFacingError(`The user ${username} does not exist`));
            }
            return Promise.reject(err);
        }
        return Promise.resolve();
    }

    getUserTokens(username: string): Promise<Set<string>> {
        return Promise.resolve(this.getTokensTransaction(username));
    }

    deleteAllTokens(username: string) {
        this.deleteTokensForUserQuery.run(username);
        return Promise.resolve();
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
