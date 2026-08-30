"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import SessionExpiredModal from "@/components/SessionExpiredModal";
import type { RootState } from "@/redux/store";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionExpired, setSessionExpired] = useState(false);

  const token = useSelector(
    (state: RootState) => state.auth.token
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    try {
      // JWT का payload निकालना
      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();

      const remainingTime = expiryTime - currentTime;

      if (remainingTime <= 0) {
        setSessionExpired(true);
        return;
      }

      const timer = setTimeout(() => {
        setSessionExpired(true);
      }, remainingTime);

      return () => {
        clearTimeout(timer);
      };
    } catch (error) {
      console.error("Invalid access token:", error);
    }
  }, [token]);

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