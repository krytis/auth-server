// Express routes

import fastify, {
    FastifyInstance, FastifyPluginOptions, FastifyReply,
    FastifyRequest, HookHandlerDoneFunction, FastifyError,
} from 'fastify';
import type {FromSchema} from 'json-schema-to-ts';

import {AuthenticationAPI} from './api';
import {config} from './config';
import {SQLiteDatabase} from './database';
import {
    passwordChangeSchema, passwordOnlySchema,
    usernamePasswordSchema, userIDTokenSchema,
} from './schemas';

async function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    if (error.name === 'PublicFacingError') {
        await reply.send({error: error.message});
    } else {
        console.error(`ERROR: ${error.stack as string}`);
        await reply.status(500).send({error: 'Unknown error'});
    }
}

function addRoutes(server: FastifyInstance, options: FastifyPluginOptions, done: HookHandlerDoneFunction) {
    const api = new AuthenticationAPI(new SQLiteDatabase(config.databasePath), config.tokenTTL, config.tokenSize);

    server.get<{Params: {id: number}}>(
        '/users/:id',
        {schema: {params: {id: {type: 'number'}}}},
        async request => api.getUserName(request.params.id),
    );
    server.post<{Querystring: FromSchema<typeof usernamePasswordSchema>}>(
        '/users',
        {schema: {querystring: usernamePasswordSchema}},
        async request => api.createUser(request.query.username, request.query.password, request.ip)
    );
    server.delete<{Querystring: FromSchema<typeof passwordOnlySchema>; Params: {id: number}}>(
        '/users/:id',
        {schema: {querystring: passwordOnlySchema, params: {id: {type: 'number'}}}},
        async request => api.deleteUser(request.params.id, request.query.password)
    );
    server.post<{Querystring: FromSchema<typeof usernamePasswordSchema>}>(
        '/login',
        {schema: {querystring: usernamePasswordSchema}},
        async request => api.createToken(request.query.username, request.query.password)
    );
    server.post<{Querystring: FromSchema<typeof userIDTokenSchema>}>(
        '/logout',
        {schema: {querystring: userIDTokenSchema}},
        async request => api.deleteAllTokens(request.query.userid, request.query.token)
    );
    server.put<{Querystring: FromSchema<typeof passwordChangeSchema>; Params: {id: number}}>(
        '/users/:id/password',
        {schema: {querystring: passwordChangeSchema, params: {id: {type: 'number'}}}},
        async request => (
            api.changePassword(request.params.id, request.query.oldPassword, request.query.newPassword)
        ),
    );
    server.post<{Querystring: FromSchema<typeof userIDTokenSchema>}>(
        '/validatetoken',
        {schema: {querystring: userIDTokenSchema}},
        async request => api.validateToken(request.query.userid, request.query.token)
    );

    server.get('/', async (request, reply) => {
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

export async function createServer() {
    const server = fastify();
    // This is a bug in Fastify's types; see https://github.com/fastify/fastify/pull/3309
    /* eslint-disable @typescript-eslint/no-misused-promises */
    server.setErrorHandler(errorHandler);
    await server.register(addRoutes);
    return server;
}

export async function startServer(port: number, address: string) {
    const server = await createServer();
    await server.listen(port, address);
}

