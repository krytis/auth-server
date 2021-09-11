// Index file
import {config} from './config';
import {startServer} from './routes';

// TODO:
// - tests for routes (start server? use Fastify?)s

startServer(config.port, config.listenAddress).then(
    () => console.log(`Authentication server listening on http://${config.listenAddress}:${config.port}/`),
    err => console.error(`Error starting server: ${err as string}`),
);
