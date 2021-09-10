# auth-server
[![CI](https://github.com/krytis/auth-server/actions/workflows/ci.yml/badge.svg)](https://github.com/krytis/auth-server/actions/workflows/ci.yml) [![codecov](https://codecov.io/gh/krytis/auth-server/branch/main/graph/badge.svg?token=XQ0LE9ZV29)](https://codecov.io/gh/krytis/auth-server)

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

### Running
The server can be built and run with the following commands, run from within the `auth-server/` directory:
```bash
npm install --production
npm start
```

## Considerations
`auth-server` does not provide HTTPS support; in production environments, it should always be run behind a reverse proxy that is configured to use SSL.

## API
The authentication server exposes the following endpoints, all via HTTP `POST` requests with the parameters specified in a query string (e.g. `POST https://my.authserv.er/endpoint?param1=value1&param2=value2`):
### `/createuser`
Creates a new user.
#### Required parameters
- `username`: the username of the user to be created. Note that usernames are case-sensitive and can include non-alphanumeric characters.
- `password`: the password to use for the user
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "User <username> already exists"}` or equivalent JSON if a user by the same name already exists

### `/deleteuser`
Deletes an existing user.
#### Required parameters
- `username`: the username of the user to delete
- `password`: the user's password
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "Incorrect username/password"}` or equivalent JSON if the username/password pair is not correct (including if the user doesn't exist)

### `/changepassword`
Changes a user's password.
#### Required parameters
- `username`: the username of the user whose password is being changed
- `oldPassword`: the user's current password
- `newPassword`: the new password desired for the user
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "Incorrect username/password"}` or equivalent JSON if the username/password pair is not correct (including if the user doesn't exist)

### `/login`
Logs in, returning an authentication token.
#### Required parameters
- `username`: the username of the user to log in as
- `password`: the user's password
#### Response
- `{"token": <token>, "expiresAt": <timestamp>}` or equivalent JSON on success, where `<token>` is an authentication token (long random string) that can be used on other API endpoints, and `<timestamp>` is the number of milliseconds since the UNIX epoch at which the token expires
- `{"error": "Incorrect username/password"}` or equivalent JSON if the username/password pair is not correct (including if the user doesn't exist)

### `/logout`
Logs out, invalidating all tokens for a user.
#### Required parameters
- `username`: the username of the user to log out from
- `token`: an authentication token for the user
#### Response
- `{"success": true}` or equivalent JSON on success
- `{"error": "Incorrect username/token"}` or equivalent JSON if the username/token pair is not correct (including if the user doesn't exist)

### `/validatetoken`
Checks if a user/token pair is valid.
#### Required parameters
- `username`: the username of the user to validate
- `token`: an authentication token for the user
#### Response
- `{"valid": true}` or equivalent JSON if the token is valid
- `{"valid": false}` or equivalent JSON if the token is invalid (or a server error occurs)
