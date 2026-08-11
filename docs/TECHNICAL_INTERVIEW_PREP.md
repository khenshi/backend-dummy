# Backend Technical Interview Preparation

This guide is a codebase-specific preparation sheet for explaining and defending the current Property Management backend in a technical interview. It describes the application as it exists today, calls out limitations honestly, and suggests reasonable next steps without pretending that prototype features already exist.

## 1. Thirty-second project summary

> This is a TypeScript REST API built with Express 5 for managing rental properties. It supports property CRUD, combined search and filtering, optional image upload and retrieval, request validation with Zod, and PostgreSQL persistence through Prisma. The code uses a feature-based structure with separate routing, controller, service, schema, middleware, and configuration concerns. It also has centralized error handling, validated environment variables, graceful shutdown, and committed database migrations.

If asked what the project demonstrates, emphasize:

- REST API and HTTP fundamentals
- TypeScript and runtime validation
- Relational data modeling and migrations
- Separation of concerns
- File upload handling
- Consistent errors and status codes
- Awareness of production tradeoffs

Do not claim that the current prototype has authentication, authorization, pagination, automated tests, Swagger, Docker, logging, rate limiting, or production-ready image storage. Those are improvement areas.

## 2. Current scope

The implemented resource is `Property`.

Supported operations:

| Method | Endpoint | Purpose | Success status |
| --- | --- | --- | --- |
| `GET` | `/api/properties` | List, search, and filter properties | `200` |
| `GET` | `/api/properties/:id` | Fetch one property | `200` |
| `GET` | `/api/properties/:id/image` | Stream the stored property image | `200` |
| `POST` | `/api/properties` | Create a property | `201` |
| `PATCH` | `/api/properties/:id` | Partially update a property | `200` |
| `DELETE` | `/api/properties/:id` | Delete a property | `204` |

The list endpoint supports case-insensitive title/description search and filters for availability, minimum/maximum price, and minimum room count.

## 3. Technology choices

### Node.js and TypeScript

Node.js fits an I/O-heavy API because requests spend much of their time waiting on the database. TypeScript adds compile-time checks, improves refactoring, and documents data shapes. Strict mode is enabled.

Important distinction: TypeScript types disappear at runtime, so they cannot protect an API from malformed client input. Zod provides that runtime boundary validation.

### Express 5

Express provides a small, explicit HTTP layer without forcing a large framework architecture. That suits this assessment-sized CRUD service. The tradeoff is that conventions such as dependency injection, decorators, and generated API documentation must be introduced separately if needed.

### PostgreSQL

Property data is structured and benefits from database constraints, exact decimal storage for money, enums, UUID keys, and transactional behavior. PostgreSQL is a natural fit and leaves room for relational features such as users, units, agreements, and payments.

### Prisma 7 with the PostgreSQL adapter

Prisma supplies a typed query API, generated model types, and migration tooling. The application creates one reusable `PrismaClient`; in development it is cached on `globalThis` to avoid extra clients during hot reload.

Prisma reduces query boilerplate, but engineers must still understand SQL, indexes, connection limits, transactions, query plans, and migration safety.

### Zod

Zod validates and transforms environment variables, path parameters, query parameters, and multipart form fields. Schemas are centralized in `property.schema.ts`, keeping validation rules out of controllers.

### Multer

Multer parses multipart requests. The app uses in-memory storage, restricts uploads to JPEG, PNG, or WebP, and caps files at 5 MB.

### CORS

CORS is restricted to the configured frontend origin. CORS is a browser policy, not authentication or a security boundary for non-browser clients.

## 4. Architecture and responsibilities

```text
Client
  -> Express app and global middleware
  -> property router
  -> upload middleware (POST/PATCH only)
  -> controller
  -> service + Zod validation
  -> Prisma Client
  -> PostgreSQL

Errors
  -> next(error)
  -> centralized error handler
  -> consistent JSON error response
```

### File-by-file explanation

