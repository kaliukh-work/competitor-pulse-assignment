# CompetitorPulse Backend Specification

## Tech Stack
- Framework: NestJS (TypeScript)
- Database: PostgreSQL
- ORM: Prisma
- Infrastructure: Docker Compose (PostgreSQL DB + Backend + Python Mock LLM)

## Core Entities (Prisma Schema)

### Competitor
- `id`: String (Primary Key) - e.g., 'acme-crm'
- `createdAt`: DateTime
- `snapshots`: Relation to Snapshot

### Snapshot
- `id`: UUID (Primary Key)
- `competitorId`: String (Foreign Key to Competitor)
- `fetchedAt`: DateTime
- `title`: String
- `tagline`: String
- `price`: String
- `description`: String
- `changed`: Boolean
- `summary`: String? (Nullable text from LLM)

## API Contract (Must Match Exactly)
- `GET /api/competitors` -> Returns `[{ "id": string }, ...]`
- `POST /api/competitors` -> Body: `{ "id": string }` -> Returns `201 Created`
- `DELETE /api/competitors/:id` -> Returns `204 No Content`
- `GET /api/competitors/:id/snapshots` -> Returns `[Snapshot, ...]` ordered by `fetchedAt` DESC (newest first).

## Data Source Stub (Internal Function)
Create an internal service that acts as the data provider. It should read from ./fixtures/listings.json. 
- For a given `competitorId`, each time it's called, it must return the NEXT object in that competitor's array.
- It must maintain an internal per-competitor counter.
- When the array is exhausted, it must continually return the LAST object in the array.

## Background Job (Scheduler) Logic
1. Run a cron job periodically (configurable via `.env`, e.g., every 30 seconds for testing).
2. Fetch all tracked competitors from the DB.
3. For each competitor, call the Data Source Stub to get the current snapshot.
4. Fetch the most recent Snapshot from the DB for this competitor.
5. Compare the newly fetched data (title, tagline, price, description) with the most recent DB Snapshot.
6. **Persistence Rule:** ALWAYS save the new snapshot to the database immediately.
   - If identical (or if it's the very first fetch): `changed: false`, `summary: null`.
   - If different: `changed: true`, `summary: null`.
7. **LLM Integration:** If `changed: true`, make an asynchronous HTTP POST call to the Mock LLM server (`http://mock-llm:4001/v1/chat/completions`). Send the old snapshot fields and new snapshot fields in the prompt.
8. Upon successful LLM response, update the saved Snapshot record with the generated `summary`. The backend must catch any timeout or 500 error from the LLM and leave the summary as `null` without crashing.