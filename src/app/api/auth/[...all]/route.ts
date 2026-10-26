import { toNextJsHandler } from "better-auth/next-js";

import { getAuth } from "@/server/auth";

/**
 * Better Auth HTTP endpoints.
 *
 * The instance is resolved per request so the build does not need secrets.
 */
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler((request) =>
  getAuth().handler(request),
);
