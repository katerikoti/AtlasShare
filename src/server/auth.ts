import { betterAuth, type BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { emailOTP } from "better-auth/plugins/email-otp";
import { after } from "next/server";

import { brand } from "@/config/brand";
import { getEnv } from "@/config/env";
import { getDb } from "@/server/db";
import { sendPasswordResetEmail, sendVerificationCodeEmail } from "@/server/email";
import { removeUnverifiedAccount } from "@/server/unverified-accounts";

/** How long an email-verification code stays valid, and how many tries it gets. */
export const VERIFICATION_CODE_MINUTES = 10;
export const VERIFICATION_CODE_ATTEMPTS = 5;

export function createAuthOptions(): BetterAuthOptions {
  const env = getEnv();

  return {
    appName: brand.name,
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [(env.APP_URL ?? env.NEXT_PUBLIC_APP_URL) as string],

    database: prismaAdapter(getDb(), {
      provider: "postgresql",
    }),

    emailAndPassword: {
      enabled: true,
      // 12 characters is long enough for a passphrase and short enough to type
      // on a phone. Better Auth hashes with scrypt by default.
      minPasswordLength: 12,
      maxPasswordLength: 128,
      // An account cannot sign in until its email address is verified with a
      // code. Sign-up therefore creates no session; the code step signs the
      // person in once it succeeds.
      requireEmailVerification: true,
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

    emailVerification: {
      // Signing in to an unverified account emails a fresh code (after the
      // password was correct), so a closed tab never strands a new account.
      sendOnSignIn: true,
      autoSignInAfterVerification: true,
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

    hooks: {
      // A new sign-up for an address that only has a never-verified account
      // replaces that account (see unverified-accounts.ts for why).
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const email = (ctx.body as { email?: unknown } | undefined)?.email;
        if (typeof email === "string") await removeUnverifiedAccount(email);
      }),
    },

    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: VERIFICATION_CODE_MINUTES * 60,
        allowedAttempts: VERIFICATION_CODE_ATTEMPTS,
        // Only a hash of the code is stored in the verification table.
        storeOTP: "hashed",
        // Use codes (not links) for the built-in verification emails.
        overrideDefaultEmailVerification: true,
        // The plugin also offers passwordless sign-in and password reset by
        // code. AtlasShare uses neither: refuse to create accounts that way and
        // only ever deliver codes for email verification.
        disableSignUp: true,
        rateLimit: { window: 60, max: 6 },
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "email-verification") return;
          const promise = sendVerificationCodeEmail({
            to: email,
            code: otp,
            expiresInMinutes: VERIFICATION_CODE_MINUTES,
          });
          // Ensure the email is sent before the serverless function ends
          if (typeof after === "function") {
            try {
              after(() => promise);
              return;
            } catch {
              // fall through to await
            }
          }
          await promise;
        },
      }),
      // Must be last: lets server actions set auth cookies.
      nextCookies(),
    ],
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
