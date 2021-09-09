/**
 * The API class, separated from routes.
 */

import type {Database} from './database';
import * as argon2 from 'argon2';
import {randomBytes} from 'crypto';

export class PublicFacingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PublicFacingError';
    }
}

export class AuthenticationAPI {
    private readonly database: Database;
    /** milliseconds */
    private readonly tokenTTL: number;
    private readonly tokenSize: number;

    constructor(database: Database, tokenTTL = 24 * 60 * 60 * 1000, tokenSize = 32) {
        this.database = database;
        this.tokenTTL = tokenTTL;
        this.tokenSize = tokenSize;
    }

    async createUser(id: string, password: string, ip: string) {
        if (await this.database.getUserByID(id)) throw new PublicFacingError(`User ${id} already exists`);

        const passwordHash = await AuthenticationAPI.hashPassword(password);
        await this.database.addUser({id, passwordHash, registrationTime: Date.now(), ip});
    }

    async deleteUser(id: string, password: string) {
        await this.verifyPassword(id, password);
        await this.database.deleteUser(id);
    }

    async createToken(id: string, password: string) {
        await this.verifyPassword(id, password);

        const token = await this.generateToken();
        const expiresAt = Date.now() + this.tokenTTL;
        await this.database.addToken(id, token, expiresAt);

        return {token, expiresAt};
    }

    // logout
    async deleteAllTokens(userid: string, token: string) {
        await this.verifyToken(userid, token);
        await this.database.deleteAllTokens(userid);
    }

    async changePassword(userid: string, oldPassword: string, newPassword: string) {
        await this.verifyPassword(userid, oldPassword);
        const newHash = await AuthenticationAPI.hashPassword(newPassword);
        await this.database.updatePasswordHash(userid, newHash);
    }

    async verifyToken(userid: string, token: string) {
        const tokens = await this.database.getUserTokens(userid);
        if (!tokens.has(token)) throw new PublicFacingError('Incorrect userid/token');
    }

    async verifyPassword(userid: string, password: string) {
        const user = await this.database.getUserByID(userid);
        if (!user) throw new PublicFacingError('Incorrect userid/password');

        const isValid = await argon2.verify(user.passwordHash, password);
        if (!isValid) throw new PublicFacingError('Incorrect userid/password');
    }

    private async generateToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            randomBytes(this.tokenSize, (err, buf) => {
                if (err) reject(err);
                resolve(buf.toString('hex'));
            });
        });
    }

    private static async hashPassword(password: string): Promise<string> {
        return argon2.hash(password, {type: argon2.argon2id});
    }
}
