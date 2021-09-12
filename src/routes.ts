// Express routes

import fastify, {
    FastifyInstance, FastifyPluginOptions, FastifyReply,
    FastifyRequest, HookHandlerDoneFunction,
} from 'fastify';
import type {FastifyError} from 'fastify-error';
import type {FromSchema} from 'json-schema-to-ts';

import {AuthenticationAPI} from './api';
import {config} from './config';
import {SQLiteDatabase} from './database';
import {
    passwordChangeSchema, passwordOnlySchema, userIDPasswordSchema,
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
    const api = new AuthenticationAPI(new SQLiteDatabase(config.databasePath), config.tokenTTL);

    server.get<{Params: {name: string}}>(
        '/users/:name',
        {schema: {params: {name: {type: 'string'}}}},
        async request => api.getUserID(request.params.name),
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
    server.post<{Querystring: FromSchema<typeof userIDPasswordSchema>}>(
        '/login',
        {schema: {querystring: userIDPasswordSchema}},
        async request => api.createToken(request.query.userid, request.query.password)
    );
    server.post<{Querystring: FromSchema<typeof userIDTokenSchema>}>(
        '/logout',
        {schema: {querystring: userIDTokenSchema}},
        async request => api.deleteAllTokens(request.query.userid, request.query.token)
    );
    server.post<{Querystring: FromSchema<typeof passwordChangeSchema>}>(
        '/changepassword',
        {schema: {querystring: passwordChangeSchema}},
        async request => (
            api.changePassword(request.query.userid, request.query.oldPassword, request.query.newPassword)
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

