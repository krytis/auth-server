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

    async createUser(id: string, password: string, ip: string) {
        if (await this.database.getUserByID(id)) throw new PublicFacingError(`User ${id} already exists`);

        const passwordHash = await AuthenticationAPI.hashPassword(password);
        await this.database.addUser({id, passwordHash, registrationTime: Date.now(), ip});
        return {success: true};
    }

    async deleteUser(id: string, password: string) {
        await this.checkPassword(id, password);
        await this.database.deleteUser(id);
        return {success: true};
    }

    async createToken(id: string, password: string) {
        await this.checkPassword(id, password);

        const token = await this.generateToken();
        const expiresAt = Date.now() + this.tokenTTL;
        await this.database.addToken(id, token, expiresAt);

        return {token, expiresAt};
    }

    // logout
    async deleteAllTokens(username: string, token: string) {
        await this.checkToken(username, token);
        await this.database.deleteAllTokens(username);
        return {success: true};
    }

    async changePassword(username: string, oldPassword: string, newPassword: string) {
        await this.checkPassword(username, oldPassword);
        const newHash = await AuthenticationAPI.hashPassword(newPassword);
        await this.database.updatePasswordHash(username, newHash);
        return {success: true};
    }

    async checkToken(username: string, token: string) {
        const tokens = await this.database.getUserTokens(username);
        if (!tokens.has(token)) throw new PublicFacingError('Incorrect username/token');
    }

    async validateToken(username: string, token: string) {
        try {
            await this.checkToken(username, token);
            return {valid: true};
        } catch {
            return {valid: false};
        }
    }

    async checkPassword(username: string, password: string) {
        const user = await this.database.getUserByID(username);
        if (!user) throw new PublicFacingError('Incorrect username/password');

        const isValid = await argon2.verify(user.passwordHash, password);
        if (!isValid) throw new PublicFacingError('Incorrect username/password');
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
