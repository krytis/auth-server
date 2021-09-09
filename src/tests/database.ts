/**
 * Unit tests for database wrappers.
 * All database abstractions should be able to pass these.
 */

import {Database, SQLiteDatabase} from '../database';

const wrappers: Database[] = [
    new SQLiteDatabase(':memory:'),
];

describe.each(wrappers)('%s', (database) => {
    describe('users', () => {
        test('adding, deleting, and retrieving users', async () => {
            const user = {id: 'testuser2', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};
            expect(await database.getUserByID(user.id)).toBe(null);

            await database.addUser(user);
            expect(await database.getUserByID(user.id)).toStrictEqual(user);

            await database.deleteUser(user.id);
            expect(await database.getUserByID(user.id)).toBe(null);
        });

        test('altering password hashes', async () => {
            const user = {id: 'testuser3', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};
            await database.addUser(user);

            await database.updatePasswordHash(user.id, 'newhash');
            const updatedUser = await database.getUserByID(user.id);
            expect(updatedUser?.passwordHash).toBe('newhash');
        });

        test('searching for users by IP address', async () => {
            const users = [
                {id: 'testuser4', passwordHash: 'hunter2', registrationTime: 1, ip: '1.2.3.4'},
                {id: 'testuser5', passwordHash: 'hunter2', registrationTime: 1, ip: '1.2.3.63'},
                {id: 'testuser6', passwordHash: 'hunter2', registrationTime: 1, ip: '1.2.8.6'},
                {id: 'testuser7', passwordHash: 'hunter2', registrationTime: 1, ip: '2.1.1.1'},
            ];
            for (const user of users) {
                await database.addUser(user);
            }

            expect(await database.getUsersByIP('1.2.8.6')).toEqual([users[2]]);
            expect(await database.getUsersByIP('1.2.3.*')).toEqual([users[0], users[1]]);
            expect(await database.getUsersByIP('1.2.*')).toEqual([users[0], users[1], users[2]]);
        });

        test('only one user should be allowed for a given ID', async () => {
            const user = {id: 'testuser1', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};
            const user2 = {id: 'testuser1', passwordHash: 'nothunter2', registrationTime: 65, ip: '127.0.0.2'};

            await database.addUser(user);
            await expect(database.addUser(user2)).rejects.toThrow(/already exists/);
        });
    });

    describe('tokens', () => {
        beforeAll(async () => {
            await database.addUser({id: 'tokentest', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'});
        });
        beforeEach(async () => {
            await database.deleteAllTokens('tokentest');
        });

        test('disallow adding tokens for nonexistent users', async () => {
            await expect(database.addToken('not a real user ID', 'token', 1)).rejects.toThrow(/user .* does not exist/);
        });

        test('adding and retrieving tokens', async () => {
            await database.addToken('tokentest', 'valid token', Date.now() + 10000);
            await database.addToken('tokentest', 'another valid token', Date.now() + 10000);

            expect(await database.getUserTokens('tokentest')).toEqual(new Set(['another valid token', 'valid token']));
        });

        test('expired tokens should not be included in #getUserTokens()', async () => {
            await database.addToken('tokentest', 'valid token', Date.now() + 10000);
            await database.addToken('tokentest', 'expired token', Date.now() - 1);

            expect(await database.getUserTokens('tokentest')).toEqual(new Set(['valid token']));
        });

        test('removing tokens', async () => {
            await database.addToken('tokentest', 'valid token', Date.now() + 10000);
            await database.addToken('tokentest', 'another valid token', Date.now() + 10000);
            await database.addToken('tokentest', 'expired token', Date.now() - 1);

            await database.deleteAllTokens('tokentest');
            const tokens = await database.getUserTokens('tokentest');
            expect(tokens.size).toBe(0);
        });
    });
});
