import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { createWorkers } from "./src/queues";

async function main(): Promise<void> {
  console.info("Starting workers...");

  const workers = createWorkers();

  console.info(
    `Started ${workers.length} worker(s): ${workers.map((w) => w.name).join(", ")}`,
  );

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.info(`\nReceived ${signal}, shutting down workers...`);
    await Promise.all(workers.map((w) => w.close()));
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("Workers failed to start:", err);
  process.exit(1);
});
