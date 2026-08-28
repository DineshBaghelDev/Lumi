import type { LumiAuth } from "@lumi/auth";
import { ensureUser, type AuthenticatedUser, type LumiDb } from "@lumi/db";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export type SessionResolver = (headers: Headers) => Promise<{ authUserId: string; email?: string | null } | null>;

export class HttpError extends Error {
  statusCode: number;
  code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const credentialHeaders = (request: Pick<FastifyRequest, "headers">) => {
  const headers = new Headers();
  const authorization = request.headers.authorization;
  const cookie = request.headers.cookie;
  if (typeof authorization === "string" && /^Bearer\s+\S+$/i.test(authorization)) headers.set("authorization", authorization);
  if (typeof cookie === "string" && cookie) headers.set("cookie", cookie);
  return headers;
};

export const createBetterAuthSessionResolver = (auth: LumiAuth): SessionResolver => async (headers) => {
  const session = await auth.api.getSession({ headers });
  return session ? { authUserId: session.user.id, email: session.user.email } : null;
};

export const registerAuth = (app: FastifyInstance, db: LumiDb, resolveSession: SessionResolver) => {
  app.decorate("requireAuth", async (request: FastifyRequest, _reply: FastifyReply) => {
    const headers = credentialHeaders(request);
    if (!headers.has("authorization") && !headers.has("cookie")) {
      throw new HttpError(401, "unauthorized", "Missing auth credential");
    }

    const authUser = await resolveSession(headers);
    if (!authUser) throw new HttpError(401, "unauthorized", "Invalid auth session");

    request.user = await ensureUser(db, authUser);
  });
};

declare module "fastify" {
  interface FastifyInstance {
    requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
