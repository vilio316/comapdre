import { redirect } from "next/navigation";
import { getMyClasses } from "@/app/lib/classes";
import { getSessionUserServer } from "@/app/lib/server-session";
import ClassesShell from "./classes-shell";

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const user = await getSessionUserServer();
  if (!user) redirect("/");

  const [myClasses, sp] = await Promise.all([getMyClasses(user.id), searchParams]);

  return (
    <ClassesShell
      initialClasses={myClasses}
      initialShowCreate={sp.create === "1"}
    />
  );
}