| Area | Responsibility |
| --- | --- |
| `src/server.ts` | Starts the HTTP server and handles graceful shutdown |
| `src/app.ts` | Builds the Express application and orders middleware |
| `src/config/env.ts` | Loads and validates environment configuration |
| `src/lib/prisma.ts` | Creates and reuses the database client |
| `property.routes.ts` | Maps HTTP methods and paths to middleware/controllers |
| `property.controller.ts` | Translates HTTP requests into service calls and formats responses |
| `property.service.ts` | Holds validation orchestration, business/data-access logic, and response serialization |
| `property.schema.ts` | Defines runtime input rules and transformations |
| `upload.ts` | Enforces image type and size limits and buffers uploads |
| `error-handler.ts` | Maps known errors to safe, consistent HTTP responses |
| `not-found.ts` | Returns a consistent error for unmatched routes |
| `schema.prisma` | Defines database types and constraints |
| `prisma/migrations` | Versions database schema changes |

### Why controllers are thin

Controllers deal only with HTTP concerns: parameters, request bodies, files, response status, and forwarding errors. Keeping validation and domain/data logic in the service makes controllers easy to read and makes the underlying operations easier to test independently.

### Why there is no repository layer

The service currently calls Prisma directly. For one small resource, a repository interface would add indirection without solving a demonstrated problem. If persistence queries became complex, were reused across services, or required interchangeable implementations, extracting a repository could become worthwhile.

This is a useful KISS/YAGNI answer: abstraction should follow a concrete need.

## 5. Walk through a request

Use `POST /api/properties` as the main example:

1. The request reaches Express through the `/api/properties` router.
2. `upload.single('image')` parses multipart data, rejects unexpected file fields, enforces 5 MB, and checks the declared MIME type.
3. The controller passes `req.body` and the optional `req.file` to the service.
4. Zod validates and transforms string form fields such as booleans and room count.
5. The service maps validated input to `Prisma.PropertyCreateInput`.
6. The image buffer becomes a `Uint8Array` for the PostgreSQL `BYTEA` column.
7. Prisma inserts the record and omits the large image bytes from the returning query.
8. The serializer converts Prisma's `Decimal` price to a JSON number and creates a relative image URL.
9. The controller returns `201 Created` in the standard success envelope.
10. Any thrown error is passed to the centralized error handler.

For `GET /:id/image`, the service selects only `imageData` and `imageMimeType`, avoiding retrieval of unrelated columns, and the controller sends the bytes with the correct `Content-Type`.

## 6. Data model decisions

### UUID primary key

UUIDs are difficult to enumerate, can be generated independently, and work well across distributed systems. They use more storage and have less index locality than sequential integers. For this project, their API-safety and portability are reasonable benefits.

### `Decimal(10,2)` for price

Money should not be stored as a binary floating-point value because values such as `0.1` cannot always be represented exactly. `Decimal(10,2)` provides exact two-decimal-place storage up to 99,999,999.99.

The API converts Prisma `Decimal` to JavaScript `number` for convenient JSON. That is acceptable inside the current numeric range, but a stricter financial API could serialize money as a string or integer minor units to preserve exactness through every layer.

### Double precision coordinates

Latitude and longitude are stored as double precision because approximate floating-point precision is adequate for display and typical location filtering. The Zod schema enforces latitude `-90..90` and longitude `-180..180`.

For advanced radius or geospatial queries, PostGIS and spatial indexes would be a better design.

### Date versus timestamp

- `availableDate` maps to PostgreSQL `DATE`, representing a calendar date.
- `inspectionAt` is a nullable timestamp because an inspection has a specific time.

Be prepared to discuss timezone policy. A production system should require ISO 8601 timestamps with an explicit offset, normalize instants to UTC, and localize them only at display time. Calendar-only dates should stay date-only values rather than acquiring accidental timezone shifts.

### Enum for property type

The database enum prevents arbitrary values and documents the supported set. Adding an enum value requires a migration. If property types needed administrator-defined values, a lookup table would be more flexible.

