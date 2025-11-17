/**
 * This module implements direct Postgres access to the Monopoly DB hosted on
 * Azure PostgreSQL. Notes:
 *
 * - Because the PGP connection variables are stored as Azure config vars, store
 * those values in `.env` (stored locally and listed in `.gitignore` so that
 * they're not pushed to GitHub). Here's the pattern.
 *      export DB_SERVER=??.postgres.database.azure.com
 *      export DB_PORT=5432
 *      export DB_DATABASE=postgres
 *      export DB_USER=??
 *      export DB_PASSWORD=??
 *      export NODE_ENV=production
 *
 * - Directly accessing the database in this manner is not suitable for
 * production use.
 *
 * - As with `monopolyService.ts`, this service is written in TypeScript and
 * uses Node type-stripping.
 *
 * - This required adding my local public IP address to the Azure database
 * networking firewall access list.
 *
 * To execute locally, run the following in Linux:
 *      source .env
 *      npm run direct
 *
 * @author: kvlinden
 * @date: Summer, 2020
 * @date: Fall, 2025 - updates for Azure PostgreSQL and TypeScript
 */

// CommonJS imports for Node.js 22.6+ type stripping compatibility
import pgPromise from 'pg-promise';
const pgp = pgPromise();

// Import types
import type { Player } from './player.js';

// Set up the database connection.
const database = pgp({
    host: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT as string) || 5432,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // For SSL, see: https://stackoverflow.com/questions/22301722/ssl-for-postgresql-connection-nodejs
    ssl: false,
});

// Send the SQL command directly to Postgres.
database.manyOrNone('SELECT * FROM Player')
    .then((data: Player[]): void => {
        console.log(data);
    })
    .catch((error: Error): void => {
        console.log('ERROR:', error);
    });
