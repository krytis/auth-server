// Index file
import fastify from 'fastify';
import {config} from './config-loader';

import {addRoutes, errorHandler} from './routes';

// TODO:
// - tests for routes (start server? use Fastify?)
// - investigate need to verify the authentication token via Redis (from @krytis/core)

async function startServer(port: number) {
    const server = fastify();
    server.setErrorHandler(errorHandler);
    await server.register(addRoutes);
    await server.listen(port);
    console.log(`Server listening on port ${port}`);
}

/* eslint-disable-next-line @typescript-eslint/no-floating-promises */
startServer(config.port);
