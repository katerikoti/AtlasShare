import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";

/**
 * Browser auth client. It talks to /api/auth on the same origin, so no base URL
 * is needed and no secret is exposed. The email-OTP client adds the code
 * verification calls used right after sign-up.
 */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
});
