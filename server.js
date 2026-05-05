process.env.NODE_ENV = process.env.NODE_ENV || "production";

const backend = await import("./test-series/backend/server.js");
const backendModule = backend.default || backend;

const startServer = backendModule.startServer;

if (typeof startServer !== "function") {
	throw new Error("Backend startServer export is missing.");
}

startServer();