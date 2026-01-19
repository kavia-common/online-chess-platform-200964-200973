/**
 * Centralized env parsing for CRA. All variables are optional and the app should
 * run in a local-only mode by default.
 */

function parseBool(value, fallback = false) {
  if (value == null) return fallback;
  const v = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return fallback;
}

function parseJsonObject(value, fallback = {}) {
  if (value == null || String(value).trim() === "") return fallback;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    return fallback;
  } catch {
    return fallback;
  }
}

// PUBLIC_INTERFACE
export function getAppEnv() {
  /** Returns normalized environment settings used by the app. */
  const apiBase = process.env.REACT_APP_API_BASE || process.env.REACT_APP_BACKEND_URL || "";
  const wsUrl = process.env.REACT_APP_WS_URL || "";

  const nodeEnv = process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || "development";
  const enableSourceMaps = parseBool(process.env.REACT_APP_ENABLE_SOURCE_MAPS, true);
  const port = process.env.REACT_APP_PORT || "3000";
  const logLevel = process.env.REACT_APP_LOG_LEVEL || "info";

  const featureFlags = parseJsonObject(process.env.REACT_APP_FEATURE_FLAGS, {});
  const experimentsEnabled = parseBool(process.env.REACT_APP_EXPERIMENTS_ENABLED, false);

  // Networking is explicitly opt-in to keep local-only mode working.
  const networkEnabled = parseBool(featureFlags.network, false);

  return {
    apiBase,
    wsUrl,
    nodeEnv,
    enableSourceMaps,
    port,
    logLevel,
    featureFlags,
    experimentsEnabled,
    networkEnabled,
  };
}