### Image bytes in PostgreSQL

This prototype stores `imageData` in `BYTEA` and its MIME type beside the property. Benefits are simple consistency, one backup boundary, and atomic deletion with the property.

Costs include database growth, larger backups, database bandwidth, memory pressure, and limited CDN/cache integration. At scale, upload images to object storage using signed URLs, keep only object metadata/key in PostgreSQL, serve through a CDN, and delete orphaned objects with a reliable cleanup workflow.

## 7. Validation details

Multipart text fields arrive as strings, so the schema deliberately handles coercion:

- `isAvailable` accepts the boolean values `true`/`false` or the strings `"true"`/`"false"`.
- `numberOfRooms` is coerced to a positive integer.
- Decimal input first matches a numeric-string expression, then applies range validation.
- Empty `inspectionAt` becomes `null`, allowing PATCH to clear it.
- `updatePropertySchema` makes create fields optional for partial updates.
- IDs must be valid UUIDs before reaching Prisma.
- List filters are composable, and a cross-field rule ensures `minPrice <= maxPrice`.

Why not use `Number(value)` alone? It accepts surprising inputs such as an empty string as zero. The explicit numeric-string validation produces a tighter API contract.

One improvement is to make request content types explicit. The API documentation currently expects multipart for POST/PATCH, although `express.json()` also exists globally. If both JSON and multipart creation are intended, tests and schemas should formally guarantee both formats.

## 8. Error-handling strategy

Expected application failures use `ApiError`, validation failures use `ZodError`, and upload failures use `MulterError`. The final error middleware maps these to the standard shape:

```json
{
  "success": false,
  "error": { "message": "Property not found" }
}
```

Status code choices:

- `400` for malformed IDs, invalid fields, and invalid filters
- `404` for a missing property, image, or route
- `413` for a file over 5 MB
- `415` for an unsupported image media type
- `500` for unexpected internal failures

Internal database messages and stack traces are deliberately hidden from clients. In production, the full error should still be written to structured server logs with a request/correlation ID.

Potential improvement: map known Prisma errors explicitly. For example, a record could disappear between an existence check and an update/delete, producing a Prisma error currently returned as `500` rather than `404`.

## 9. REST and HTTP decisions

### Why PATCH instead of PUT

`PATCH` updates only supplied fields. `PUT` conventionally replaces the complete resource. The implementation builds an update object using only values that are not `undefined`, preserving omitted fields.

`null` and `undefined` have different meanings: omitted/`undefined` means “do not change,” while the empty `inspectionAt` form value is transformed so the column can be set to `null`.

### Why DELETE returns 204

The deletion succeeded and there is no response representation to return. A `204 No Content` response must not include a body.

### Why image data has a separate endpoint

Embedding base64 in every property JSON response would increase payload size and force clients to download images they may not need. A separate URL supports independent retrieval and future HTTP caching/CDN behavior.

### Route ordering

`/:id/image` is registered before `/:id`. This makes the more specific route obvious and avoids routing ambiguity. With the current segment shapes, `/:id` would not consume an additional `/image` segment, but specific-before-general is still a clear convention.

## 10. Query behavior and performance

The list query builds a typed Prisma `where` object from validated optional filters. Search uses case-insensitive `contains` across title and description. Results are ordered newest first, and image bytes are omitted.

Current performance limits:

- There is no pagination, so response time and memory use grow with the table.
- Case-insensitive substring search generally cannot use a basic B-tree index efficiently.
- The schema currently declares no secondary indexes for common filters or sorting.
- There is no response caching.

Likely next steps:

1. Add cursor pagination using a stable order such as `(createdAt, id)`.
2. Inspect actual queries with `EXPLAIN ANALYZE` before choosing indexes.
3. Add indexes based on measured access patterns, potentially availability/creation date or price.
4. For substring search, consider PostgreSQL `pg_trgm` with a GIN/GiST index or full-text search.
5. Move images to object storage and a CDN.

