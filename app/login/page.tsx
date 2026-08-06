"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent, type: "login" | "signup") => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    let error;
    if (type === "signup") {
      const res = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
        }
      });
      error = res.error;
      if (!error && !res.data.session) {
        setMessage("Check your email for the confirmation link.");
        setLoading(false);
        return;
      }
    } else {
      const res = await supabase.auth.signInWithPassword({ email, password });
      error = res.error;
    }

    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Six Stamps</h1>
          <p className="text-sm text-gray-400">Sign in to start collecting.</p>
        </div>

        <form className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500 focus:outline-none transition-colors"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div>
            <label className="text-sm text-gray-300 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500 focus:outline-none transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {message && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-sm text-center">
              {message}
            </div>
          )}

          <div className="flex gap-4 mt-2">
            <button
              onClick={(e) => handleAuth(e, "login")}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign In"}
            </button>
            <button
              onClick={(e) => handleAuth(e, "signup")}
              disabled={loading}
              className="flex-1 bg-white/10 hover:bg-white/15 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 flex justify-center"
            >
              Sign Up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
