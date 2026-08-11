# Dummy Express Property Management Prototype

This project is a simple backend prototype for a Property Management CRUD application. It uses Node.js, Express, TypeScript, Prisma, PostgreSQL on Supabase, Zod, Multer, and CORS.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Supabase)
- Zod
- Multer
- CORS
- dotenv

## Folder Structure

- src/app.ts - Express app setup
- src/server.ts - HTTP server entry point
- src/modules/properties - routes, controller, service, and validation schema
- src/middleware - upload, error, and 404 handlers
- prisma/schema.prisma - Prisma schema

## Installation

```bash
npm install
```

## Environment Setup

Copy the example environment file and update the values:

```bash
cp .env.example .env
```

Set your Neon PostgreSQL connection string in the DATABASE_URL variable. The application validates required environment variables when it starts.

## Prisma Setup

Generate the Prisma client:

```bash
npx prisma generate
```

Create and apply a migration:

```bash
npx prisma migrate dev --name init
```

For a deployed environment, apply committed migrations with:

```bash
npx prisma migrate deploy
```

## Start the Development Server

```bash
npm run dev
```

## API Documentation

See the [Property API reference](docs/API.md) for all endpoints, request fields, response formats, image handling, validation rules, errors, and curl examples.
