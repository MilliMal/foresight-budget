"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface UserForm {
  name: string;
  email: string;
  pin: string;
  confirmPin: string;
}

const emptyUser = (): UserForm => ({ name: "", email: "", pin: "", confirmPin: "" });

export default function SetupPage() {
  const router = useRouter();
  const [users, setUsers] = useState<[UserForm, UserForm]>([emptyUser(), emptyUser()]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((data) => {
        if (!data.setupRequired) router.replace("/login");
        else setChecking(false);
      });
  }, [router]);

  function updateUser(index: 0 | 1, field: keyof UserForm, value: string) {
    setUsers((prev) => {
      const next: [UserForm, UserForm] = [{ ...prev[0] }, { ...prev[1] }];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    for (const u of users) {
      if (!/^\d{4}$/.test(u.pin)) {
        toast.error("PINs must be exactly 4 digits");
        return;
      }
      if (u.pin !== u.confirmPin) {
        toast.error(`PINs do not match for ${u.name || "one of the users"}`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users: users.map((u) => ({ name: u.name, email: u.email, pin: u.pin })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Setup failed");
        return;
      }
      toast.success("Accounts created! Please sign in.");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-700 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <span className="text-3xl">💰</span>
          </div>
          <h1 className="text-3xl font-bold text-white">The Foresight</h1>
          <p className="text-teal-200 mt-1">First-time setup — create your two accounts</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Create Partner Accounts</h2>
          <p className="text-stone-500 text-sm mb-6">
            This setup only runs once. Both partners need a name, email, and a 4-digit PIN.
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {([0, 1] as const).map((i) => (
              <div key={i} className="p-5 bg-stone-50 rounded-xl border border-stone-100">
                <h3 className="font-semibold text-stone-700 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-teal-700 text-white text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  Partner {i + 1}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full name</label>
                    <input
                      className="input"
                      value={users[i].name}
                      onChange={(e) => updateUser(i, "name", e.target.value)}
                      placeholder="e.g. Amara"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={users[i].email}
                      onChange={(e) => updateUser(i, "email", e.target.value)}
                      placeholder="amara@example.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">4-digit PIN</label>
                    <input
                      type="password"
                      className="input tracking-widest"
                      value={users[i].pin}
                      onChange={(e) =>
                        updateUser(i, "pin", e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="••••"
                      maxLength={4}
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Confirm PIN</label>
                    <input
                      type="password"
                      className="input tracking-widest"
                      value={users[i].confirmPin}
                      onChange={(e) =>
                        updateUser(i, "confirmPin", e.target.value.replace(/\D/g, "").slice(0, 4))
                      }
                      placeholder="••••"
                      maxLength={4}
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? "Creating accounts…" : "Create accounts & get started"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
