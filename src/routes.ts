// Express routes

import type {
    FastifyInstance, FastifyPluginOptions, FastifyReply,
    FastifyRequest, HookHandlerDoneFunction,
} from 'fastify';
import type {FastifyError} from 'fastify-error';
import type {FromSchema} from 'json-schema-to-ts';

import {AuthenticationAPI} from './api';
import {config} from './config-loader';
import {SQLiteDatabase} from './database';
import {passwordChangeSchema, usernamePasswordSchema, usernameTokenSchema} from './schemas';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    if (error.name === 'PublicFacingError') {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        reply.send({error: error.message});
    } else {
        console.error(`ERROR: ${error.stack as string}`);
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        reply.status(500).send({error: 'Unknown error'});
    }
}

export function addRoutes(fastify: FastifyInstance, options: FastifyPluginOptions, done: HookHandlerDoneFunction) {
    const api = new AuthenticationAPI(new SQLiteDatabase(config.databasePath));

    fastify.post<{Body: FromSchema<typeof usernamePasswordSchema>}>(
        '/createuser',
        {schema: {body: usernamePasswordSchema}},
        async request => api.createUser(request.body.username, request.body.password, request.ip)
    );
    fastify.post<{Body: FromSchema<typeof usernamePasswordSchema>}>(
        '/deleteuser',
        {schema: {body: usernamePasswordSchema}},
        async request => api.deleteUser(request.body.username, request.body.password)
    );
    fastify.post<{Body: FromSchema<typeof usernamePasswordSchema>}>(
        '/gettoken',
        {schema: {body: usernamePasswordSchema}},
        async request => api.createToken(request.body.username, request.body.password)
    );
    fastify.post<{Body: FromSchema<typeof usernameTokenSchema>}>(
        '/logout',
        {schema: {body: usernameTokenSchema}},
        async request => api.deleteAllTokens(request.body.username, request.body.token)
    );
    fastify.post<{Body: FromSchema<typeof passwordChangeSchema>}>(
        '/changepassword',
        {schema: {body: passwordChangeSchema}},
        async request => api.changePassword(request.body.username, request.body.oldPassword, request.body.newPassword)
    );
    fastify.post<{Body: FromSchema<typeof usernameTokenSchema>}>(
        '/validatetoken',
        {schema: {body: usernameTokenSchema}},
        async request => api.validateToken(request.body.username, request.body.token)
    );

    fastify.get('/', async (request, reply) => {
        await reply
            .type('text/html')
            .send(
                'This is an instance of the reference authentication server ' +
                'for the <a href="https://github.com/krytis/">Krytis project</a>. ' +
                'Please refer to the <a href="https://github.com/krytis/auth-server">documentation</a>.'
            );
    });

    done();
}

