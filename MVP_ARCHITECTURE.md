# CertiVault Production-Ready MVP Architecture

## 1. Architecture Summary

CertiVault should begin as a **modular monolith**, not as microservices. The React
frontend, Express API, MongoDB database, and AWS S3 bucket are independently
deployable, but the backend remains one application with clear module
boundaries.

This keeps the first version understandable while preserving a clean path to
background workers, Redis, OCR, verification workflows, and other future
services.

```text
Browser
  |
  | HTTPS / REST JSON and multipart/form-data
  v
React SPA
  |
  | access JWT + refresh cookie
  v
Node.js + Express API
  |                  |
  | Mongoose         | AWS SDK
  v                  v
MongoDB Atlas      Private AWS S3 bucket
(users, metadata,  (document binary files)
sessions, audits)
```

### MVP Scope

The first deployable MVP includes:

- User registration, login, token refresh, logout, and current-user profile
- User and Admin roles
- Protected frontend pages and REST API routes
- Secure document upload, listing, detail view, download, and deletion
- Document metadata stored in MongoDB
- Document binary files stored in a private S3 bucket
- Ownership checks for every document operation
- Admin access to user and document management
- Audit records for security-sensitive actions
- Validation, rate limiting, structured errors, logs, tests, and deployment
  configuration

The MVP intentionally excludes sharing links, OCR, full-text search,
notifications, advanced verification, organizations, Redis, queues, and
Kubernetes. These belong in later phases.

## 2. Complete Repository Structure

```text
certivault/
|-- frontend/                         # React single-page application
|-- backend/                          # Express REST API
|-- docs/
|   |-- architecture/
|   |   `-- MVP_ARCHITECTURE.md
|   `-- decisions/                    # Architecture Decision Records
|-- infrastructure/                   # Added during production phase
|   |-- docker/
|   `-- terraform/
|-- .github/
|   `-- workflows/
|       `-- ci.yml
|-- .editorconfig
|-- .gitignore
|-- docker-compose.yml                # Local MongoDB and application services
|-- package.json                      # Optional npm workspaces root
|-- README.md
`-- LICENSE
```

## 3. Frontend Folder Structure

Use React with Vite, React Router, TanStack Query, Axios, React Hook Form, and a
schema validator such as Zod. Keep server state in TanStack Query and only
authentication/UI state in React context.

```text
frontend/
|-- public/
|-- src/
|   |-- api/
|   |   |-- axiosClient.js            # Base URL, credentials, token refresh
|   |   |-- authApi.js
|   |   `-- documentsApi.js
|   |-- assets/
|   |-- components/
|   |   |-- common/
|   |   |-- documents/
|   |   `-- layout/
|   |-- context/
|   |   `-- AuthContext.jsx
|   |-- hooks/
|   |   |-- useAuth.js
|   |   `-- useDocuments.js
|   |-- pages/
|   |   |-- admin/
|   |   |   |-- AdminDocumentsPage.jsx
|   |   |   `-- AdminUsersPage.jsx
|   |   |-- DashboardPage.jsx
|   |   |-- DocumentDetailsPage.jsx
|   |   |-- LoginPage.jsx
|   |   |-- NotFoundPage.jsx
|   |   |-- RegisterPage.jsx
|   |   `-- UploadDocumentPage.jsx
|   |-- routes/
|   |   |-- AdminRoute.jsx
|   |   |-- AppRoutes.jsx
|   |   `-- ProtectedRoute.jsx
|   |-- schemas/                      # Client-side form schemas
|   |-- styles/
|   |-- utils/
|   |-- App.jsx
|   `-- main.jsx
|-- tests/
|   |-- integration/
|   `-- unit/
|-- .env.example
|-- eslint.config.js
|-- package.json
`-- vite.config.js
```

### Frontend Responsibilities

- Render forms, dashboards, upload progress, and API errors.
- Keep the access token in memory, not `localStorage`.
- Send the refresh cookie using `withCredentials: true`.
- Retry one failed request after a successful token refresh.
- Hide unauthorized UI actions, while treating backend authorization as the
  real security boundary.
- Never receive or store AWS credentials or raw S3 object keys unnecessarily.

## 4. Backend Folder Structure

Organize the API by feature modules. Controllers translate HTTP requests;
services contain business rules; repositories/models handle persistence.

