"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

export function SetActiveClass({ classId }: { classId: string }) {
  useEffect(() => {
    authClient.organization.setActive({ organizationId: classId }).catch(() => {
      // active class is best-effort; tools fall back to recent membership
    });
  }, [classId]);

  return null;
}