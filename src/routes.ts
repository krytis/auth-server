// Express routes

import fastify, {
    FastifyInstance, FastifyPluginOptions, FastifyReply,
    FastifyRequest, HookHandlerDoneFunction,
} from 'fastify';
import type {FastifyError} from 'fastify-error';
import type {FromSchema} from 'json-schema-to-ts';

import {AuthenticationAPI} from './api';
import {config} from './config-loader';
import {SQLiteDatabase} from './database';
import {passwordChangeSchema, usernamePasswordSchema, usernameTokenSchema} from './schemas';

function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
    if (error.name === 'PublicFacingError') {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        reply.send({error: error.message});
    } else {
        console.error(`ERROR: ${error.stack as string}`);
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        reply.status(500).send({error: 'Unknown error'});
    }
}

function addRoutes(server: FastifyInstance, options: FastifyPluginOptions, done: HookHandlerDoneFunction) {
    const api = new AuthenticationAPI(new SQLiteDatabase(config.databasePath));

    server.post<{Querystring: FromSchema<typeof usernamePasswordSchema>}>(
        '/createuser',
        {schema: {querystring: usernamePasswordSchema}},
        async request => api.createUser(request.query.username, request.query.password, request.ip)
    );
    server.post<{Querystring: FromSchema<typeof usernamePasswordSchema>}>(
        '/deleteuser',
        {schema: {querystring: usernamePasswordSchema}},
        async request => api.deleteUser(request.query.username, request.query.password)
    );
    server.post<{Querystring: FromSchema<typeof usernamePasswordSchema>}>(
        '/login',
        {schema: {querystring: usernamePasswordSchema}},
        async request => api.createToken(request.query.username, request.query.password)
    );
    server.post<{Querystring: FromSchema<typeof usernameTokenSchema>}>(
        '/logout',
        {schema: {querystring: usernameTokenSchema}},
        async request => api.deleteAllTokens(request.query.username, request.query.token)
    );
    server.post<{Querystring: FromSchema<typeof passwordChangeSchema>}>(
        '/changepassword',
        {schema: {querystring: passwordChangeSchema}},
        async request => (
            api.changePassword(request.query.username, request.query.oldPassword, request.query.newPassword)
        ),
    );
    server.post<{Querystring: FromSchema<typeof usernameTokenSchema>}>(
        '/validatetoken',
        {schema: {querystring: usernameTokenSchema}},
        async request => api.validateToken(request.query.username, request.query.token)
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
    server.setErrorHandler(errorHandler);
    await server.register(addRoutes);
    return server;
}

export async function startServer(port: number) {
    const server = await createServer();
    await server.listen(port);
}

