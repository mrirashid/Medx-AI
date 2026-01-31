import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

export interface Preferences {
  language: string; // e.g., 'en-US', 'ms-MY'
  timezone: string; // e.g., 'Asia/Kuala_Lumpur'
  dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
}

interface PreferencesContextType extends Preferences {
  setLanguage: (lang: string) => void;
  setTimezone: (tz: string) => void;
  setDateFormat: (format: Preferences["dateFormat"]) => void;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(
  undefined
);

const GLOBAL_PREFERENCES_STORAGE_KEY = "preferences"; // legacy fallback

function getDefaultTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

const defaultPreferences: Preferences = {
  language: "en-US",
  timezone: getDefaultTimezone(),
  dateFormat: "MM/DD/YYYY",
};

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useAuth();
  const userKey = currentUser
    ? `preferences_${currentUser.id}`
    : GLOBAL_PREFERENCES_STORAGE_KEY;
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const raw =
      localStorage.getItem(userKey) ||
      localStorage.getItem(GLOBAL_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultPreferences;
    try {
      const parsed = JSON.parse(raw);
      return { ...defaultPreferences, ...parsed } as Preferences;
    } catch {
      return defaultPreferences;
    }
  });

  // Reload preferences whenever the logged-in user changes
  useEffect(() => {
    const key = currentUser
      ? `preferences_${currentUser.id}`
      : GLOBAL_PREFERENCES_STORAGE_KEY;
    const raw =
      localStorage.getItem(key) ||
      localStorage.getItem(GLOBAL_PREFERENCES_STORAGE_KEY);
    if (!raw) {
      setPrefs(defaultPreferences);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      setPrefs({ ...defaultPreferences, ...parsed });
    } catch {
      setPrefs(defaultPreferences);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem(userKey, JSON.stringify(prefs));
  }, [prefs, userKey]);

  const setLanguage = (lang: string) =>
    setPrefs((p) => ({ ...p, language: lang }));
  const setTimezone = (tz: string) => setPrefs((p) => ({ ...p, timezone: tz }));
  const setDateFormat = (format: Preferences["dateFormat"]) =>
    setPrefs((p) => ({ ...p, dateFormat: format }));

  return (
    <PreferencesContext.Provider
      value={{ ...prefs, setLanguage, setTimezone, setDateFormat }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx)
    throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
