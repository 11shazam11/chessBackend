#  Chess Tournament Backend API

> Backend service for the Chess Tournament platform  
> Handles authentication, tournaments, rounds, matches, and winner progression.

---

#  Overview

This backend powers the Chess Tournament system.  
It provides REST APIs for:

- User authentication
- Tournament management
- Player registration
- Round generation
- Match creation
- BYE handling
- Winner tracking
- Next-round advancement
- Tournament completion detection

Built with a transactional design so rounds and matches are always consistent.

---

#  Tech Stack

- Node.js
- Express.js
- PostgreSQL
- pg (node-postgres)
- JWT Authentication
- Cookie-based auth support
- Transactional queries
- Deployed on Railway

---

#  Getting Started

## Install dependencies

```bash
npm install
```

## Run development server

```bash
npm run dev
```

## Run production server

```bash
npm start
```

---

# ⚙️ Environment Variables

Create a `.env` file:

```env
PORT=5000
DATABASE_URL=postgres://user:pass@host:5432/db
JWT_SECRET=your_secret
JWT_EXPIRES=1d
CORS_ORIGIN=https://your-frontend.vercel.app
```

---

#  API Base URL

```text
https://your-domain/api
```

Example:

```text
POST /api/users/login
POST /api/tournaments
POST /api/rounds/create
POST /api/rounds/next
```

---

#  Project Structure

```bash
backend/
│
├── config/
│   ├── db.js
│   ├── applicationError.js
│
├── features/
│   ├── Users/
│   ├── Tournaments/
│   ├── Rounds/
│   ├── Matches/
│
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│
├── routes/
│
├── app.js
├── server.js
```

---

#  Authentication System

## Login Flow

```text
POST /api/users/login
    ↓
Validate credentials
    ↓
Generate JWT
    ↓
Return token / set cookie
```

## Token Payload

```json
{
  "id": "user_id",
  "name": "username",
  "role": "organizer"
}
```

## Protected Routes

Middleware checks:

```text
Authorization header OR cookie token
```

---

#  Tournament Engine — Core Features

## Tournament Creation

```text
Create tournament
Add players
Store ratings
Ready for round generation
```

---

#  Round Generation Logic

## Round Creation

```text
Input:
- tournamentId
- roundNumber
- seeding policy
- bye policy
```

## Seeding Modes

```text
rating  → sort by rating desc
random  → shuffle players
```

---

#  BYE Logic (Odd Player Count)

If player count is odd:

Policy decides who gets BYE:

```text
random   → random player
lowest   → lowest rating
highest  → highest rating
```

BYE match is stored as:

```text
is_bye = true
result = white_win
winner_player_id = player
ended_at = now()
```

So BYE flows like a normal win in next round selection.

---

#  Match Creation Rules

For each pair:

```text
Pair sequential players
Randomly assign white/black
Insert match with result = pending
```

Stored fields:

```text
white_player_id
black_player_id
result
is_bye
winner_player_id
```

---

#  Next Round Advancement

## Endpoint Purpose

Advance tournament after a round finishes.

## Steps

```text
Check round exists
Check all matches finished
Fetch winners
```

## If only one winner remains

Response:

```json
{
  "status": "COMPLETED",
  "winner": { "playerId": "..." }
}
```

Frontend should declare champion.

## If multiple winners

Create next round using same engine.

Response:

```json
{
  "status": "ADVANCED",
  "round": { "id": "...", "roundNumber": 2 },
  "matches": []
}
```

---

#  Data Consistency Design

All round + match creation runs inside DB transactions:

```text
BEGIN
insert round
insert matches
COMMIT
```

On any error:

```text
ROLLBACK
```

Prevents half-created rounds.

---

#  Database Core Tables

## users

```text
id
name
email
password_hash
role
```

## tournaments

```text
id
name
created_by
status
```

## tournament_players

```text
tournament_id
user_id
rating
```

## rounds

```text
id
tournament_id
round_number
```

## matches

```text
id
round_id
white_player_id
black_player_id
result
is_bye
winner_player_id
started_at
ended_at
```

---

#  Error Handling

Custom error class:

```js
ApplicationError(statusCode, message)
```

Used for:

```text
400 → bad request
401 → auth error
404 → not found
500 → server error
```

Global error middleware formats responses.

---

#  Debug Tips

Log critical values before queries:

```js
console.log({ tournamentId, roundNumber });
```

Validate integers before DB insert.

Never pass undefined to SQL params.

---

#  Deployment Notes

Backend is configured for:

- Railway deployment
- PostgreSQL connection string
- Environment-based secrets
- CORS-controlled frontend access

---

#  Recommended Future Enhancements

- Swiss pairing mode
- Tie-breaker scoring
- Draw resolution rules
- Match clocks
- Audit logs
- Admin dashboards



