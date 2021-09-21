# `@krytis/auth-server`
[![CI](https://github.com/krytis/auth-server/actions/workflows/ci.yml/badge.svg)](https://github.com/krytis/auth-server/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/krytis/auth-server/branch/main/graph/badge.svg?token=XQ0LE9ZV29)](https://codecov.io/gh/krytis/auth-server) ![License](https://img.shields.io/badge/License-MIT-blue.svg)

An authentication server designed to work with the Krytis ecosystem.

## Installation and setup
### Get the code
You can get the code from GitHub:
```bash
git clone https://github.com/krytis/auth-server.git
```

### Configuration
Within the cloned `auth-server/` directory, you should create a `.env` file that specifies the following configuration variables:
 - `PORT`: the port that the server should listen for HTTP requests on
 - `DATABASE_PATH`: a path to a SQLite database, which will be created on startup if it does not exist. If the path specified isn't absolute, it will be parsed relative to `auth-server/`

The following additional configuration may be specified, but have sane default values:
 - `TOKEN_TTL`: the time that an authentication token will be valid for, in milliseconds. Defaults to `60480000`, or one week.
 - `TOKEN_SIZE`: the size, in **bytes**, of an authentication token. Defaults to `32`.
 - `LISTEN_ADDRESS`: the IP address that the server should listen on. Defaults to `127.0.0.1`, since the server is designed for use with a reverse proxy.

### Running
The server can be built and run with the following commands, run from within the `auth-server/` directory:
```bash
npm install --production
npm start
```

## Considerations
`auth-server` does not provide HTTPS support; in production environments, it should always be run behind a reverse proxy that is configured to use SSL.

## API
The authentication server exposes the following endpoints, via HTTP requests with the parameters specified in a query string (e.g. `POST https://my.authserv.er/endpoint?param1=value1&param2=value2`):
### `POST /users`
Creates a new user.
#### Required parameters
- `username`: the username of the user to be created. Note that usernames are case-sensitive and can include non-alphanumeric characters.
- `password`: the password to use for the user
#### Response
- `{"id": <id>}` or equivalent JSON on success, where `<id>` is a user's numerical ID (which can be used for other API endpoints)
- `{"error": "User <username> already exists"}` or equivalent JSON if the user already exists

### `GET /users/<id>`
Gets the name of the user with the user ID `<id>`.
#### Required parameters
None!
#### Response
- `{"name": <name>}` or equivalent JSON on success, where `<name>` is a user's name
- `{"error": "User <id> does not exist"}` or equivalent JSON if a user by the same name does not exist

### `DELETE /users/<id>`
Deletes the user identified by the `<id>`.
#### Required parameters
- `password`: the user's password
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "Incorrect password"}` or equivalent JSON if the password pair is not correct (including if the user doesn't exist)

### `PUT /users/<id>/password`
Changes a user's password.
#### Required parameters
- `oldPassword`: the user's current password
- `newPassword`: the new password desired for the user
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "Incorrect password"}` or equivalent JSON if the password pair is not correct (including if the user doesn't exist)

### `POST /login`
Logs in, returning an authentication token.
#### Required parameters
- `username`: the user name of the user to log in as
- `password`: the user's password
#### Response
- `{"id": <id>, "token": <token>, "expiresAt": <timestamp>}` or equivalent JSON on success, where `<id>` is the user's ID, `<token>` is an authentication token (long random string) that can be used on other API endpoints, and `<timestamp>` is the number of milliseconds since the UNIX epoch at which the token expires
- `{"error": "Incorrect password"}` or equivalent JSON if the password is not correct
- `{"error": "User <username> does not exist"}` or equivalent JSON if the user does not exist

### `POST /logout`
Logs out, invalidating all tokens for a user.
#### Required parameters
- `userid`: the user ID of the user to log out from
- `token`: an authentication token for the user
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "Incorrect userid/token"}` or equivalent JSON if the userid/token pair is not correct (including if the user doesn't exist)

### `POST /validatetoken`
Checks if a userid/token pair is valid.
#### Required parameters
- `userid`: the user ID of the user to validate
- `token`: an authentication token for the user
#### Response
- `{"valid": true}` or equivalent JSON if the token is valid
- `{"valid": false}` or equivalent JSON if the token is invalid (or a server error occurs)
