import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { en, type Translations } from "./en";
import { zh } from "./zh";

type Locale = "zh-CN" | "en";

interface LanguageContextValue {
  locale: Locale;
  t: (key: keyof Translations) => string;
  toggleLanguage: () => void;
}

const STORAGE_KEY = "quickclip-locale";

const LanguageContext = createContext<LanguageContextValue | null>(null);

function loadLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "zh-CN" || saved === "en") return saved;
  } catch {}
  return "en";
}

function saveLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}

const dictionaries: Record<Locale, Translations> = {
  en,
  "zh-CN": zh as unknown as Translations,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(loadLocale);

  useEffect(() => {
    saveLocale(locale);
  }, [locale]);

  const t = (key: keyof Translations): string => {
    return dictionaries[locale][key] ?? key;
  };

  const toggleLanguage = () => {
    setLocale((prev) => (prev === "en" ? "zh-CN" : "en"));
  };

  return (
    <LanguageContext.Provider value={{ locale, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