```text
backend/
|-- src/
|   |-- config/
|   |   |-- database.js
|   |   |-- env.js
|   |   `-- s3.js
|   |-- modules/
|   |   |-- auth/
|   |   |   |-- auth.controller.js
|   |   |   |-- auth.routes.js
|   |   |   |-- auth.service.js
|   |   |   `-- auth.validation.js
|   |   |-- audit/
|   |   |   |-- audit.model.js
|   |   |   `-- audit.service.js
|   |   |-- documents/
|   |   |   |-- document.controller.js
|   |   |   |-- document.model.js
|   |   |   |-- document.routes.js
|   |   |   |-- document.service.js
|   |   |   `-- document.validation.js
|   |   `-- users/
|   |       |-- user.controller.js
|   |       |-- user.model.js
|   |       |-- user.routes.js
|   |       `-- user.service.js
|   |-- middleware/
|   |   |-- authenticate.js
|   |   |-- authorize.js
|   |   |-- errorHandler.js
|   |   |-- notFound.js
|   |   |-- rateLimiters.js
|   |   |-- requestId.js
|   |   |-- upload.js
|   |   `-- validate.js
|   |-- services/
|   |   `-- storage.service.js         # S3 operations behind an interface
|   |-- utils/
|   |   |-- ApiError.js
|   |   |-- asyncHandler.js
|   |   |-- crypto.js
|   |   `-- logger.js
|   |-- app.js                         # Express configuration
|   `-- server.js                      # Startup and graceful shutdown
|-- tests/
|   |-- integration/
|   |-- unit/
|   `-- helpers/
|-- .env.example
|-- Dockerfile
|-- eslint.config.js
|-- package.json
`-- vitest.config.js
```

### Backend Layer Rules

- **Routes** declare URLs and middleware order.
- **Controllers** parse inputs and return HTTP responses; no S3 or database
  logic.
- **Services** enforce ownership, permissions, and workflow rules.
- **Models** define persistence shape and indexes.
- **Storage service** is the only module that directly calls AWS S3.
- **Middleware** handles cross-cutting concerns, never document business logic.

## 5. Database Schema Design

Use MongoDB Atlas and Mongoose. Store timestamps in UTC. Never store document
binary data or plaintext refresh tokens in MongoDB.

### User