Why cursor pagination? It remains stable and efficient for deep pages while records are inserted, whereas large `OFFSET` values become slower and can cause duplicates or omissions during concurrent changes.

## 11. Security review

Security measures already present:

- Input validation before database writes
- Parameterized ORM queries rather than interpolated SQL
- Image allowlist and file-size limit
- Restricted CORS origin
- Generic internal-error responses
- Environment variables for secrets/configuration

Important missing controls:

- Authentication and authorization
- Rate limiting and abuse protection
- Security headers (for example, Helmet)
- Request body size policy for JSON
- Content sniffing/magic-byte verification for images
- Malware scanning if files are accepted from untrusted users
- Audit logging
- TLS enforcement at the deployment boundary
- Secret rotation and managed secret storage

MIME validation currently trusts multipart metadata (`file.mimetype`). A safer implementation checks the actual file signature, decodes/re-encodes images when appropriate, and serves files with defensive headers such as `X-Content-Type-Options: nosniff`.

For future RBAC, keep authentication separate from authorization. Authentication establishes identity; authorization checks whether that identity may perform an action. Example roles might be Super Admin, Property Manager, and Staff, but permissions should be defined around actions/resources rather than scattered role-name checks.

## 12. Reliability and concurrency

The server listens for `SIGINT` and `SIGTERM`, stops accepting new connections, disconnects Prisma, and exits. This supports clean local shutdown and container orchestration.

Production hardening would include:

- A shutdown deadline so hanging connections cannot block termination forever
- Readiness and liveness endpoints
- Handling startup/database connection failures
- Structured logging, metrics, and tracing
- Request timeouts and reverse-proxy limits
- Retry only for safe, transient operations and with backoff

The update/delete flow performs an existence read followed by a write. Another request could delete the row between those operations. This is a time-of-check/time-of-use race. A robust version can perform the write directly and translate Prisma's not-found error, or use a transaction when multiple dependent operations must be atomic.

## 13. Testing strategy

The most important current gap is that `npm test` reports `No tests configured`. Do not hide this in an interview. Explain how you would add tests in risk order.

### Unit tests

Test pure validation and transformation behavior:

- Required create fields
- Boolean multipart conversion
- Invalid and boundary coordinates
- Non-negative decimal price
- Positive integer room count
- Valid property enum values
- Empty inspection time clearing
- UUID validation
- Minimum/maximum price cross-field rule
- Serialization of decimal and image URL

### Service tests

Mock or inject the Prisma dependency and verify:

- Correct `where` construction for combined filters
- Image bytes are omitted from normal reads
- Correct create/update mapping
- `404` for missing records and missing images
- PATCH preserves omitted fields

The current imported singleton makes isolated tests less convenient. A small dependency-injection boundary or app/service factory could improve testability without requiring a heavy framework.

### Integration tests

Use a dedicated PostgreSQL database and run real migrations. Verify Prisma behavior, decimal/date mappings, enum constraints, CRUD, combined filters, and binary image round trips. Database integration tests catch problems that mocks cannot.

### HTTP/API tests

Use a tool such as Supertest against `createApp()`:

- Status codes and response envelopes
- Multipart uploads
- File type and size failures
- Invalid path/query/body inputs
- Unknown routes
- Error middleware behavior
- CORS policy

Test `createApp()` without calling `listen()`. Keeping app construction separate from server startup is what makes this straightforward.

## 14. Observed limitations and code-review talking points

These are strong points to raise proactively when asked what you would improve:

