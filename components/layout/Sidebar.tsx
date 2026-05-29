"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/context/CurrencyContext";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/personal", label: "Personal", icon: "👤" },
  { href: "/jobs", label: "Jobs", icon: "💼" },
  { href: "/debts", label: "Debts", icon: "📉" },
  { href: "/wedding", label: "Wedding", icon: "💍" },
  { href: "/son", label: "Son", icon: "✈️" },
  { href: "/relocation", label: "Relocation", icon: "🏡" },
  { href: "/savings-calculator", label: "Savings", icon: "🎯" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { currency, toggle } = useCurrency();

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-teal-900 text-white fixed left-0 top-0 z-30">
      <div className="p-5 border-b border-teal-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="font-bold text-white leading-tight">The Foresight</h1>
            <p className="text-teal-400 text-xs">Budget Tracker</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-teal-700 text-white"
                  : "text-teal-200 hover:bg-teal-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Currency toggle */}
      <div className="px-4 pb-3">
        <button
          onClick={toggle}
          className="w-full flex items-center justify-between bg-teal-800 hover:bg-teal-700 transition-colors rounded-lg px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">💱</span>
            <span className="text-sm text-teal-200">Currency</span>
          </div>
          <div className="flex items-center gap-1 bg-teal-900 rounded-md px-2 py-1">
            <span className={`text-xs font-bold transition-colors ${currency === "USD" ? "text-white" : "text-teal-500"}`}>USD</span>
            <span className="text-teal-600 text-xs mx-0.5">|</span>
            <span className={`text-xs font-bold transition-colors ${currency === "RWF" ? "text-amber-400" : "text-teal-500"}`}>RWF</span>
          </div>
        </button>
      </div>

      <div className="p-4 border-t border-teal-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-teal-700 rounded-full flex items-center justify-center text-sm font-bold">
            {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-xs text-teal-400 truncate">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-teal-400 hover:text-white transition-colors px-3 py-2 rounded-lg hover:bg-teal-800"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
