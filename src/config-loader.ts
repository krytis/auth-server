/**
 * Loads configuration
 */

export interface Config {
    /** The port that the server should listen on */
    port: number;
    /** The path to the SQLite database to use */
    databasePath: string;
}

function loadConfig(): Config {
    try {
        /* eslint-disable-next-line @typescript-eslint/no-var-requires */
        return require('./config').configuration;
    } catch (err: any) {
        if (err.code === 'MODULE_NOT_FOUND') {
            throw new Error(`Cannot load configuration file; check that src/config.ts exists.`);
        } else {
            throw err;
        }
    }
}

export const config = loadConfig();
