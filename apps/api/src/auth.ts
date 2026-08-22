import { createClient } from "@insforge/sdk";
import type { ApiConfig } from "@lumi/config";
import { ensureUser, type AuthenticatedUser, type LumiDb } from "@lumi/db";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export type TokenVerifier = (token: string) => Promise<{ authUserId: string; email?: string | null } | null>;

export class HttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const createInsforgeTokenVerifier = (config: Pick<ApiConfig, "insforge">): TokenVerifier => async (token) => {
  const client = createClient({
    baseUrl: config.insforge.projectUrl,
    anonKey: config.insforge.anonKey,
    accessToken: token,
    isServerMode: true,
  });
  const { data, error } = await client.auth.getCurrentUser();
  const user = data?.user as { id?: string; email?: string } | undefined;
  if (error || !user?.id) return null;
  return { authUserId: user.id, email: user.email ?? null };
};

const bearerToken = (request: FastifyRequest) => {
  const value = request.headers.authorization;
  const match = typeof value === "string" ? /^Bearer\s+(.+)$/i.exec(value) : null;
  return match?.[1] ?? null;
};

export const registerAuth = (app: FastifyInstance, db: LumiDb, verifyToken: TokenVerifier) => {
  app.decorate("requireAuth", async (request: FastifyRequest, _reply: FastifyReply) => {
    const token = bearerToken(request);
    if (!token) throw new HttpError(401, "unauthorized", "Missing bearer token");

    const authUser = await verifyToken(token);
    if (!authUser) throw new HttpError(401, "unauthorized", "Invalid bearer token");

    request.user = await ensureUser(db, authUser);
  });
};

declare module "fastify" {
  interface FastifyInstance {
    requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
