import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrgContext } from "./org-membership";

export const getSessionUserServer = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

export async function requireSessionUser() {
  const user = await getSessionUserServer();
  if (!user) redirect("/");
  return user;
}

export const getOrgContextServer = cache(async () => {
  return getOrgContext(await headers());
});

export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `https://${host}`;
}