1. **No tests:** add schema, service, integration, and HTTP tests; wire them into CI.
2. **No pagination:** add cursor pagination before data volume grows.
3. **Binary images in PostgreSQL:** acceptable for a prototype, but move to object storage at scale.
4. **No authentication/RBAC:** required before exposing write endpoints beyond a trusted prototype.
5. **No observability:** add structured logs, request IDs, metrics, and error reporting.
6. **Race in existence-check then write:** map Prisma not-found errors or make compound workflows transactional.
7. **Date parsing is permissive:** require an explicit API date/timestamp format and document timezone semantics.
8. **MIME type is client-declared:** inspect file signatures and add defensive response headers.
9. **Database/application constraints differ:** Zod enforces several rules that are not database `CHECK` constraints; critical invariants can also be enforced in PostgreSQL.
10. **Migration/model history differs:** the initial migration used `TEXT`/`DECIMAL` coordinates and an image path, while the next migration changes these to match the current Prisma model. This is normal schema evolution, and both migrations are needed to build the final schema from scratch.
11. **README provider wording is inconsistent:** the tech-stack sentence says Supabase while setup says Neon. The runtime only requires a compatible PostgreSQL URL, but documentation should name the actual deployment provider consistently.
12. **Error logging is absent:** safe client errors are good, but unexpected errors currently need server-side logging for diagnosis.

When presenting these, distinguish between a bug, a production-readiness gap, and a deliberate prototype tradeoff.

## 15. Common interview questions and strong answers

### “Why this architecture?”

It is feature-based and intentionally small. Routes define the HTTP surface, controllers adapt HTTP to application calls, schemas validate untrusted input, services hold use-case and persistence logic, and middleware handles cross-cutting concerns. It provides clear separation without adding abstractions that one CRUD resource does not yet need.

### “What happens if the database is down?”

Prisma will throw and the error middleware returns a generic `500`, avoiding leakage. That is safe for the client but incomplete operationally. I would add structured error logging, readiness checks, metrics/alerts, and deployment-level retry/restart behavior. I would not blindly retry non-idempotent writes because that can duplicate effects.

### “How do you prevent SQL injection?”

Inputs are validated and passed as values into Prisma's query API; the application does not concatenate user input into raw SQL. If raw SQL were introduced, I would use parameterized queries and tightly restrict any dynamic identifiers or sort fields.

### “Why validate in both the API and database?”

API validation gives fast, descriptive client errors. Database constraints protect invariants regardless of which application or script writes data. The two layers serve different purposes and should agree on critical rules.

### “Why convert price to a number?”

Prisma uses a Decimal object because JSON cannot directly represent it. This API converts it for client convenience. For stricter financial correctness or larger precision, I would return a decimal string or integer minor units instead.

### “How would you add authentication?”

Add an authentication middleware that verifies a short-lived access token and attaches a typed principal to the request. Store password hashes using a memory-hard password hasher if credentials are local, rotate refresh tokens securely, and add authorization middleware/policies for resource actions. Avoid mixing identity verification with permission logic.

### “How would you support multiple property managers?”

Introduce an organization or tenant model and associate tenant-owned records with `tenantId`. Derive tenant context from the authenticated principal, never trust a client-supplied tenant ID by itself, apply tenant predicates to every query, add suitable compound indexes/unique constraints, and test tenant isolation. For stronger isolation requirements, consider PostgreSQL row-level security or separate databases/schemas, recognizing their operational cost.

### “Would you use a transaction here?”

Creating a property with an in-row image is already one database insert, so it is atomic without an explicit multi-step transaction. A transaction is necessary when a use case performs multiple dependent writes that must all succeed or fail together—for example, creating a rental agreement and updating unit occupancy.

### “How would you scale this?”

First measure. Likely changes are stateless application replicas behind a load balancer, correctly sized database connection pools (or a pooler), pagination, query/index optimization based on query plans, object storage/CDN for images, and caching only where access patterns justify it. Keep PostgreSQL as the source of truth and add complexity incrementally.

### “How would you make image upload production-ready?”

Use direct-to-object-storage signed uploads, enforce size/type at multiple layers, validate content signatures, optionally scan or re-encode, store an object key and metadata in PostgreSQL, serve through a CDN, and implement cleanup for failed or deleted records. Signed URLs prevent the API server from buffering every large upload.

### “How do you handle async errors?”

