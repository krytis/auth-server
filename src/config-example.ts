/**
 * Configuration. Copy this file to src/config.ts and edit it as desired.
 *
 * Options are documented in config-loader.ts.
 */

import type {Config} from './config-loader';

export const configuration: Config = {
    port: 3000,
    databasePath: '../sqlite.db',
};
