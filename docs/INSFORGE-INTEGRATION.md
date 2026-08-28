# InsForge integration boundaries

Use the centralized factories only; features do not construct InsForge clients directly.

- API and worker are trusted processes. Create their admin client through `@lumi/db` with `createApiInsforgeClient(config)` or `createWorkerInsforgeClient(config)`. The admin client may access database and storage services; keep `INSFORGE_API_KEY` server-only.
- Web uses `createWebInsforgeClient(parseWebPublicEnv(process.env))`, which uses the SDK SSR browser client and exposes only the public project URL, anon key, and user session. It is the web entry point for Auth, Realtime, and user-scoped Storage.
- Product authorization remains in API handlers. RLS policies are not enabled in the current schema and must be added before treating database access as a second tenant boundary. Storage metadata currently persists deterministic paths; returned object URLs/keys require deployment-time upload wiring. Spec 005 owns refresh routes, middleware, and OAuth flows.

No product table, bucket, or server secret belongs in browser code.
