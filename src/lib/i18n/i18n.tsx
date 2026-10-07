import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { en } from "./locales/en";
import { hi } from "./locales/hi";
import { gu } from "./locales/gu";

export type Locale = "en" | "hi" | "gu";
const dicts: Record<Locale, Record<string, string>> = { en, hi, gu };

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (k: string) => string };
const I18nCtx = createContext<Ctx>({ locale: "en", setLocale: () => {}, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const saved = (typeof window !== "undefined" &&
      localStorage.getItem("cc.locale")) as Locale | null;
    if (saved && dicts[saved]) setLocaleState(saved);
  }, []);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem("cc.locale", l);
  };
  const t = (k: string) => dicts[locale][k] ?? dicts.en[k] ?? k;
  return <I18nCtx.Provider value={{ locale, setLocale, t }}>{children}</I18nCtx.Provider>;
}

export const useI18n = () => useContext(I18nCtx);
