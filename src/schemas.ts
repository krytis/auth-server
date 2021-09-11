/**
 * JSON schemas
 */

export const usernamePasswordSchema = {
    type: 'object',
    properties: {
        username: {type: 'string'},
        password: {type: 'string'},
    },
    required: ['username', 'password'],
} as const;

export const passwordOnlySchema = {
    type: 'object',
    properties: {
        password: {type: 'string'},
    },
    required: ['password'],
} as const;

export const usernameTokenSchema = {
    type: 'object',
    properties: {
        username: {type: 'string'},
        token: {type: 'string'},
    },
    required: ['username', 'token'],
} as const;

export const passwordChangeSchema = {
    type: 'object',
    properties: {
        username: {type: 'string'},
        newPassword: {type: 'string'},
        oldPassword: {type: 'string'},
    },
    required: ['username', 'newPassword', 'oldPassword'],
} as const;
