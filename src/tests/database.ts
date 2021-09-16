/**
 * Unit tests for database wrappers.
 * All database abstractions should be able to pass these.
 */

// load bearing import order - mocking fails otherwise
import {newDb} from 'pg-mem';
import {Database, SQLiteDatabase, PostgresDatabase} from '../database';

const PGMemory = newDb().adapters.createPg().Pool;
const wrappers: Database[] = [
    new SQLiteDatabase(':memory:'),
    // Config is irrelevant because
    new PostgresDatabase(
        {user: '', database: 'test', password: '', host: '', port: -1},
        32,
        new PGMemory(),
    ),
];

describe.each(wrappers)('%s', database => {
    describe('users', () => {
        test('adding, deleting, and retrieving users', async () => {
            const user = {name: 'testuser2', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};

            const id = await database.addUser(user);
            expect(await database.getUserByID(id)).toStrictEqual(user);
            expect(await database.getUserID(user.name)).toBe(id);

            await database.deleteUser(id);
            expect(await database.getUserByID(id)).toBeNull();
        });

        test('altering password hashes', async () => {
            const user = {name: 'testuser3', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};
            const id = await database.addUser(user);

            await database.updatePasswordHash(id, 'newhash');
            const updatedUser = await database.getUserByID(id);
            expect(updatedUser?.passwordHash).toBe('newhash');
        });

        test('altering usernames', async () => {
            const user = {name: 'oldname', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};
            const id = await database.addUser(user);

            await database.updateUsername(id, 'newname');
            const updatedUser = await database.getUserByID(id);
            expect(updatedUser?.name).toBe('newname');
        });

        test('searching for users by IP address', async () => {
            const users = [
                {name: 'testuser4', passwordHash: 'hunter2', registrationTime: 1, ip: '1.2.3.4'},
                {name: 'testuser5', passwordHash: 'hunter2', registrationTime: 1, ip: '1.2.3.63'},
                {name: 'testuser6', passwordHash: 'hunter2', registrationTime: 1, ip: '1.2.8.6'},
                {name: 'testuser7', passwordHash: 'hunter2', registrationTime: 1, ip: '2.1.1.1'},
            ];
            for (const user of users) {
                await database.addUser(user);
            }

            expect(await database.getUsersByIP('1.2.8.6')).toEqual([users[2]]);
            expect(await database.getUsersByIP('1.2.3.*')).toEqual([users[0], users[1]]);
            expect(await database.getUsersByIP('1.2.*')).toEqual([users[0], users[1], users[2]]);
        });

        test('only one user should be allowed for a given name', async () => {
            const user = {name: 'testuser1', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1'};
            const user2 = {name: 'testuser1', passwordHash: 'nothunter2', registrationTime: 65, ip: '127.0.0.2'};

            await database.addUser(user);
            await expect(database.addUser(user2)).rejects.toThrow(/already exists/);
        });
    });

    describe('tokens', () => {
        let userID: number;
        beforeAll(async () => {
            userID = await database.addUser({
                name: 'tokentest', passwordHash: 'hunter2', registrationTime: 1, ip: '127.0.0.1',
            });
        });
        beforeEach(async () => {
            await database.deleteAllTokens(userID);
        });

        test('adding and retrieving tokens', async () => {
            await database.addToken(userID, 'valid token', Date.now() + 10000);
            await database.addToken(userID, 'another valid token', Date.now() + 10000);

            expect(await database.getUserTokens(userID)).toEqual(new Set(['another valid token', 'valid token']));
        });

        test('expired tokens should not be included in #getUserTokens()', async () => {
            await database.addToken(userID, 'valid token', Date.now() + 10000);
            await database.addToken(userID, 'expired token', Date.now() - 1);

            expect(await database.getUserTokens(userID)).toEqual(new Set(['valid token']));
        });

        test('removing tokens', async () => {
            await database.addToken(userID, 'valid token', Date.now() + 10000);
            await database.addToken(userID, 'another valid token', Date.now() + 10000);
            await database.addToken(userID, 'expired token', Date.now() - 1);

            await database.deleteAllTokens(userID);
            const tokens = await database.getUserTokens(userID);
            expect(tokens.size).toBe(0);
        });
    });
});
