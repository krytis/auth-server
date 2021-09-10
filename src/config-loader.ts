/**
 * Loads configuration
 */

import * as path from 'path';
import * as fs from 'fs';

const BAD_PORT_ERROR = (
    `PORT must be specified in .env or as an environment variable as an integer between 1 and 49151.`
);
export interface Config {
    /** The port that the server should listen on */
    port: number;
    /** The path to the SQLite database to use */
    databasePath: string;
}

function loadConfig(): Config {
    if (!process.env.PORT) throw new Error(BAD_PORT_ERROR);
    const port = parseInt(process.env.PORT);
    if (port < 1 || port > 49151) throw new Error(BAD_PORT_ERROR);
    if (Math.floor(port) !== port) throw new Error(BAD_PORT_ERROR);

    const root = path.resolve(__dirname, '..');
    if (!process.env.DATABASE_PATH) {
        throw new Error(
            `DATABASE_PATH must be specified in .env or as an environment variable ` +
            `as a path (absolute or relative to ${root}) to a SQLite database.`
        );
    }
    const databasePath = path.resolve(root, process.env.DATABASE_PATH);
    const directory = path.parse(databasePath).dir;
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
        throw new Error(`The database specified in DATABASE_PATH must be in a directory that exists.`);
    }

    return {port, databasePath};
}

export const config = loadConfig();
