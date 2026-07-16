"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();

  const social = async (provider: string) => {
    await authClient.signIn.social(
      {
        provider: provider,
      },
      {
        onSuccess: () => router.push("/dashboard"),
      },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    await authClient.signUp.email(
      {
        email,
        password,
        name,
      },
      {
        onSuccess: () => router.push("/dashboard"),
      },
    );
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-deep sm:text-3xl">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Start studying smarter with Compadre.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={() => social("google")}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign up with Google
        </button>
        <button
          onClick={() => social("Apple")}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gray-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
            />
          </svg>
          Sign up with Apple
        </button>
      </div>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-ink-muted">or with email</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-muted">
            Full name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-muted">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-muted">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-lg border border-gray-300 bg-surface px-4 py-2.5 text-sm outline-none focus:border-blue focus:ring-2 focus:ring-blue/20"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink-muted">
            Confirm password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={`w-full rounded-lg border bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 ${
              confirm && password !== confirm
                ? "border-red-400 focus:border-red-400 focus:ring-red/20"
                : "border-gray-300 focus:border-blue focus:ring-blue/20"
            }`}
          />
          {confirm && password !== confirm && (
            <p className="mt-1 text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>
        <button
          type="submit"
          disabled={!name || !email || !password || password !== confirm}
          className="w-full rounded-lg bg-deep py-2.5 text-sm font-medium text-white transition-colors hover:bg-deep-light disabled:opacity-50"
        >
          Create account
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/auth/sign-in"
          className="font-medium text-blue underline hover:text-blue-light"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
