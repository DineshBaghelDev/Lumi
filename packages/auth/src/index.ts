import { parseAuthEnv, type AuthConfig, type Env } from "@lumi/config";
import { betterAuthSchema, createDbClient, type LumiDb } from "@lumi/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins";

export const createLumiAuth = (config: AuthConfig, db: LumiDb = createDbClient({ databaseUrl: config.databaseUrl })) =>
  betterAuth({
    appName: "Lumi",
    baseURL: config.baseUrl,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(db, { provider: "pg", schema: betterAuthSchema }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: config.requireEmailVerification,
    },
    socialProviders: {
      google: {
        clientId: config.google.clientId,
        clientSecret: config.google.clientSecret,
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    advanced: {
      cookiePrefix: "lumi",
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secureCookies,
      },
    },
    plugins: [bearer()],
  });

export const createLumiAuthFromEnv = (env: Env = process.env) => createLumiAuth(parseAuthEnv(env));

export type LumiAuth = ReturnType<typeof createLumiAuth>;
