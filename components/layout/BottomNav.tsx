"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Home", icon: "🏠" },
  { href: "/jobs", label: "Jobs", icon: "💼" },
  { href: "/debts", label: "Debts", icon: "📉" },
  { href: "/wedding", label: "Wedding", icon: "💍" },
  { href: "/savings-calculator", label: "Savings", icon: "🎯" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-30 safe-area-pb">
      <div className="flex">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                active ? "text-teal-700" : "text-stone-400 hover:text-stone-600"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
