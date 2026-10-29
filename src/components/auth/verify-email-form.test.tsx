import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  verifyEmail: vi.fn(),
  sendVerificationOtp: vi.fn(),
  signUpEmail: vi.fn(),
  signInEmail: vi.fn(),
  search: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
  useSearchParams: () => mocks.search,
}));

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    emailOtp: {
      verifyEmail: mocks.verifyEmail,
      sendVerificationOtp: mocks.sendVerificationOtp,
    },
    signUp: { email: mocks.signUpEmail },
    signIn: { email: mocks.signInEmail },
  },
}));

import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";
import { VerifyEmailForm } from "./verify-email-form";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.search = new URLSearchParams();
  mocks.verifyEmail.mockResolvedValue({ data: { status: true }, error: null });
  mocks.sendVerificationOtp.mockResolvedValue({ data: { success: true }, error: null });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const codeInput = () => screen.getByLabelText("Verification code");

describe("VerifyEmailForm", () => {
  it("names the address and only accepts six digits", () => {
    render(<VerifyEmailForm email="a@example.com" next={null} onBack={vi.fn()} />);

    expect(screen.getByText("a@example.com")).toBeInTheDocument();
    fireEvent.change(codeInput(), { target: { value: "12ab34 5678" } });
    expect(codeInput()).toHaveValue("123456");
    expect(codeInput()).toHaveAttribute("autocomplete", "one-time-code");
    expect(codeInput()).toHaveAttribute("inputmode", "numeric");
  });

  it("keeps the button disabled until all six digits are entered", () => {
    render(<VerifyEmailForm email="a@example.com" next={null} onBack={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Verify and continue" });

    expect(button).toBeDisabled();
    fireEvent.change(codeInput(), { target: { value: "12345" } });
    expect(button).toBeDisabled();
    fireEvent.change(codeInput(), { target: { value: "123456" } });
    expect(button).toBeEnabled();
  });

  it("verifies the code and continues to the map page", async () => {
    render(<VerifyEmailForm email="a@example.com" next={null} onBack={vi.fn()} />);

    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/map"));
    expect(mocks.verifyEmail).toHaveBeenCalledWith({
      email: "a@example.com",
      otp: "123456",
    });
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("continues to the invitation page it came from", async () => {
    render(
      <VerifyEmailForm email="a@example.com" next="/invite/abc" onBack={vi.fn()} />,
    );

    fireEvent.change(codeInput(), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/invite/abc"));
  });

  it.each([
    ["INVALID_OTP", /not correct/i],
    ["OTP_EXPIRED", /expired/i],
    ["TOO_MANY_ATTEMPTS", /too many wrong tries/i],
  ])("explains a %s failure and stays on the form", async (code, message) => {
    mocks.verifyEmail.mockResolvedValue({ data: null, error: { code, message: code } });
    render(<VerifyEmailForm email="a@example.com" next={null} onBack={vi.fn()} />);

    fireEvent.change(codeInput(), { target: { value: "000000" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("lets the person go back to use a different address", () => {
    const onBack = vi.fn();
    render(<VerifyEmailForm email="a@example.com" next={null} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));

    expect(onBack).toHaveBeenCalled();
  });

  it("waits a minute before a new code can be requested, then resends", async () => {
    vi.useFakeTimers();
    render(<VerifyEmailForm email="a@example.com" next={null} onBack={vi.fn()} />);

    const resend = screen.getByRole("button", { name: /send a new code in 60s/i });
    expect(resend).toBeDisabled();

    for (let second = 0; second < 60; second += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000);
      });
    }

    const ready = screen.getByRole("button", { name: "Send a new code" });
    expect(ready).toBeEnabled();

    await act(async () => {
      fireEvent.click(ready);
    });

    expect(mocks.sendVerificationOtp).toHaveBeenCalledWith({
      email: "a@example.com",
      type: "email-verification",
    });
    expect(screen.getByText(/new code is on its way/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send a new code in 60s/i })).toBeDisabled();
  });
});

function fillSignUp() {
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Ada" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "a long passphrase here" },
  });
  fireEvent.change(screen.getByLabelText("Confirm password"), {
    target: { value: "a long passphrase here" },
  });
}

describe("SignUpForm", () => {
  it("asks for the emailed code instead of signing the person in", async () => {
    mocks.signUpEmail.mockResolvedValue({ data: { token: null }, error: null });
    render(<SignUpForm />);

    fillSignUp();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("stays on the form when sign-up fails", async () => {
    mocks.signUpEmail.mockResolvedValue({
      data: null,
      error: { message: "Password is too common." },
    });
    render(<SignUpForm />);

    fillSignUp();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Password is too common.");
    expect(screen.queryByRole("heading", { name: "Check your email" })).toBeNull();
  });

  it("returns to the form from the code step to use a different address", async () => {
    mocks.signUpEmail.mockResolvedValue({ data: { token: null }, error: null });
    render(<SignUpForm />);

    fillSignUp();
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await screen.findByRole("heading", { name: "Check your email" });
    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));

    expect(screen.getByRole("heading", { name: "Create your account" })).toBeVisible();
  });
});

describe("SignInForm", () => {
  function fillSignIn() {
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ada@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct horse" } });
  }

  it("shows the code step when the account was never verified", async () => {
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { code: "EMAIL_NOT_VERIFIED", message: "Email not verified", status: 403 },
    });
    render(<SignInForm />);

    fillSignIn();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("heading", { name: "Check your email" })).toBeVisible();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("keeps the generic message for a wrong password", async () => {
    mocks.signInEmail.mockResolvedValue({
      data: null,
      error: { code: "INVALID_EMAIL_OR_PASSWORD", message: "nope", status: 401 },
    });
    render(<SignInForm />);

    fillSignIn();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Email or password is incorrect.",
    );
    expect(screen.queryByRole("heading", { name: "Check your email" })).toBeNull();
  });

  it("signs a verified person in as before", async () => {
    mocks.signInEmail.mockResolvedValue({ data: { token: "t" }, error: null });
    render(<SignInForm />);

    fillSignIn();
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/map"));
  });
});
