-- Postgres schema for auth-server

CREATE TABLE users (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    -- UNIX timestamp in milliseconds
    registered_at TIMESTAMP NOT NULL,
    registration_ip INET NOT NULL
);

CREATE TABLE tokens (
    user_id INTEGER NOT NULL,
    -- %%token_length_in_characters%% is replaced by the loading script
    token VARCHAR(%%token_length_in_characters%%) NOT NULL,
    -- UNIX timestamp in milliseconds
    expires_at TIMESTAMP NOT NULL,
    PRIMARY KEY (user_id, token),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
