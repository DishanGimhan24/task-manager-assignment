# Task Manager — Full Stack Application

A full-stack Task Manager application built with **NestJS** (`/api`) and **Next.js App Router + shadcn/ui** (`/web`).

---

## Project Structure

```text
├── api/          # NestJS REST API backend
├── web/          # Next.js App Router frontend
└── README.md     # Setup instructions, architectural decisions, and AI usage notes
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

### 2. Backend Setup (`/api`)

1. Navigate to the `api` directory and install dependencies:
   ```bash
   cd api
   npm install
   ```

2. Create a `.env` file inside the `/api` folder (optional, defaults to port `3001`):
   ```env
   PORT=3001
   ```

3. **Database Setup**:
   No database setup or migrations are required. This project uses in-memory storage initialized with sample/empty state so the application runs immediately out of the box.

4. Start the NestJS backend server:
   ```bash
   npm run start:dev
   ```

   The API will be available at [http://localhost:3001](http://localhost:3001).

---

### 3. Frontend Setup (`/web`)

1. Open a new terminal window, navigate to the `web` directory, and install dependencies:
   ```bash
   cd web
   npm install
   ```

2. Create a `.env.local` file inside the `/web` folder and add the backend API URL:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. Start the Next.js development server:
   ```bash
   npm run dev
   ```

   The web application will be available at [http://localhost:3000](http://localhost:3000).

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/tasks` | Retrieve all tasks |
| `GET` | `/tasks/:id` | Retrieve a single task by ID (404 if not found) |
| `POST` | `/tasks` | Create a new task (400 on validation failure) |
| `PATCH` | `/tasks/:id` | Update an existing task (400 or 404) |
| `DELETE` | `/tasks/:id` | Delete a task (404 if not found) |

---

## Architectural Decisions

- **In-Memory Storage Over SQLite:**
  I chose an in-memory data store inside `TasksService` using a TypeScript `Map` / array rather than SQLite. Since the primary evaluation criteria require a zero-friction setup from a fresh clone, in-memory storage eliminates native binary compilation issues, migration steps, and file-permission edge cases while keeping CRUD operations fast and predictable.

- **Backend-First Validation with Global ValidationPipe:**
  All incoming request payloads are validated at the API boundary using NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` paired with `class-validator` DTOs (`CreateTaskDto` and `UpdateTaskDto`). This guarantees consistent `400 Bad Request` responses regardless of whether requests originate from the UI or direct API calls, while lightweight client-side checks improve form UX.

- **Structured Error Propagation to the UI:**
  In the frontend API client, non-2xx HTTP responses are parsed to extract the structured message array/string returned by NestJS's default exception filter and thrown as typed errors. Components catch these errors to render inline alert banners on initial load failures and trigger toast notifications via `sonner` for failed mutations.

- **Dedicated Ports and Explicit CORS Configuration:**
  The NestJS server is configured to run on port `3001` to avoid colliding with Next.js on port `3000`, with CORS explicitly enabled in `main.ts` for the frontend origin.

- **Unified Create/Edit Dialog Component:**
  Rather than maintaining two separate modal forms, a single reusable `TaskFormDialog` component handles both creating and editing tasks by inspecting whether an existing `Task` prop is passed in, reducing duplicated form state and validation logic.

---

## How I Used AI

- **Tools Used:**
  Gemini (for scaffolding CLI commands, boilerplate NestJS DTOs/service structure, and shadcn/ui component integration).

- **What I Changed in the Generated Code:**
  - Refactored the generated frontend fetch wrapper so NestJS validation error arrays (`message: string[]`) are joined cleanly into readable messages rather than displaying generic "Failed to fetch" text.
  - Separated `CreateTaskDto` and `UpdateTaskDto` (using `@nestjs/mapped-types PartialType`) and enforced strict enum validation on status (`TODO`, `IN_PROGRESS`, `DONE`) plus optional ISO date handling for `dueDate`.
  - Adjusted the `AlertDialog` delete flow so the modal stays open with a disabled loading state until the `DELETE` request resolves, preventing duplicate delete requests.

- **Mistake the AI Made & How I Noticed It:**
  - *Mistake:* When generating the NestJS `main.ts` bootstrap file, the AI left the server listening on the default port 3000 without enabling CORS (`app.enableCors()`).
  - *How I Noticed & Fixed It:* When starting both servers locally, NestJS conflicted with Next.js on port 3000, and after moving the API to port 3001, browser requests from `localhost:3000` were blocked by CORS policy in Chrome DevTools. I resolved this by configuring `process.env.PORT ?? 3001` and adding `app.enableCors({ origin: 'http://localhost:3000' })` in `api/src/main.ts`.
