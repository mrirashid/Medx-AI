import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translations } from "../utils/translations";

type TranslationKey = string;

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  timezone: string;
  setTimezone: (tz: string) => void;
  dateFormat: string;
  setDateFormat: (fmt: string) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: (_lang: string) => {},
  timezone: "Asia/Kuala_Lumpur",
  setTimezone: (_tz: string) => {},
  dateFormat: "DD/MM/YYYY",
  setDateFormat: (_fmt: string) => {},
  t: (key: TranslationKey): string => key,
});

export const useLanguage = () => useContext(LanguageContext);

// Helper to normalize language codes
const normalizeLanguage = (lang: string): string => {
  // Handle both 'ms' and 'ms-MY' formats
  if (lang === "ms" || lang === "ms-MY") return "ms";
  return "en";
};

const getTranslationLang = (lang: string): "en-US" | "ms-MY" => {
  if (lang === "ms" || lang === "ms-MY") return "ms-MY";
  return "en-US";
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState(() => {
    // Check both storage keys for compatibility
    const prefRaw = localStorage.getItem("preferences") || localStorage.getItem("preferences_undefined");
    if (prefRaw) {
      try {
        const pref = JSON.parse(prefRaw);
        if (pref.language) return normalizeLanguage(pref.language);
      } catch {}
    }
    const saved = localStorage.getItem("app_language");
    return saved ? normalizeLanguage(saved) : "en";
  });
  const [timezone, setTimezone] = useState(() => localStorage.getItem("app_timezone") || "Asia/Kuala_Lumpur");
  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem("app_date_format") || "DD/MM/YYYY");

  // Translation function
  const t = useCallback((key: TranslationKey): string => {
    const lang = getTranslationLang(language);
    const langTranslations = translations[lang] as Record<string, string>;
    return langTranslations[key] || key;
  }, [language]);

  const setLanguage = useCallback((lang: string) => {
    const normalized = normalizeLanguage(lang);
    setLanguageState(normalized);
    localStorage.setItem("app_language", normalized);
    // Update document language attribute for accessibility
    document.documentElement.lang = normalized;
  }, []);

  // Sync with PreferencesContext localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const prefRaw = localStorage.getItem("preferences");
      if (prefRaw) {
        try {
          const pref = JSON.parse(prefRaw);
          if (pref.language) {
            const normalized = normalizeLanguage(pref.language);
            setLanguageState(normalized);
            document.documentElement.lang = normalized;
          }
        } catch {}
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    // Set initial document language
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider 
      value={{ 
        language, 
        setLanguage, 
        timezone, 
        setTimezone, 
        dateFormat, 
        setDateFormat, 
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
