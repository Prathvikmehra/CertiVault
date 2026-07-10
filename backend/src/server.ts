import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import { createApp } from "./app.js";
import { getEnv } from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { seedDatabase } from "./modules/documents/document.store.js";
import { createShutdownHandler } from "./utils/gracefulShutdown.js";
import http from "http";

const env = getEnv();
const app = createApp();

let server: http.Server;

const start = async () => {
  try {
    // Connect to database
    await connectDB(env.MONGODB_URI);

    // Seed database if necessary
    await seedDatabase();

    // Start listening
    server = app.listen(env.PORT, () => {
      console.log(`CertiVault API listening on port ${env.PORT}`);
    });

    const shutdown = createShutdownHandler(server);

    const handleSignal = async (signal: string) => {
      shutdown(signal);
      try {
        await disconnectDB();
      } catch (err) {
        console.error("Error during database disconnection:", err);
      }
      process.exit(process.exitCode || 0);
    };

    process.once("SIGINT", () => handleSignal("SIGINT"));
    process.once("SIGTERM", () => handleSignal("SIGTERM"));
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

start();
