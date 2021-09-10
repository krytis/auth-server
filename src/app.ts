// Index file
import {config} from './config-loader';
import {startServer} from './routes';

// TODO:
// - tests for routes (start server? use Fastify?)s

startServer(config.port).then(
    () => console.log(`Krytis reference authentication server listening on port ${config.port}.`),
    err => console.error(`Error starting server: ${err as string}`),
);
