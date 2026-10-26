import type { Metadata } from "next";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create your account and start a private travel map.",
};

export default function SignUpPage() {
  return <SignUpForm />;
}
