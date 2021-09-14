/**
 * Overall server tests
 */

jest.mock('../config', () => ({
    config: {databasePath: ':memory:', port: -1, tokenTTL: 100000, tokenSize: 4, listenAddress: '127.0.0.1'},
}));
import {createServer} from '../routes';

describe('Krytis reference authentication server', () => {
    test('user creation, authentication, and logout', async () => {
        const server = await createServer();

        const username = 'testuser';
        // create user
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username, password: 'hunter2'},
        });
        const userid = JSON.parse(userResponse.body).id;
        expect(userid).toEqual(expect.any(Number));
        expect(userid).toBeGreaterThanOrEqual(0);
        expect(Math.floor(userid)).toBe(userid);

        // authenticate user
        const loginResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username, password: 'hunter2'},
        });
        const loginJSON = JSON.parse(loginResponse.body);
        expect(loginJSON).toHaveProperty('token');
        expect(loginJSON).toHaveProperty('expiresAt');
        expect(loginJSON.id).toBe(userid);
        const token = loginJSON.token;

        // validate token
        const validationSuccessResponse = await server.inject({
            method: 'POST',
            url: '/validatetoken',
            query: {userid, token},
        });
        expect(JSON.parse(validationSuccessResponse.body)).toEqual({valid: true});

        // check an invalid token
        const validationFailureResponse = await server.inject({
            method: 'POST',
            url: '/validatetoken',
            query: {userid, token: 'not a valid token'},
        });
        expect(JSON.parse(validationFailureResponse.body)).toEqual({valid: false});

        // logout
        const logoutResponse = await server.inject({
            method: 'POST',
            url: '/logout',
            query: {userid, token},
        });
        expect(JSON.parse(logoutResponse.body)).toEqual({success: true});
        // after logout, should no longer validate token...
        const validationAfterLogoutResponse = await server.inject({
            method: 'POST',
            url: '/validatetoken',
            query: {userid, token},
        });
        expect(JSON.parse(validationAfterLogoutResponse.body)).toEqual({valid: false});
        // but should be able to authenticate again
        const loginAgainResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username, password: 'hunter2'},
        });
        expect(JSON.parse(loginAgainResponse.body)).toHaveProperty('token');
    });

    test('password changes', async () => {
        const server = await createServer();

        // create user
        const username = 'passwordchangeuser';
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username, password: 'initial password'},
        });
        const userid = JSON.parse(userResponse.body).id;

        // change password
        const pwChangeResponse = await server.inject({
            method: 'PUT',
            url: `/users/${userid as number}/password`,
            query: {oldPassword: 'initial password', newPassword: 'new password'},
        });
        expect(JSON.parse(pwChangeResponse.body)).toEqual({success: true});

        // old password shouldn't work
        const oldPWLoginResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username, password: 'initial password'},
        });
        expect(JSON.parse(oldPWLoginResponse.body)).not.toHaveProperty('token');

        // but new password should
        const newPWLoginResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username, password: 'new password'},
        });
        expect(JSON.parse(newPWLoginResponse.body)).toHaveProperty('token');
    });

    test('deleting a user', async () => {
        const server = await createServer();

        // create user
        const username = 'usertodelete';
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username, password: 'hunter2'},
        });
        const userid = JSON.parse(userResponse.body).id;

        // should authenticate
        const beforeDeletion = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username, password: 'hunter2'},
        });
        const beforeJSON = JSON.parse(beforeDeletion.body);
        expect(beforeJSON).toHaveProperty('token');
        expect(beforeJSON).toHaveProperty('expiresAt');
        expect(beforeJSON.id).toBe(userid);

        // delete user
        const deletionResponse = await server.inject({
            method: 'DELETE',
            url: `/users/${userid as number}`,
            query: {password: 'hunter2'},
        });
        expect(JSON.parse(deletionResponse.body)).toEqual({success: true});

        // should no longer authenticate
        const afterDeletion = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username, password: 'hunter2'},
        });
        const afterJSON = JSON.parse(afterDeletion.body);
        expect(afterJSON).not.toHaveProperty('token');
        expect(afterJSON).not.toHaveProperty('expiresAt');
        expect(afterJSON.id).not.toBe(userid);
    });

    test(`getting a user's name`, async () => {
        const server = await createServer();

        // create user
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username: 'myuser', password: 'hunter2'},
        });
        const userid: string = JSON.parse(userResponse.body).id;

        const nameResponse = await server.inject({
            method: 'GET',
            url: `/users/${userid}`,
        });
        expect(JSON.parse(nameResponse.body)).toEqual({name: 'myuser'});
    });
});
