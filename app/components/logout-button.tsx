"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { FaSignOutAlt } from "react-icons/fa";

export function LogoutButton() {
  const router = useRouter();

  const logout = () => {
    authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/") },
    });
  };

  return (
    <button
      onClick={logout}
      className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-red-50 hover:text-red-600"
    >
      <FaSignOutAlt />
      Logout
    </button>
  );
}