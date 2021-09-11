/**
 * Overall server tests
 */

jest.mock('../config-loader', () => ({
    config: {databasePath: ':memory:', port: -1, tokenTTL: 100000, listenAddress: '127.0.0.1'},
}));
import {createServer} from '../routes';

describe('Krytis reference authentication server', () => {
    test('user creation, authentication, and logout', async () => {
        const server = await createServer();

        // create user
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username: 'testuser', password: 'hunter2'},
        });
        expect(JSON.parse(userResponse.body)).toEqual({success: true});

        // authenticate user
        const loginResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username: 'testuser', password: 'hunter2'},
        });
        const loginJSON = JSON.parse(loginResponse.body);
        expect(loginJSON).toHaveProperty('token');
        const token = loginJSON.token;

        // validate token
        const validationSuccessResponse = await server.inject({
            method: 'POST',
            url: '/validatetoken',
            query: {username: 'testuser', token},
        });
        expect(JSON.parse(validationSuccessResponse.body)).toEqual({valid: true});

        // check an invalid token
        const validationFailureResponse = await server.inject({
            method: 'POST',
            url: '/validatetoken',
            query: {username: 'testuser', token: 'not a valid token'},
        });
        expect(JSON.parse(validationFailureResponse.body)).toEqual({valid: false});

        // logout
        const logoutResponse = await server.inject({
            method: 'POST',
            url: '/logout',
            query: {username: 'testuser', token},
        });
        expect(JSON.parse(logoutResponse.body)).toEqual({success: true});
        // after logout, should no longer validate token...
        const validationAfterLogoutResponse = await server.inject({
            method: 'POST',
            url: '/validatetoken',
            query: {username: 'testuser', token},
        });
        expect(JSON.parse(validationAfterLogoutResponse.body)).toEqual({valid: false});
        // but should be able to authenticate again
        const loginAgainResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username: 'testuser', password: 'hunter2'},
        });
        expect(JSON.parse(loginAgainResponse.body)).toHaveProperty('token');
    });

    test('password changes', async () => {
        const server = await createServer();

        // create user
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username: 'passwordchangeuser', password: 'initial password'},
        });
        expect(JSON.parse(userResponse.body)).toEqual({success: true});

        // change password
        const pwChangeResponse = await server.inject({
            method: 'POST',
            url: '/changepassword',
            query: {username: 'passwordchangeuser', oldPassword: 'initial password', newPassword: 'new password'},
        });
        expect(JSON.parse(pwChangeResponse.body)).toEqual({success: true});

        // old password shouldn't work
        const oldPWLoginResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username: 'passwordchangeuser', password: 'initial password'},
        });
        expect(JSON.parse(oldPWLoginResponse.body)).not.toHaveProperty('token');

        // but new password should
        const newPWLoginResponse = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username: 'passwordchangeuser', password: 'new password'},
        });
        expect(JSON.parse(newPWLoginResponse.body)).toHaveProperty('token');
    });

    test('deleting a user', async () => {
        const server = await createServer();

        // create user
        const userResponse = await server.inject({
            method: 'POST',
            url: '/users',
            query: {username: 'usertodelete', password: 'hunter2'},
        });
        expect(JSON.parse(userResponse.body)).toEqual({success: true});

        // should authenticate
        const beforeDeletion = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username: 'usertodelete', password: 'hunter2'},
        });
        expect(JSON.parse(beforeDeletion.body)).toHaveProperty('token');

        // delete user
        const deletionResponse = await server.inject({
            method: 'DELETE',
            url: '/users/usertodelete',
            query: {username: 'usertodelete', password: 'hunter2'},
        });
        expect(JSON.parse(deletionResponse.body)).toEqual({success: true});

        // should no longer authenticate
        const afterDeletion = await server.inject({
            method: 'POST',
            url: '/login',
            query: {username: 'usertodelete', password: 'hunter2'},
        });
        expect(JSON.parse(afterDeletion.body)).not.toHaveProperty('token');
    });
});
