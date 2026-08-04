"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function UserAvatar({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const { data } = authClient.useSession();
  const user = data?.user;
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const image = user?.image;

    if (!image) {
      setSrc(null);
      return;
    }

    if (image.startsWith("avatars/")) {
      setSrc(null);
      fetch("/api/avatar")
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && d.url) setSrc(d.url);
        })
        .catch(() => {});
    } else {
      setSrc(image);
    }

    return () => {
      cancelled = true;
    };
  }, [user?.image]);

  if (src) {
    return (
      <img
        src={src}
        alt=""
        style={{ width: size, height: size }}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`flex items-center justify-center rounded-full bg-gold/20 font-bold text-gold ${className}`}
    >
      {user?.name?.charAt(0) ?? "?"}
    </div>
  );
}
