import { toNextJsHandler } from "better-auth/next-js";
import { getLumiAuth } from "../../../../lib/auth";

export const { GET, POST } = toNextJsHandler(getLumiAuth());
