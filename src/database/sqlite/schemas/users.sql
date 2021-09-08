-- schema for the users database

CREATE TABLE users (
    id TEXT NOT NULL PRIMARY KEY,
    password_hash TEXT NOT NULL,
    -- UNIX timestamp in seconds
    registered_at INTEGER NOT NULL,
    registration_ip TEXT NOT NULL
);

CREATE TABLE db_info (
    key TEXT NOT NULL PRIMARY KEY,
    value TEXT NOT NULL
);