/**
 * PostgreSQL database wrapper.
 */

import type {Database, UserData} from '.';
import {PublicFacingError} from '../api';
import {Pool} from 'pg';

import * as path from 'path';
import * as fs from 'fs';

export class PostgresDatabase implements Database {
    private pool: Pool;
    private readyPromise: Promise<void> | null;
    constructor(
        config: {user: string; password: string; host: string; port: number; database: string},
        tokenLengthInCharacters: number,
        testingPool?: Pool,
    ) {
        this.pool = testingPool || new Pool(config);
        this.readyPromise = this.setupDatabase(config.database, tokenLengthInCharacters, !!testingPool).then(() => {
            this.readyPromise = null;
        });
    }

    async setupDatabase(dbName: string, tokenLengthInCharacters: number, isMocked = false) {
        // We can't select from information_schema during unit tests, because of a bug in pg-mem.
        // See https://github.com/oguimbal/pg-mem/issues/155
        let isSetUp;
        if (isMocked) {
            isSetUp = false;
        } else {
            // we use $1, $2, etc because pg-mem, the testing framework,
            // currently does not support ? or named parameters
            const {rows} = await this.pool.query(
                'SELECT count(*) as hasUsersTable FROM information_schema.tables ' +
                `WHERE table_type = 'BASE TABLE' AND table_catalog = $1 AND table_name = 'users'`,
                [dbName]
            );
            isSetUp = rows[0].hasUsersTable === 1;
        }

        if (!isSetUp) {
            const schemaLocation = path.resolve(__dirname, '..', '..', 'schemas', 'postgres', 'users.sql');
            const schema = fs
                .readFileSync(schemaLocation)
                .toString()
                .replace(/%%token_length_in_characters%%/g, tokenLengthInCharacters.toString());
            await this.pool.query(schema);
        }
    }

    async addUser(data: UserData) {
        if (this.readyPromise) await this.readyPromise;
        try {
            const {rows} = await this.pool.query(
                'INSERT INTO users (name, password_hash, registered_at, registration_ip) ' +
                'VALUES ($1, $2, to_timestamp($3 / 1000), $4) RETURNING id',
                [data.name, data.passwordHash, data.registrationTime, data.ip]
            );
            return rows[0].id;
        } catch (err: any) {
            console.log(err);
            return -1;
        }
    }
    async deleteUser(userid: number) {
        if (this.readyPromise) await this.readyPromise;
        const {rowCount} = await this.pool.query('DELETE FROM users WHERE id = $1', [userid]);
        if (rowCount === 0) throw new PublicFacingError(`User ${userid} does not exist`);
    }

    async updatePasswordHash(userid: number, newHash: string) {
        if (this.readyPromise) await this.readyPromise;
        const {rowCount} = await this.pool.query(
            'UPDATE users SET password_hash = $1 WHERE id = $2',
            [newHash, userid]
        );
        if (rowCount === 0) throw new PublicFacingError(`User ${userid} does not exist`);
    }

    async updateUsername(userid: number, newName: string) {
        if (this.readyPromise) await this.readyPromise;
        const {rowCount} = await this.pool.query('UPDATE users SET name = $1 WHERE id = $2', [newName, userid]);
        if (rowCount === 0) throw new PublicFacingError(`User ${userid} does not exist`);
    }

    async getUserByID(userid: number) {
        if (this.readyPromise) await this.readyPromise;
        const {rows} = await this.pool.query('SELECT * FROM users WHERE id = $1', [userid]);
        return rows[0] ? PostgresDatabase.rowToUserData(rows[0]) : null;
    }
    async getUsersByIP(ip: string) {
        throw new Error('Not implemented');
        await Promise.resolve();
        return [];
    }
    async getUserID(username: string) {
        throw new Error('Not implemented');
        await Promise.resolve();
        return null;
    }

    async addToken(userid: number, token: string, expiresAt: number) {
        throw new Error('Not implemented');
        await Promise.resolve();
    }
    async getUserTokens(userid: number) {
        throw new Error('Not implemented');
        await Promise.resolve();
        return new Set<string>();
    }
    async deleteAllTokens(userid: number) {
        throw new Error('Not implemented');
        await Promise.resolve();
    }

    toString() {
        return 'PostgresDatabase';
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
