import { loadEnvFile } from "node:process";
import { createApp } from "./app.ts";

try {
  loadEnvFile("../../.env");
} catch {
  // Production can provide env directly.
}

const app = createApp();
const port = Number(process.env.PORT ?? 3001);

const close = async () => {
  await app.close();
};

process.once("SIGTERM", () => void close());
process.once("SIGINT", () => void close());

await app.listen({ port, host: "0.0.0.0" });
