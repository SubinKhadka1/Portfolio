"use client";

import { useEffect } from "react";

export default function DesignsPageShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("page-designs");
    document.documentElement.classList.add("page-designs");

    return () => {
      document.body.classList.remove("page-designs");
      document.documentElement.classList.remove("page-designs");
    };
  }, []);

  return <>{children}</>;
}
