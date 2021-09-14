-- schema for the users database

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    -- UNIX timestamp in milliseconds
    registered_at INTEGER NOT NULL,
    registration_ip TEXT NOT NULL
);

CREATE TABLE tokens (
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL,
    -- UNIX timestamp in milliseconds
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, token),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