Each async controller uses `try/catch` and calls `next(error)`, so the final error middleware owns response mapping. Express 5 can also forward rejected async handlers, so a future cleanup could standardize on one approach, but explicit forwarding is clear and currently consistent.

### “How would you avoid duplicate properties?”

First define what “duplicate” means with the product owner; title alone is usually insufficient. Once there is a real business key, enforce it with a database unique constraint, then translate the constraint failure into `409 Conflict`. Application-only prechecks are race-prone.

### “What is the difference between 400, 404, 409, 413, 415, and 500?”

- `400`: request syntax/validation is invalid
- `404`: requested route or resource does not exist
- `409`: request conflicts with current state, often a uniqueness/version conflict
- `413`: request content is too large
- `415`: submitted media type is unsupported
- `500`: unexpected server failure

### “What are SOLID examples here?”

- **Single responsibility:** routing, HTTP adaptation, validation, application logic, and error formatting live in distinct modules.
- **Open/closed:** new filters or property fields can usually be added locally, although this small app does not force elaborate extension mechanisms.
- **Dependency inversion:** this is the weakest area because the service imports the Prisma singleton directly; injection would help if testability or multiple implementations justified it.

Avoid forcing every SOLID principle into every file. The goal is maintainability, not pattern collecting.

## 16. Suggested implementation roadmap

A defensible sequence is:

1. Add automated tests and CI so future changes are safe.
2. Add pagination and formalize sorting/filter contracts.
3. Add authentication, tenant ownership, and RBAC before broader feature expansion.
4. Add database constraints/indexes based on invariants and measured queries.
5. Add structured logging, health endpoints, metrics, and deployment configuration.
6. Move images to object storage if storage/load requirements justify it.
7. Add modules for units, occupants, agreements, payments, and concerns one use case at a time.

For each new domain, identify its invariants. Examples: one active agreement per unit, payment amount cannot be negative, only authorized tenant members can view a property, and occupancy changes must be transactionally consistent.

## 17. Live code-walkthrough checklist

In a short interview demo, use this order:

1. Start at `prisma/schema.prisma` to explain the data and constraints.
2. Show `property.routes.ts` to establish the API surface.
3. Follow one route through controller, schema, and service.
4. Point out `omit: { imageData: true }` and the separate image query.
5. Show centralized error middleware and consistent envelopes.
6. Show environment validation and Prisma client reuse.
7. End with one deliberate tradeoff and one priority improvement.

Keep answers tied to requirements. A strong phrase is:

> For the current assessment scope, I chose the simplest design that preserves clear boundaries. If the requirement changes in this specific way, I would introduce this specific mechanism.

## 18. Quick facts to memorize

- Runtime: Node.js with ES modules
- Language: strict TypeScript targeting ES2023
- Framework: Express 5
- ORM: Prisma 7 using `@prisma/adapter-pg`
- Database: PostgreSQL
- Validation: Zod 4
- Upload parsing: Multer memory storage, 5 MB maximum
- Allowed images: JPEG, PNG, WebP
- IDs: PostgreSQL UUID
- Price: `DECIMAL(10,2)`
- Coordinates: double precision plus API range validation
- Normal responses omit raw image bytes
- Property list order: newest `createdAt` first
- CORS origin: `FRONTEND_URL`, default `http://localhost:5173`
- Port: `PORT`, default `3000`
- Required configuration: `DATABASE_URL`
- Current automated test coverage: none

## 19. Before the interview

- Run `npm run build` and confirm it passes.
- Apply migrations to a disposable database and seed a few realistic properties.
- Exercise every endpoint, including invalid inputs and missing resources.
- Prepare one example request that includes an image and one combined-filter query.
- Practice the 30-second summary and the POST request walkthrough aloud.
- Be ready to explain the image-storage tradeoff, Decimal handling, PATCH semantics, missing test suite, and pagination plan.
- Never claim an unimplemented feature; explain how and why you would add it.

