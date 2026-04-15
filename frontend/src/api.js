export const API_URL = "/api";

const RETRY_COUNT = 12;
const RETRY_DELAY_MS = 250;

let backendReady = false;
let backendReadyPromise = null;
let publicConfigCache = null;
let publicConfigPromise = null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getBackendOrigin = () => {
  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname || "127.0.0.1";
  return `${protocol}//${hostname}:3000`;
};

export const parseJsonSafely = async (response) => {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

export const ensureBackendReady = async ({
  retries = RETRY_COUNT,
  delayMs = RETRY_DELAY_MS,
} = {}) => {
  if (backendReady) {
    return true;
  }

  if (!backendReadyPromise) {
    backendReadyPromise = (async () => {
      for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
          const response = await fetch(`${getBackendOrigin()}/health`, {
            headers: { Accept: "application/json" },
          });

          if (response.ok || response.status === 503) {
            backendReady = true;
            return true;
          }
        } catch {}

        await sleep(delayMs);
      }

      return false;
    })().finally(() => {
      if (!backendReady) {
        backendReadyPromise = null;
      }
    });
  }

  return backendReadyPromise;
};

export const getPublicConfig = async () => {
  if (publicConfigCache) {
    return publicConfigCache;
  }

  if (!publicConfigPromise) {
    publicConfigPromise = (async () => {
      const serverReady = await ensureBackendReady();
      if (!serverReady) {
        return {};
      }

      try {
        const response = await fetch(`${API_URL}/config/public`, {
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          return {};
        }

        const config = await parseJsonSafely(response);
        publicConfigCache = config;
        return config;
      } catch {
        return {};
      } finally {
        publicConfigPromise = null;
      }
    })();
  }

  return publicConfigPromise;
};
