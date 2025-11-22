export const ENV = {
  appId: process.env.VITE_APP_ID ?? "yuqing_dongchajia",
  cookieSecret: process.env.JWT_SECRET ?? "default-secret-key-change-in-production",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "http://localhost:9999", // 提供默认值避免Invalid URL
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "default-owner",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
};
