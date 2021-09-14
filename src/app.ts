// Index file
import {config} from './config';
import {startServer} from './routes';

startServer(config.port, config.listenAddress).then(
    () => console.log(`Authentication server listening on http://${config.listenAddress}:${config.port}/`),
    err => console.error(`Error starting server: ${err as string}`),
);
