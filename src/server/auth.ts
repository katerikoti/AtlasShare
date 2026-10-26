import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { brand } from "@/config/brand";
import { getEnv } from "@/config/env";
import { getDb } from "@/server/db";
import {
  sendPasswordResetEmail,
  sendWelcomeEmailOnce,
} from "@/server/email";

export function createAuthOptions(): BetterAuthOptions {
  const env = getEnv();

  return {
    appName: brand.name,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.NEXT_PUBLIC_APP_URL],

    database: prismaAdapter(getDb(), {
      provider: "postgresql",
    }),

    emailAndPassword: {
      enabled: true,
      // 12 characters is long enough for a passphrase and short enough to type
      // on a phone. Better Auth hashes with scrypt by default.
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          token,
        });
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
      // Do not cache the session in an additional cookie: revocation must take
      // effect on the next request.
      cookieCache: { enabled: false },
    },

    user: {
      // Account deletion is password-gated and removes the user immediately.
      // Cascades in the Prisma schema remove sessions, visits, maps, members,
      // and invitations.
      deleteUser: {
        enabled: true,
      },
      additionalFields: {
        // Managed by our own code after sign-up; never accepted from a client.
        welcomeEmailSentAt: {
          type: "date",
          required: false,
          input: false,
          returned: false,
        },
      },
    },

    rateLimit: {
      // Better Auth defaults to production-only rate limiting. Keep that, but
      // define explicit rules so production is not on the generic default.
      enabled: env.NODE_ENV === "production",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 15 * 60, max: 10 },
        "/sign-up/email": { window: 60 * 60, max: 5 },
        "/request-password-reset": { window: 60 * 60, max: 3 },
        "/reset-password": { window: 15 * 60, max: 10 },
      },
    },

    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Never let a mail failure break sign-up.
            try {
              await sendWelcomeEmailOnce({
                id: user.id,
                name: user.name,
                email: user.email,
              });
            } catch (error) {
              console.error("[email] welcome failed", {
                userId: user.id,
                message:
                  error instanceof Error ? error.message : "unknown error",
              });
            }
          },
        },
      },
    },

    // Must be last: lets server actions set auth cookies.
    plugins: [nextCookies()],
  };
}

function buildAuth() {
  return betterAuth(createAuthOptions());
}

type Auth = ReturnType<typeof buildAuth>;

const globalForAuth = globalThis as unknown as { auth?: Auth };

/**
 * Lazy Better Auth instance. Building it at module scope would require secrets
 * during `next build`; this keeps the build independent of runtime config.
 */
export function getAuth(): Auth {
  if (!globalForAuth.auth) {
    globalForAuth.auth = buildAuth();
  }
  return globalForAuth.auth;
}

export type AuthSession = Auth["$Infer"]["Session"];
