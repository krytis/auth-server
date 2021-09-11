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

    constructor(database: Database, tokenTTL: number, tokenSize = 32) {
        this.database = database;
        this.tokenTTL = tokenTTL;
        this.tokenSize = tokenSize;
    }

    async createUser(name: string, password: string, ip: string) {
        const passwordHash = await AuthenticationAPI.hashPassword(password);
        const id = await this.database.addUser({name, passwordHash, registrationTime: Date.now(), ip});
        return {id};
    }

    async deleteUser(id: number, password: string) {
        await this.checkPassword(id, password);
        await this.database.deleteUser(id);
        return {success: true};
    }

    async createToken(id: number, password: string) {
        await this.checkPassword(id, password);

        const token = await this.generateToken();
        const expiresAt = Date.now() + this.tokenTTL;
        await this.database.addToken(id, token, expiresAt);

        return {token, expiresAt};
    }

    async getUserID(username: string) {
        const id = await this.database.getUserID(username);
        return id ? {id} : {error: `User ${username} does not exist`};
    }

    // logout
    async deleteAllTokens(id: number, token: string) {
        await this.checkToken(id, token);
        await this.database.deleteAllTokens(id);
        return {success: true};
    }

    async changePassword(id: number, oldPassword: string, newPassword: string) {
        await this.checkPassword(id, oldPassword);
        const newHash = await AuthenticationAPI.hashPassword(newPassword);
        await this.database.updatePasswordHash(id, newHash);
        return {success: true};
    }

    async checkToken(id: number, token: string) {
        const tokens = await this.database.getUserTokens(id);
        if (!tokens.has(token)) throw new PublicFacingError('Incorrect username/token');
    }

    async validateToken(id: number, token: string) {
        try {
            await this.checkToken(id, token);
            return {valid: true};
        } catch {
            return {valid: false};
        }
    }

    async checkPassword(userid: number, password: string) {
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
