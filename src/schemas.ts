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

export const userIDPasswordSchema = {
    type: 'object',
    properties: {
        userid: {type: 'number'},
        password: {type: 'string'},
    },
    required: ['userid', 'password'],
} as const;

export const passwordOnlySchema = {
    type: 'object',
    properties: {
        password: {type: 'string'},
    },
    required: ['password'],
} as const;

export const userIDTokenSchema = {
    type: 'object',
    properties: {
        userid: {type: 'number'},
        token: {type: 'string'},
    },
    required: ['userid', 'token'],
} as const;

export const passwordChangeSchema = {
    type: 'object',
    properties: {
        userid: {type: 'number'},
        newPassword: {type: 'string'},
        oldPassword: {type: 'string'},
    },
    required: ['userid', 'newPassword', 'oldPassword'],
} as const;
