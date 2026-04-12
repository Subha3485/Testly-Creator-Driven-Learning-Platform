import { createServer } from "http";
import { createApp } from "./app.js";
import { initializeDatabase } from "./bootstrap.js";
import { config } from "./config.js";
import { createRealtimeServer } from "./realtime.js";
import { getDatabaseConnectionStatus } from "./db.js";
import { getRuntimeMode, resolveDbNameForMode } from "./runtime_mode.js";

const PORT_RETRY_LIMIT = 10;

function buildPublicBaseUrl(port) {
  try {
    const url = new URL(config.publicBaseUrl);
    url.port = String(port);
    return url.toString().replace(/\/$/, "");
  } catch {
    return `http://${config.host}:${port}`;
  }
}

async function listenWithPortRetry(server, host, preferredPort) {
  for (let index = 0; index < PORT_RETRY_LIMIT; index += 1) {
    const candidatePort = preferredPort + index;
    try {
      await new Promise((resolve, reject) => {
        const onError = (error) => {
          server.off("listening", onListening);
          reject(error);
        };
        const onListening = () => {
          server.off("error", onError);
          resolve();
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(candidatePort, host);
      });
      return candidatePort;
    } catch (error) {
      if (error?.code !== "EADDRINUSE") {
        throw error;
      }
      if (index === PORT_RETRY_LIMIT - 1) {
        throw error;
      }
      console.warn(`⚠️ Port ${candidatePort} is in use. Retrying on ${candidatePort + 1}...`);
    }
  }

  throw new Error("Unable to find an available port.");
}

try {
  await initializeDatabase();
  const dbStatus = await getDatabaseConnectionStatus();

  const httpServer = createServer();
  const io = createRealtimeServer(httpServer);
  const app = createApp(io);
  httpServer.on("request", app);
  const activePort = await listenWithPortRetry(httpServer, config.host, config.port);
  const activeBaseUrl = buildPublicBaseUrl(activePort);

  httpServer.on("error", (error) => {
    console.error("❌ Server runtime error.");
    console.error(error);
  });

  setImmediate(() => {
    console.log("\n");
    console.log("╔═══════════════════════════════════════════════════════════╗");
    console.log("║                                                           ║");
    console.log("║          🚌 BUS LOGISTICS SERVER STARTED                 ║");
    console.log("║                                                           ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log("");
    console.log(`✅ Server running on: ${activeBaseUrl}`);
    console.log(`📍 Host: ${config.host}:${activePort}`);
    console.log(`🔧 Server mode: ${config.serverMode}`);
    console.log(`🧭 Runtime data mode: ${getRuntimeMode()}`);
    console.log(`🗃️  Live DB: ${resolveDbNameForMode("live")}`);
    console.log(`🗃️  Mock DB: ${resolveDbNameForMode("mock")}`);
    console.log(`🧪 Mongo status: ${dbStatus.connected ? "CONNECTED" : "DISCONNECTED"}`);
    if (!dbStatus.connected) {
      console.log(`⚠️  Mongo error: ${dbStatus.error}`);
    }
    console.log(`🛠️  Admin panel: ${activeBaseUrl}/admin`);
    console.log(`⚡ Realtime socket: ${activeBaseUrl}`);
    console.log("");
    console.log("Server is ready to accept connections!");
    console.log("\n");
  });
} catch (error) {
  console.error("\n❌ FATAL ERROR - Server boot failed!");
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.error(error);
  console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  process.exit(1);
}
