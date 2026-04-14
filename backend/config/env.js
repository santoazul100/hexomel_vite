import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const backendRoot = path.resolve(__dirname, "..");
export const envPath = path.join(backendRoot, ".env");

dotenv.config({ path: envPath });

const readEnv = (key, fallback) => process.env[key] ?? fallback;

const parsePort = (value, fallback = 3306) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const baseDbConfig = Object.freeze({
  host: readEnv("DB_HOST", "localhost"),
  port: parsePort(readEnv("DB_PORT", 3306)),
  user: readEnv("DB_USER", "root"),
  password: readEnv("DB_PASSWORD", ""),
  database: readEnv("DB_NAME", "hexomel"),
});

export const getDbConfig = (overrides = {}) => ({
  ...baseDbConfig,
  ...overrides,
});

export const getServerDbConfig = (overrides = {}) => {
  const { database, ...serverConfig } = baseDbConfig;
  return {
    ...serverConfig,
    ...overrides,
  };
};
