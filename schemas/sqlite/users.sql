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
    id INTEGER NOT NULL,
    token TEXT NOT NULL,
    -- UNIX timestamp in milliseconds
    expires_at INTEGER NOT NULL,
    PRIMARY KEY (id, token),
    FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE db_info (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);
INSERT INTO db_info (key, value) VALUES ('version', '1');
