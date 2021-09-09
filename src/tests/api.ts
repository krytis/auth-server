/**
 * Tests for AuthenticationAPI.
 */

import {AuthenticationAPI} from '../api';
import {SQLiteDatabase} from '../database';

describe('AuthenticationAPI', () => {
    const userid = 'testuser';
    const password = 'hunter2';
    const database = new SQLiteDatabase(':memory:');
    const api = new AuthenticationAPI(database);

    beforeEach(async () => {
        await api.createUser(userid, password, '127.0.0.1');
    });
    afterEach(async () => {
        try {
            await database.deleteUser(userid);
        } catch {}
    });

    test('should not allow creating two users with the same ID', async () => {
        await api.createUser('id', 'password1', '127.0.0.1');
        await expect(api.createUser('id', 'password2', '127.0.0.1')).rejects.toThrow(/exists/);
    });

    test('password verification', async () => {
        await expect(api.verifyPassword(userid, password)).resolves.not.toThrow();
        await expect(api.verifyPassword(userid, 'not the password')).rejects.toThrow();
        await expect(api.verifyPassword('not the userid', password)).rejects.toThrow();
        await expect(api.verifyPassword('not the userid', 'not the password')).rejects.toThrow();
    });

    test('password changes', async () => {
        await expect(api.changePassword(userid, password, 'newpassword')).resolves.not.toThrow();

        await expect(api.verifyPassword(userid, password)).rejects.toThrow();
        await expect(api.verifyPassword(userid, 'newpassword')).resolves.not.toThrow();
    });

    test('user deletion', async () => {
        // user exists & password can be verified
        await expect(api.verifyPassword(userid, password)).resolves.not.toThrow();
        expect(await database.getUserByID(userid)).not.toBe(null);

        await api.deleteUser(userid, password);

        // user does not exist & password can't be verified
        await expect(api.verifyPassword(userid, password)).rejects.toThrow();
        expect(await database.getUserByID(userid)).toBe(null);
    });

    describe('tokens', () => {
        test('token generation requires a password', async () => {
            await expect(api.createToken(userid, password)).resolves.not.toThrow();
            await expect(api.createToken(userid, 'not the password')).rejects.toThrow();
            await expect(api.createToken('not the userid', password)).rejects.toThrow();
            await expect(api.createToken('not the userid', 'not the password')).rejects.toThrow();
        });

        test('token verification', async () => {
            const {token} = await api.createToken(userid, password);

            await expect(api.verifyToken(userid, token)).resolves.not.toThrow();
            await expect(api.verifyToken(userid, 'not the token')).rejects.toThrow();
            await expect(api.verifyToken('not the userid', token)).rejects.toThrow();
            await expect(api.verifyToken('not the userid', 'not the token')).rejects.toThrow();
        });

        test('token deletion', async () => {
            const {token: token1} = await api.createToken(userid, password);
            const {token: token2} = await api.createToken(userid, password);

            // tokens work before logout
            await expect(api.verifyToken(userid, token1)).resolves.not.toThrow();
            await expect(api.verifyToken(userid, token2)).resolves.not.toThrow();

            await api.deleteAllTokens(userid, token1);

            // tokens no longer work!
            await expect(api.verifyToken(userid, token1)).rejects.toThrow();
            await expect(api.verifyToken(userid, token2)).rejects.toThrow();
        });
    });
});
