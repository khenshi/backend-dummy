# Dummy Express Property Management Prototype

This project is a simple backend prototype for a Property Management CRUD application. It uses Node.js, Express, TypeScript, Prisma, PostgreSQL on Neon, Zod, Multer, and CORS.

## Purpose

The goal is to test the planned stack for a larger Resort Management System without adding unnecessary complexity.

## Tech Stack

- Node.js
- Express.js
- TypeScript
- Prisma ORM
- PostgreSQL (Neon)
- Zod
- Multer
- CORS
- dotenv

## Folder Structure

- src/app.ts - Express app setup
- src/server.ts - HTTP server entry point
- src/modules/properties - routes, controller, service, repository, schema
- src/middleware - upload, error, and 404 handlers
- prisma/schema.prisma - Prisma schema
- uploads/ - local image storage for the prototype

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

## API Endpoints

See the complete [Property API reference](docs/API.md) for request fields, response formats, validation rules, errors, and curl examples.

- GET /api/properties
- GET /api/properties/:id
- POST /api/properties
- PATCH /api/properties/:id
- DELETE /api/properties/:id

## Example Multipart POST Request

```bash
curl -X POST http://localhost:3000/api/properties \
  -F "title=Beach House" \
  -F "description=Ocean view villa" \
  -F "availableDate=2026-09-01T00:00:00.000Z" \
  -F "inspectionAt=2026-08-20T00:00:00.000Z" \
  -F "isAvailable=true" \
  -F "latitude=7.0731" \
  -F "longitude=125.6128" \
  -F "price=12500.50" \
  -F "numberOfRooms=2" \
  -F "image=@./sample.jpg"
```

## Local Image Uploads

Uploaded images are stored locally in the uploads directory. The database stores only the uploaded file name/path. These files are served from /uploads/.

Local image storage is temporary and is meant only for this prototype. In production, object storage or cloud storage would be preferred.
