"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { FaGoogle, FaApple } from "react-icons/fa6";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const router = useRouter();

  const social = async (provider: string) => {
    await authClient.signIn.social({
      provider: provider,
      callbackURL: `${process.env.NEXT_PUBLIC_APP_BASE_URL}/dashboard`,
    });
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
          <FaGoogle />
          Sign up with Google
        </button>
        <button
          onClick={() => social("Apple")}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-surface px-4 py-2.5 text-sm font-medium text-deep transition-colors hover:bg-gray-50"
        >
          <FaApple />
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
