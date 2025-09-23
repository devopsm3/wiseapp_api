import dotenv from "dotenv"

dotenv.config()

interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpireIn: string | number; // e.g. "1h" or 3600
  jwtRefreshExpireIn: string | number; // e.g. "1h" or 3600
  // X_CLIENT_ID: string;
  TELEGRAM_API_SESSION: string;
  TELEGRAM_API_ID: string;
  TELEGRAM_API_HASH_CODE: string;
  OPENROUTER_API_KEY: string;
}

const config: Config = {
    port: Number(process.env.PORT) || 8000,
    nodeEnv: process.env.NODE_ENV || "development",
    // jwt keys
    jwtSecret: process.env.JWT_SECRET || "jwt-secret-wise",
    jwtRefreshSecret: process.env.JWT_SECRET_REFRESH || "jwt-secret-wise-refresh",
    jwtExpireIn: process.env.JWT_EXPIRE_IN || "2h",
    jwtRefreshExpireIn: process.env.JWT_REFRESH_EXPIRE_IN || "1d",
    // telegram keys
    TELEGRAM_API_SESSION: process.env.TELEGRAM_API_SESSION || "",
    TELEGRAM_API_ID: process.env.TELEGRAM_API_ID || "",
    TELEGRAM_API_HASH_CODE: process.env.TELEGRAM_API_HASH_CODE || "",
    // twitter keys
    // X_CLIENT_ID: process.env.X_CLIENT_ID || "",
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || ""
}

export default config