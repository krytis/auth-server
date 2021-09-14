/**
 * Tests for AuthenticationAPI.
 */

import {AuthenticationAPI} from '../api';
import {SQLiteDatabase} from '../database';

describe('AuthenticationAPI', () => {
    const username = 'testuser';
    const password = 'hunter2';
    const database = new SQLiteDatabase(':memory:');
    const api = new AuthenticationAPI(database, 100000, 4);
    let userID: number;

    beforeEach(async () => {
        userID = (await api.createUser(username, password, '127.0.0.1')).id;
    });
    afterEach(async () => {
        try {
            await database.deleteUser(userID);
        } catch {}
    });

    test('should not allow creating two users with the same ID', async () => {
        await api.createUser('id', 'password1', '127.0.0.1');
        await expect(api.createUser('id', 'password2', '127.0.0.1')).rejects.toThrow(/exists/);
    });

    test('password verification', async () => {
        await expect(api.checkPassword(userID, password)).resolves.not.toThrow();
        await expect(api.checkPassword(userID, 'not the password')).rejects.toThrow();
    });

    test('password changes', async () => {
        await expect(api.changePassword(userID, password, 'newpassword')).resolves.not.toThrow();

        await expect(api.checkPassword(userID, password)).rejects.toThrow();
        await expect(api.checkPassword(userID, 'newpassword')).resolves.not.toThrow();
    });

    test('user deletion', async () => {
        // user exists & password can be verified
        await expect(api.checkPassword(userID, password)).resolves.not.toThrow();
        expect(await database.getUserByID(userID)).not.toBe(null);

        await api.deleteUser(userID, password);

        // user does not exist & password can't be verified
        await expect(api.checkPassword(userID, password)).rejects.toThrow();
        expect(await database.getUserByID(userID)).toBe(null);
    });

    describe('tokens', () => {
        test('token generation requires a password', async () => {
            await expect(api.createToken(username, password)).resolves.not.toThrow();
            await expect(api.createToken(username, 'not the password')).rejects.toThrow();
        });

        test('token verification', async () => {
            const {token} = await api.createToken(username, password);

            await expect(api.checkToken(userID, token)).resolves.not.toThrow();
            await expect(api.checkToken(userID, 'not the token')).rejects.toThrow();
        });

        test('token deletion', async () => {
            const {token: token1} = await api.createToken(username, password);
            const {token: token2} = await api.createToken(username, password);

            // tokens work before logout
            await expect(api.checkToken(userID, token1)).resolves.not.toThrow();
            await expect(api.checkToken(userID, token2)).resolves.not.toThrow();

            await api.deleteAllTokens(userID, token1);

            // tokens no longer work!
            await expect(api.checkToken(userID, token1)).rejects.toThrow();
            await expect(api.checkToken(userID, token2)).rejects.toThrow();
        });
    });
});