```js
{
  _id: ObjectId,
  name: String,                         // required, trim, max 100
  email: String,                        // required, lowercase, unique
  passwordHash: String,                 // bcrypt/argon2 hash, select: false
  role: "user" | "admin",               // default: "user"
  isActive: Boolean,                    // default: true
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

```text
unique(email)
role
```

Public registration must always create `role: "user"`. Only an Admin-only
operation or controlled database migration may grant the Admin role.

### RefreshSession

Refresh sessions permit secure logout and token rotation. Store a hash of the
refresh token identifier, not the token itself.

```js
{
  _id: ObjectId,
  userId: ObjectId,                     // ref User, required
  tokenHash: String,                    // required, unique
  userAgent: String,
  ipAddress: String,
  expiresAt: Date,                      // TTL index
  revokedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

```text
unique(tokenHash)
TTL(expiresAt)
userId + revokedAt
```

### Document

```js
{
  _id: ObjectId,
  ownerId: ObjectId,                    // ref User, required
  title: String,                        // required, trim, max 200
  description: String,                  // max 2000
  tags: [String],                       // normalized lowercase, bounded count
  category: String,                     // optional controlled value
  originalFileName: String,             // display only; never used as S3 key
  storageKey: String,                   // unique random S3 object key
  mimeType: String,                     // validated allowlist
  sizeBytes: Number,                    // bounded by upload limit
  checksumSha256: String,               // integrity and duplicate checks
  status: "active" | "deleted",         // soft-delete state
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

```text
unique(storageKey)
ownerId + status + createdAt(desc)
ownerId + tags
checksumSha256
text(title, description)                // optional basic MVP search
```

`storageKey` should follow a non-guessable pattern such as:

```text
documents/{ownerId}/{uuid}
```

Do not place the original filename, email address, or other sensitive metadata
in the S3 key.

### AuditEvent

```js
{
  _id: ObjectId,
  actorId: ObjectId | null,             // null for unauthenticated events
  action: String,                       // e.g. DOCUMENT_DOWNLOADED
  resourceType: "user" | "document" | "session",
  resourceId: ObjectId | null,
  metadata: Object,                     // small, allowlisted event details
  ipAddress: String,
  userAgent: String,
  requestId: String,
  createdAt: Date
}
```

Indexes:

```text
resourceType + resourceId + createdAt(desc)
actorId + createdAt(desc)
createdAt(desc)
```

Audit events should be append-only through the application. Never log
passwords, tokens, presigned URLs, or document contents.

## 6. REST API Endpoints

Base path: `/api/v1`

All successful responses use a consistent shape:

```json
{
  "data": {},
  "meta": {}
}
```

All errors use:

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Document not found",
    "requestId": "..."
  }
}
```

### Authentication

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a User account |
| POST | `/auth/login` | Public | Return access JWT and set refresh cookie |
| POST | `/auth/refresh` | Refresh cookie | Rotate refresh token and return access JWT |
| POST | `/auth/logout` | Authenticated/session | Revoke current refresh session |
| GET | `/auth/me` | User/Admin | Return current user |

Apply strict rate limits to register, login, and refresh endpoints.

### Documents

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| POST | `/documents` | User/Admin | Upload one file and its metadata |
| GET | `/documents` | User/Admin | List accessible documents |
| GET | `/documents/:id` | Owner/Admin | Get metadata |
| PATCH | `/documents/:id` | Owner/Admin | Update allowed metadata |
| POST | `/documents/:id/download` | Owner/Admin | Create short-lived download URL |
| DELETE | `/documents/:id` | Owner/Admin | Soft-delete metadata and remove S3 object |

Recommended list query parameters:

```text
page=1
limit=20                       # maximum 100
search=certificate
category=education
tags=degree,verified
sort=-createdAt
```

The User role only sees its own documents. Admin can see all documents and may
optionally filter by `ownerId`.

Use `POST /documents/:id/download` instead of returning S3 URLs in list/detail
responses. Creating a download capability is a meaningful, auditable action.

### Admin

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/admin/users` | Admin | Paginated user list |
| PATCH | `/admin/users/:id/status` | Admin | Activate/deactivate a user |
| GET | `/admin/audit-events` | Admin | Paginated audit event list |

### Operational

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/health/live` | Public/internal | Process liveness |
| GET | `/health/ready` | Internal | Database/S3 dependency readiness |

## 7. Middleware Architecture

Middleware order matters. The global Express chain should be:

```text
1. trust proxy configuration
2. request ID
3. structured request logging
4. Helmet security headers
5. CORS allowlist with credentials
6. JSON/body size limits
7. cookie parser
8. general rate limiter
9. API routes
10. not-found handler
11. centralized error handler
```

Example protected upload route:

```js
router.post(
  "/documents",
  authenticate,
  authorize("user", "admin"),
  uploadRateLimiter,
  upload.single("file"),
  validate(uploadDocumentSchema),
  asyncHandler(documentController.create)
);
```

### Required Middleware

- `authenticate`: Verify JWT signature, issuer, audience, expiration, and active
  user. Attach minimal identity data to `req.user`.
- `authorize(...roles)`: Reject users without one of the allowed roles.
- Ownership authorization: Performed in the document service by querying with
  both document ID and allowed owner scope. Do not trust a client-supplied
  owner ID.
- `upload`: Multer `memoryStorage`, one file only, explicit maximum size, and
  MIME/extension allowlist. Validate file signatures where practical because
  `Content-Type` alone is untrusted.
- `validate`: Validate body, path, and query using Zod/Joi and reject unknown
  fields.
- `rateLimiters`: General API limiter plus stricter auth/upload/download
  policies.
- `errorHandler`: Normalize errors and hide stack traces in production.

## 8. Authentication Flow

### Registration

```text
1. React submits name, email, and password over HTTPS.
2. API validates and normalizes input.
3. API confirms the email is unused.
4. Password is hashed with Argon2id or bcrypt using a strong work factor.
5. User is created with role=user.
6. Audit event is written.
7. API returns 201 without password fields.
```

### Login and Refresh

```text
1. React submits email and password.
2. API applies a strict rate limit and verifies credentials.
3. API creates:
   - short-lived access JWT, approximately 15 minutes
   - rotating refresh JWT/session, approximately 7 days
4. Access JWT is returned in JSON and held only in frontend memory.
5. Refresh token is set in a Secure, HttpOnly, SameSite cookie.
6. React sends access JWT as Authorization: Bearer <token>.
7. On expiry, React calls /auth/refresh once using the cookie.
8. API verifies the session, rotates it, and returns a new access JWT.
9. Logout revokes the refresh session and clears its cookie.
```

For same-site deployments, use `SameSite=Lax` or `Strict`. If frontend and API
must be cross-site, use `SameSite=None; Secure` and add explicit CSRF
protection to cookie-authenticated endpoints.

JWT payloads should remain minimal:

```json
{
  "sub": "user-id",
  "role": "user",
  "iss": "certivault-api",
  "aud": "certivault-web",
  "jti": "unique-token-id"
}
```

## 9. File Upload and AWS S3 Integration Flow

### Upload Flow

```text
1. User selects a file and enters metadata.
2. React sends multipart/form-data to POST /api/v1/documents.
3. API authenticates the user and applies upload rate limits.
4. Multer accepts one bounded file into memory.
5. API validates metadata, extension, MIME type, and file signature.
6. API calculates SHA-256 checksum and creates a random storage key.
7. Storage service uploads the file to the private S3 bucket.
8. API creates the MongoDB Document record.
9. API writes DOCUMENT_UPLOADED audit event.
10. API returns document metadata, never the storage key or AWS credentials.
```

If S3 upload succeeds but MongoDB creation fails, the service must immediately
attempt to delete the uploaded S3 object and log cleanup failure. This
compensating action prevents orphaned files.

Multer memory storage is appropriate for a beginner-friendly MVP only with a
small limit, such as 10 MB. For larger files, migrate to direct-to-S3 multipart
uploads with a server-issued upload intent.

### Download Flow

```text
1. React calls POST /documents/:id/download.
2. API authenticates the user.
3. Document service loads the document within the user's allowed owner scope.
4. API rejects deleted or unauthorized documents without revealing existence.
5. Storage service creates a presigned S3 GET URL lasting about 60 seconds.
6. API writes DOCUMENT_DOWNLOAD_URL_CREATED audit event.
7. React redirects to or fetches the short-lived URL.
8. S3 serves the encrypted object over HTTPS.
```

### Delete Flow

```text
1. API verifies Owner/Admin authorization.
2. Document is marked deleted to remove it from normal reads.
3. S3 object is deleted.
4. Audit event is written.
5. A later production worker can retry failed S3 deletions.
```

### Required S3 Configuration

- Enable **Block Public Access** for the entire bucket.
- Disable public ACLs and use bucket-owner-enforced ownership.
- Enable server-side encryption, preferably SSE-KMS in production.
- Grant the API IAM role only the required object operations and key prefix.
- Allow access only over TLS through a bucket policy.
- Enable versioning if recovery requirements justify its storage cost.
- Add lifecycle rules for abandoned uploads and deleted/versioned objects.
- Configure CORS only if direct browser-to-S3 uploads are introduced later.
- Use separate buckets or prefixes and IAM roles per environment.

The S3 client must receive credentials through an IAM role in production, not
hard-coded access keys. Local development may use a named AWS profile,
environment variables, or an S3-compatible emulator.

## 10. Security and Production Baseline

### Application Security

- HTTPS everywhere; enable HSTS at the edge.
- Private S3 bucket and short-lived presigned download URLs.
- Strong password hashing and rotating refresh sessions.
- Server-side role and ownership authorization on every protected operation.
- Strict file size/type/signature checks; add malware scanning before allowing
  high-risk formats or external sharing.
- Input validation, NoSQL-injection protection, and output field allowlists.
- Helmet headers, exact CORS origins, rate limits, and bounded request bodies.
- Redacted structured logs and append-oriented audit events.
- Secrets stored in the deployment platform's secret manager.
- Dependency, SAST, and container scanning in CI.

### Reliability and Operations

- Graceful shutdown and health endpoints.
- Centralized JSON logs with request IDs.
- MongoDB backups with tested restore procedures.
- S3 durability, encryption, lifecycle rules, and optional versioning.
- Alerts for elevated error rates, upload failures, auth abuse, and storage
  cleanup failures.
- Separate development, staging, and production environments.

## 11. Environment Configuration

```dotenv
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ISSUER=certivault-api
JWT_AUDIENCE=certivault-web
AWS_REGION=
S3_BUCKET_NAME=
AWS_KMS_KEY_ID=
MAX_UPLOAD_BYTES=10485760
LOG_LEVEL=info
```

Validate every required environment variable during startup and fail fast with
a clear error. Commit `.env.example`, never `.env`.

## 12. Development Roadmap

### Phase 0: Learn and Prepare

Goal: establish a small, repeatable workspace before building features.

- Learn basic React state/forms, Express routing/middleware, REST conventions,
  MongoDB/Mongoose, promises, and Git.
- Scaffold `frontend` and `backend`.
- Add formatting, linting, environment validation, and basic test runners.
- Run MongoDB locally with Docker Compose or use a development Atlas cluster.
- Write ADRs for modular monolith, MongoDB, private S3, and JWT session choices.

Exit criteria: both apps run locally, CI checks lint/tests, and the API health
endpoint confirms MongoDB connectivity.

### Phase 1: Authentication and Authorization

Goal: users can securely enter the application.

- Implement User and RefreshSession schemas.
- Implement registration, login, refresh rotation, logout, and `/auth/me`.
- Add password hashing, auth rate limits, secure cookies, and JWT verification.
- Build login/register pages, AuthContext, and protected/admin routes.
- Add Admin seeding through a controlled script, never public registration.
- Test invalid credentials, expired tokens, refresh reuse, and role denial.

Exit criteria: User and Admin permissions are enforced by integration tests.

### Phase 2: Core Document MVP

Goal: users can securely manage their own documents.

- Create Document and AuditEvent schemas and indexes.
- Implement bounded Multer uploads and the S3 storage service.
- Add upload, list, detail, metadata update, download URL, and delete APIs.
- Build dashboard, upload form, detail view, filters, and download action.
- Enforce owner-scoped queries and Admin overrides.
- Test unauthorized access, invalid file types, size limits, S3 failure, and
  database failure cleanup.

Exit criteria: a user cannot discover or access another user's document, and
all document actions have audit events.

### Phase 3: Harden the MVP

Goal: make the system safe and observable enough for real users.

- Add request IDs, structured logs, security headers, validation, and complete
  error normalization.
- Add file signature validation and malware scanning/quarantine.
- Add pagination bounds, indexes, query performance checks, and API docs.
- Add integration tests using a test MongoDB and mocked/local S3.
- Add browser end-to-end tests for authentication and document workflows.
- Perform a threat-model review and dependency/security scans.

Exit criteria: critical paths are tested, security checks pass, and failures
are visible and diagnosable.

### Phase 4: First Production Deployment

Goal: deploy a recoverable, monitored MVP without premature infrastructure.

- Deploy React to Vercel or a static web host.
- Deploy Express to Render, ECS/Fargate, or another managed container platform.
- Use MongoDB Atlas and a private production S3 bucket.
- Configure HTTPS, domain names, secrets, IAM role, budgets, and alerts.
- Automate CI/CD with staging before production.
- Run backup/restore, incident response, and rollback exercises.
- Document operating procedures and data retention/deletion behavior.

Exit criteria: deployment is repeatable, backups are restorable, monitoring is
actionable, and a release can be rolled back.

### Phase 5: Post-MVP Capabilities

Add features only after the MVP is stable and their need is demonstrated:

- Protected expiring share links and public verification pages
- Verification states and reviewer roles
- Direct multipart S3 uploads for large files
- Redis-backed distributed rate limits and caching
- Queue workers for malware scanning, OCR, reminders, and cleanup retries
- Search service when MongoDB search no longer meets product needs
- Infrastructure as Code and advanced orchestration when operating scale
  justifies them

## 13. Recommended Build Order

For a beginner-intermediate developer, build one vertical slice at a time:

```text
health check
-> register/login/logout
-> protected dashboard
-> upload one document
-> list own documents
-> securely download one document
-> update/delete one document
-> admin list and audit view
-> hardening, tests, and deployment
```

Each slice should include its route, validation, service logic, database
operation, authorization checks, frontend UI, error states, and tests before
moving to the next slice.

## 14. Key Architecture Decisions

| Decision | MVP Choice | Reason |
|---|---|---|
| Backend shape | Modular monolith | Simple deployment and clear boundaries |
| File storage | Private AWS S3 | Durable binaries without bloating MongoDB |
| File access | API-authorized presigned URLs | Secure, scalable downloads |
| Upload method | Multer memory storage, 10 MB limit | Simple first implementation |
| Metadata store | MongoDB Atlas | Flexible metadata and straightforward Node integration |
| Authentication | Short access JWT + rotating refresh cookie | Balances JWT requirement and revocation |
| Authorization | RBAC plus owner-scoped queries | Roles alone do not protect user-owned files |
| Deployment | Managed frontend/API/database/storage | Lower operational burden for the MVP |

This architecture is production-oriented without pretending the first release
needs the operational complexity of a mature large-scale platform.
