/**
 * This module implements a REST-inspired web service for the Monopoly DB hosted
 * on PostgreSQL for Azure.
 *
 * @author: kvlinden
 * @date: Summer, 2020
 * @date: Fall, 2025 (updated to JS->TS, Node version, master->main repo, added SQL injection examples)
 */

import express from 'express';
import pgPromise from 'pg-promise';

// Import types for compile-time checking.
import type { Request, Response, NextFunction } from 'express';
import type { Player, PlayerInput } from './player.js';

// Extra types used only in this file (for games endpoints).
type Game = {
    id: number;
    time: string;
};

type GamePlayerScore = {
    id: number;
    name: string | null;
    score: number;
};

// Set up the database
const db = pgPromise()({
    host: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT as string) || 5432,
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Configure the server and its routes
const app = express();
const port: number = parseInt(process.env.PORT as string) || 3000;
const router = express.Router();

router.use(express.json());

// Health-check
router.get('/', readHello);

// Player endpoints
router.get('/players', readPlayers);
router.get('/players/:id', readPlayer);
router.put('/players/:id', updatePlayer);
router.post('/players', createPlayer);
router.delete('/players/:id', deletePlayer);

// *** NEW: game endpoints for Homework 3 ***

// GET /games - list all games
router.get('/games', readGames);

// GET /games/:id - list players & scores for a specific game
router.get('/games/:id', readGamePlayers);

// DELETE /games/:id - delete a specific game (and its PlayerGame rows)
router.delete('/games/:id', deleteGame);

// For testing only; vulnerable to SQL injection!
// router.get('/bad/players/:id', readPlayerBad);

app.use(router);

// Custom error handler - must be defined AFTER all routes
app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    // Log the full error server-side for debugging
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Send generic error to client (never expose internal details)
    res.status(500).json({
        error: 'An internal server error occurred'
    });
});

app.listen(port, (): void => {
    console.log(`Listening on port ${port}`);
});

/**
 * This utility function standardizes the response pattern for database queries,
 * returning the data using the given response, or a 404 status for null data
 * (e.g., when a record is not found).
 */
function returnDataOr404(response: Response, data: unknown): void {
    if (data == null) {
        response.sendStatus(404);
    } else {
        response.send(data);
    }
}

/**
 * This endpoint returns a simple hello-world message, serving as a basic
 * health check and welcome message for the API.
 */
function readHello(_request: Request, response: Response): void {
    response.send('Hello, CS 262 Monopoly service!');
}

// ============================================================================
//  PLAYER CRUD FUNCTIONS
// ============================================================================

/**
 * Retrieves all players from the database.
 */
function readPlayers(_request: Request, response: Response, next: NextFunction): void {
    db.manyOrNone('SELECT * FROM Player')
        .then((data: Player[]): void => {
            // data is a list, never null, so returnDataOr404 isn't needed.
            response.send(data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}

/**
 * Retrieves a specific player by ID.
 */
function readPlayer(request: Request, response: Response, next: NextFunction): void {
    db.oneOrNone('SELECT * FROM Player WHERE id=${id}', request.params)
        .then((data: Player | null): void => {
            returnDataOr404(response, data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}

/**
 * This function updates an existing player's information, returning the
 * updated player's ID if successful, or a 404 status if the player doesn't
 * exist.
 */
function updatePlayer(request: Request, response: Response, next: NextFunction): void {
    db.oneOrNone(
        'UPDATE Player SET email=${body.email}, name=${body.name} WHERE id=${params.id} RETURNING id',
        {
            params: request.params,
            body: request.body as PlayerInput
        }
    )
        .then((data: { id: number } | null): void => {
            returnDataOr404(response, data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}

/**
 * This function creates a new player in the database based on the provided
 * email and name, returning the newly created player's ID. The database is
 * assumed to automatically assign a unique ID using auto-increment.
 */
function createPlayer(request: Request, response: Response, next: NextFunction): void {
    db.one(
        'INSERT INTO Player(email, name) VALUES (${email}, ${name}) RETURNING id',
        request.body as PlayerInput
    )
        .then((data: { id: number }): void => {
            // New players are always created, so returnDataOr404 isn't needed.
            response.send(data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}

/**
 * This function deletes an existing player based on ID.
 *
 * Deleting a player requires cascading deletion of PlayerGame records first to
 * maintain referential integrity.
 */
function deletePlayer(request: Request, response: Response, next: NextFunction): void {
    db.tx((t) => {
        return t
            .none('DELETE FROM PlayerGame WHERE playerID=${id}', request.params)
            .then(() => {
                return t.oneOrNone(
                    'DELETE FROM Player WHERE id=${id} RETURNING id',
                    request.params
                );
            });
    })
        .then((data: { id: number } | null): void => {
            returnDataOr404(response, data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}

// ============================================================================
//  NEW GAME ENDPOINTS FOR HOMEWORK 3
// ============================================================================

/**
 * GET /games
 * Returns a list of all games.
 * Example row: { "id": 2, "time": "2006-06-28T13:20:00.000Z" }
 */
function readGames(_request: Request, response: Response, next: NextFunction): void {
    db.manyOrNone('SELECT * FROM Game ORDER BY id')
        .then((data: Game[]): void => {
            response.send(data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}

/**
 * GET /games/:id
 * Returns the players & scores for the given game.
 * Example row: { "id": 1, "name": "unknown", "score": 1000 }
 */
function readGamePlayers(request: Request, response: Response, next: NextFunction): void {
    const sql = `
        SELECT p.id, p.name, pg.score
        FROM PlayerGame pg
        JOIN Player p ON pg.playerID = p.id
        WHERE pg.gameID = ${'${id}'}
        ORDER BY p.id;
    `;

    db.manyOrNone(sql, request.params)
        .then((data: GamePlayerScore[]): void => {
            response.send(data); // [] if no players
        })
        .catch((error: Error): void => {
            next(error);
        });
}


/**
 * DELETE /games/:id
 * Deletes a game and all of its PlayerGame records in a single transaction.
 */
function deleteGame(request: Request, response: Response, next: NextFunction): void {
    db.tx((t) => {
        return t
            .none('DELETE FROM PlayerGame WHERE gameID=${id}', request.params)
            .then(() => {
                return t.oneOrNone(
                    'DELETE FROM Game WHERE id=${id} RETURNING id',
                    request.params
                );
            });
    })
        .then((data: { id: number } | null): void => {
            returnDataOr404(response, data);
        })
        .catch((error: Error): void => {
            next(error);
        });
}
