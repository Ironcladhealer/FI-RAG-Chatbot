# FI-RAG-Chatbot

A Retrieval-Augmented Generation (RAG) chatbot for Formula 1 data.

This repository contains a Next.js frontend that queries a RAG backend using
Google's GenAI (Gemini) for embeddings & generation and AstraDB (DataStax)
for vector retrieval. The project includes a seeding script to load documents
and a small chat UI in `frontend/app` that POSTs to `POST /api/chat`.

**Quick links**

- Frontend app: `frontend/`
- Seed script: `scripts/loadDB.ts` (run with `ts-node`/`node`)
- API route: `frontend/app/api/chat/route.ts`

**This README** covers setup, environment, running locally, and common
troubleshooting notes collected while developing on Windows.

**Supported runtimes**

- Node.js 18+ (recommended for `ReadableStream` support)
- Next.js 16 (Turbopack)

---

**Getting started (quick)**

1. Install dependencies in `frontend/`:

	 - Open a terminal in `frontend/` and run:

		 ```powershell
		 npm install --legacy-peer-deps
		 ```

	 - Note: `--legacy-peer-deps` was used to resolve peer dependency issues during development.

2. Create a `.env` file in `frontend/` (or set env vars) with the following keys:

	 - `ASTRA_DB_ENDPOINT` — Astra DB GraphQL/Document endpoint
	 - `ASTRA_DB_TOKEN` — Astra DB application token
	 - `ASTRA_DB_NAME` — Astra DB keyspace/namespace
	 - `ASTRA_DB_COLLECTION` — Collection name used for vectors
	 - `GEMINI_API` — Google GenAI API key (Gemini)

3. (Optional) Seed the DB with sample data using the provided script:

	 ```powershell
	 # from repo root
	 cd frontend
	 node --loader ts-node/esm ../scripts/loadDB.ts
	 ```

	 - The seed script uses Puppeteer to scrape pages and LangChain loaders to chunk and embed.
	 - On Windows, Puppeteer may fail to launch Chromium. See troubleshooting below.

4. Run the frontend dev server:

	 ```powershell
	 cd frontend
	 npm run dev
	 ```

	 - Open http://localhost:3000 and try the chat UI.

---

**Project structure (important files)**

- `frontend/app/page.tsx` — React client UI, sends messages to `/api/chat`.
- `frontend/app/api/chat/route.ts` — Server route that runs embedding, vector search in AstraDB, and generation via Google GenAI.
- `frontend/app/layout.tsx` — Root layout (contains `suppressHydrationWarning` to avoid extension-related hydration mismatches).
- `scripts/loadDB.ts` — Data seeding script (Puppeteer + LangChain + embeddings + DB insert).

---

**How the RAG flow works**

1. Frontend posts `{ message: string }` to `/api/chat`.
2. The route creates an embedding for the latest user message (Gemini embedding model).
3. It queries AstraDB for nearest documents using the vector.
4. The retrieved docs are injected into a prompt and sent to Gemini for generation.
5. The response is returned as JSON `{ response: string }`.

---

**Troubleshooting**

- Puppeteer Chromium launch fails on Windows (exit code like `3221226505`):
	- Try adding launch args: `--no-sandbox --disable-setuid-sandbox --disable-gpu`.
	- Use system Chrome by setting the `executablePath` to an installed Chrome/Edge binary.
	- Ensure Visual C++ redistributable is installed and antivirus isn't blocking.

- AstraDB hibernation (free tier):
	- You may see: `Your database is resuming from hibernation and will be available in the next few minutes.`
	- The server should catch this and return a fallback response; retry after a minute.

- Hydration mismatch warnings in dev (attributes such as `data-gr-ext-installed`):
	- Browser extensions (e.g., Grammarly) can add attributes to `document` during render.
	- The app sets `suppressHydrationWarning` on the `body` element in `frontend/app/layout.tsx` to avoid noisy warnings.

- `ai` / `@ai-sdk/react` module confusion:
	- The repo uses the `ai` package for SDK functionality; imports/exports changed between versions.
	- If you add Vercel’s `ai` React hooks, ensure the package exports the expected hook or use a backend API route instead.

- Source map warnings from Next.js/Turbopack:
	- These are non-critical warnings about invalid source maps and can be ignored during development.

---

**Testing the RAG agent (quick checks)**

- Send this test message to verify the full pipeline:

	```
	Who won the 2023 F1 World Championship?
	```

- Expected results:
	- Response mentions a specific driver (e.g., Max Verstappen) if that data exists in your DB.
	- No DB errors in the server log once AstraDB is awake.

---

