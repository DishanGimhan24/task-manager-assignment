# Task Manager — Full Stack Application

A full-stack Task Manager application built with **NestJS** (`/api`), **Prisma ORM with SQLite**, and **Next.js App Router + shadcn/ui** (`/web`).

---

## Project Structure

```text
├── api/                   # NestJS REST API backend (Prisma + SQLite)
│   ├── prisma/            # Prisma schema and SQLite migrations
│   └── src/               # NestJS modules, controllers, services, DTOs
├── web/                   # Next.js App Router frontend (Tailwind + shadcn/ui)
├── postman_collection.json # Ready-to-import Postman collection
└── README.md              # Setup instructions, architectural decisions, and AI usage notes
```

---

## Prerequisites

- **Node.js**: `v20.x` or higher (check with `node -v`)
- **Package Manager**: `npm v10.x` or higher (check with `npm -v`)

---

## Getting Started (From a Fresh Clone)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <your-repository-folder>
```

---

### 2. Backend Setup (`/api`)

1. Open a terminal, navigate to the `api` directory, and install dependencies:
   ```bash
   cd api
   npm install
   ```
//already there
2. Create a `.env` file inside the `/api` directory (or ensure the following variables are present):
   ```env
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   DATABASE_URL="file:./dev.db"
   ```

3. **Database Setup (Prisma + SQLite)**:
   Generate the Prisma client and apply database migrations to create the SQLite database:
   ```bash
   npx prisma migrate deploy
   ```

4. Start the NestJS backend server:
   ```bash
   npm run start:dev
   ```

   The backend API will be available at: **[http://localhost:3001](http://localhost:3001)**

---

### 3. Frontend Setup (`/web`)

1. Open a **new terminal window**, navigate to the `web` directory, and install dependencies:
   ```bash
   cd web
   npm install
   ```

2. Create a `.env.local` file inside the `/web` directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

   The web application will be available at: **[http://localhost:3000](http://localhost:3000)**

---

## Testing the API with Postman

A pre-configured Postman Collection is included at the root of the project:
`postman_collection.json`

1. Open **Postman** and click **Import**.
2. Select or drag-and-drop `postman_collection.json`.
3. All requests (`POST`, `GET`, `PATCH`, `DELETE`, and validation test) are pre-configured with `http://localhost:3001`.
4. Creating a task will automatically save its `id` so you can immediately test Get/Update/Delete endpoints.

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/tasks` | Retrieve all tasks (ordered by newest first) |
| `GET` | `/tasks/:id` | Retrieve a single task by ID (404 if not found) |
| `POST` | `/tasks` | Create a new task (400 on validation failure) |
| `PATCH` | `/tasks/:id` | Update an existing task (400 or 404) |
| `DELETE` | `/tasks/:id` | Delete a task (204 on success, 404 if not found) |

---

## Architectural Decisions

- **SQLite with Prisma ORM:**
  SQLite was chosen for local persistence without requiring external database servers (e.g. Docker, PostgreSQL, MySQL) to be installed. Prisma ORM provides type-safe queries, automatic schema migrations, and seamless development ergonomics.
- **Backend-First Validation with Global ValidationPipe:**
  All incoming request payloads are validated at the API boundary using NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` paired with `class-validator` DTOs (`CreateTaskDto` and `UpdateTaskDto`). This guarantees consistent `400 Bad Request` responses regardless of whether requests originate from the UI or direct API calls.
- **Structured Error Propagation to the UI:**
  In the frontend API client, non-2xx HTTP responses are parsed to extract structured error message strings/arrays returned by NestJS and thrown as typed errors. Components catch these errors to render inline alert banners on load failures and toast notifications for failed mutations.
- **Dedicated Ports and Explicit CORS Configuration:**
  The NestJS server runs on port `3001` to avoid colliding with Next.js on port `3000`, with CORS configured dynamically via `FRONTEND_URL` in `api/.env`.
- **Unified Create/Edit Dialog Component:**
  A single reusable `TaskFormDialog` handles both creating and editing tasks by checking if an existing task prop is passed, preventing duplicate form and validation logic.

---

## How I Used AI

- **Tools Used:**
  Gemini (for scaffolding NestJS DTOs/service structure, Prisma migrations, and frontend UI components).
- **What I Changed in the Generated Code:**
  - Standardized Prisma ORM version to v6 for zero-friction SQLite compilation on Windows.
  - Refactored frontend error handling to cleanly parse NestJS validation arrays into user-readable alerts/toasts.
  - Configured environment-driven CORS configuration (`FRONTEND_URL`) and backend port separation.
