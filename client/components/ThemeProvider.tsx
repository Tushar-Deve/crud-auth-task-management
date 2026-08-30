"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/redux/store";

type ThemePreference = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(
  undefined
);

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useSelector((state: RootState) => state.auth.user);

  const role = user?.role;
  const userId = user?.id;

  const storageKey =
    role === "admin"
      ? "adminThemePreference"
      : role === "user" && userId
        ? `userThemePreference_${userId}`
        : null;

  const [theme, setThemeState] =
    useState<ThemePreference>("light");

  /* =========================
     LOAD SAVED THEME
  ========================= */

  useEffect(() => {
    if (!storageKey) {
      setThemeState("light");
      return;
    }

    const savedTheme =
      localStorage.getItem(storageKey);

    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    ) {
      setThemeState(savedTheme);
    } else {
      setThemeState("light");
    }
  }, [storageKey]);

  /* =========================
     APPLY THEME
  ========================= */

  useEffect(() => {
    const root = document.documentElement;

    const systemTheme = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const applyTheme = (
      preference: ThemePreference
    ) => {
      root.classList.remove("light", "dark");

      if (preference === "light") {
        root.classList.add("light");
      }

      if (preference === "dark") {
        root.classList.add("dark");
      }

      if (preference === "system") {
        root.classList.add(
          systemTheme.matches ? "dark" : "light"
        );
      }
    };

    applyTheme(theme);

    const handleSystemThemeChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    systemTheme.addEventListener(
      "change",
      handleSystemThemeChange
    );

    return () => {
      systemTheme.removeEventListener(
        "change",
        handleSystemThemeChange
      );
    };
  }, [theme]);

  /* =========================
     CHANGE THEME
  ========================= */

  const setTheme = (
    newTheme: ThemePreference
  ) => {
    if (!storageKey) {
      return;
    }

    localStorage.setItem(
      storageKey,
      newTheme
    );

    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

/* =========================
   USE THEME HOOK
========================= */

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider"
    );
  }

  return context;
}