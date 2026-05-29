"use client";

import { createContext, useContext, useState, useCallback } from "react";

export type Currency = "USD" | "RWF";

const USD_TO_RWF = 1500;

interface CurrencyContextValue {
  currency: Currency;
  toggle: () => void;
  fmt: (usdAmount: number) => string;
  rate: number;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("USD");

  const toggle = useCallback(() => {
    setCurrency(c => (c === "USD" ? "RWF" : "USD"));
  }, []);

  const fmt = useCallback(
    (usdAmount: number): string => {
      if (currency === "RWF") {
        const rwf = Math.round(usdAmount * USD_TO_RWF);
        return "RWF " + rwf.toLocaleString("en-US");
      }
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(usdAmount);
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, toggle, fmt, rate: USD_TO_RWF }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used inside CurrencyProvider");
  return ctx;
}
