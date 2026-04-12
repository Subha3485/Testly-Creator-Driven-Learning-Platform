import { config } from "./config.js";

const ALLOWED_RUNTIME_MODES = new Set(["mock", "live"]);

let currentRuntimeMode = ALLOWED_RUNTIME_MODES.has(String(config.runtimeDataMode).toLowerCase())
  ? String(config.runtimeDataMode).toLowerCase()
  : "live";

export function getRuntimeMode() {
  return currentRuntimeMode;
}

export function setRuntimeMode(mode) {
  const normalized = String(mode ?? "").toLowerCase();
  if (!ALLOWED_RUNTIME_MODES.has(normalized)) {
    throw new Error("mode must be one of: mock, live");
  }
  currentRuntimeMode = normalized;
  return currentRuntimeMode;
}

export function resolveDbNameForMode(mode) {
  return String(mode).toLowerCase() === "mock"
    ? config.mongodbDbNameMock
    : config.mongodbDbNameLive;
}

export function getAllowedRuntimeModes() {
  return ALLOWED_RUNTIME_MODES;
}
