"use client";

import { useEffect, useState } from "react";
import SessionExpiredModal from "@/components/SessionExpiredModal";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const handleSessionExpired = () => {
      setSessionExpired(true);
    };

    window.addEventListener(
      "session-expired",
      handleSessionExpired
    );

    return () => {
      window.removeEventListener(
        "session-expired",
        handleSessionExpired
      );
    };
  }, []);

  return (
    <>
      {children}

      {sessionExpired && <SessionExpiredModal />}
    </>
  );
}
