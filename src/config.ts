/**
 * Loads configuration
 */

import * as path from 'path';
import * as fs from 'fs';

const BAD_PORT_ERROR = (
    `PORT must be specified in .env or as an environment variable as an integer between 1 and 49151.`
);

/* eslint-disable-next-line max-len */
const IP_REGEX = /(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9]?[0-9])/;

export interface Config {
    /** The port that the server should listen on */
    port: number;
    /** The path to the SQLite database to use */
    sqliteDBPath?: string;
    /** PostgreSQL configuration */
    postgresConfig?: {user: string; password: string; host: string; port: number; database: string};
    /** The time, in milliseconds, a token should be valid for. Defaults to 60480000 (one week). */
    tokenTTL: number;
    /** The size, in bytes, of a token. Defaults to 32. */
    tokenSize: number;
    /** The IP address that the server should listen on. Defaults to 127.0.0.1. */
    listenAddress: string;
}

function loadConfig(): Config {
    if (!process.env.PORT) throw new Error(BAD_PORT_ERROR);
    const port = parseInt(process.env.PORT);
    if (port < 1 || port > 49151 || isNaN(port)) throw new Error(BAD_PORT_ERROR);
    if (Math.floor(port) !== port) throw new Error(BAD_PORT_ERROR);

    const root = path.resolve(__dirname, '..');

    const config: Config = {port, tokenTTL: 60480000, tokenSize: 32, listenAddress: '127.0.0.1'};
    if (process.env.SQLITE_PATH) {
        if (process.env.PG_USER) throw new Error(`Cannot specify configuration for both PostgreSQL and SQLite.`);
        const sqliteDBPath = path.resolve(root, process.env.SQLITE_PATH);
        const directory = path.parse(sqliteDBPath).dir;
        if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
            throw new Error(`The database specified in SQLITE_PATH must be in a directory that exists.`);
        }
        config.sqliteDBPath = sqliteDBPath;
    } else {
        if (!process.env.PG_USER) {
            throw new Error(`One of the environment variables SQLITE_PATH or PG_USER must be specified.`);
        }
        if (!process.env.PG_PASSWORD) throw new Error(`Must specify PG_PASSWORD when using PostgreSQL.`);
        if (!process.env.PG_DATABASE) throw new Error(`Must specify PG_DATABASE when using PostgreSQL.`);

        const pgPort = parseInt(process.env.PG_PORT || '5432');
        if (isNaN(pgPort) || pgPort < 1 || pgPort > 49151) {
            throw new Error(`The environment variable TOKEN_TTL must be an integer between 1 annd 49151.`);
        }

        config.postgresConfig = {
            user: process.env.PG_USER,
            password: process.env.PG_PASSWORD,
            host: process.env.PG_HOST || '127.0.0.1',
            port: pgPort,
            database: process.env.PG_DATABASE,
        };
    }

    if (process.env.TOKEN_TTL) {
        config.tokenTTL = parseInt(process.env.TOKEN_TTL);
        if (isNaN(config.tokenTTL) || config.tokenTTL < 1) {
            throw new Error(`The environment variable TOKEN_TTL must be a positive integer if it is set.`);
        }
    }

    if (process.env.TOKEN_SIZE) {
        config.tokenSize = parseInt(process.env.TOKEN_SIZE);
        if (isNaN(config.tokenSize) || config.tokenSize < 1) {
            throw new Error(`The environment variable TOKEN_SIZE must be a positive integer if it is set.`);
        }
    }

    if (process.env.LISTEN_ADDRESS) {
        if (!IP_REGEX.test(process.env.LISTEN_ADDRESS)) {
            throw new Error(`The environment variable LISTEN_ADDRESS must be an IP address if it is set.`);
        }
        config.listenAddress = process.env.LISTEN_ADDRESS;
    }

    return config;
}

export const config = loadConfig();
