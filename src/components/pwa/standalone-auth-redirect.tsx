"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as Navigator & { standalone?: boolean }).standalone === true) {
    return true;
  }
  return false;
}

export function StandaloneAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (!isStandaloneDisplay()) return;
    router.replace("/sign-in");
  }, [router]);

  return null;
}
