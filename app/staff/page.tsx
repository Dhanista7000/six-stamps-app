"use client";

import { useState } from "react";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { redeemCodeStaff } from "@/lib/actions";

export default function StaffRedemptionPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setResult(null);
    
    const res = await redeemCodeStaff(code.trim().toUpperCase());
    setResult(res);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl flex flex-col gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Staff Portal</h1>
          <p className="text-sm text-gray-400">Validate and redeem rewards.</p>
        </div>

        <form onSubmit={handleRedeem} className="flex flex-col gap-4">
          <div>
            <label className="text-sm text-gray-300 block mb-1">Redemption Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500 focus:outline-none transition-colors text-center text-xl tracking-widest font-mono uppercase"
              placeholder="e.g. A1B2C3"
              maxLength={6}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center shadow-[0_0_20px_rgba(37,99,235,0.2)]"
          >
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Verify Code"}
          </button>
        </form>

        {result && (
          <div className={`p-6 rounded-xl border flex flex-col items-center text-center gap-3 ${
            result.success 
              ? (result.alreadyUsed ? 'bg-orange-500/10 border-orange-500/30' : 'bg-green-500/10 border-green-500/30')
              : 'bg-red-500/10 border-red-500/30'
          }`}>
            {result.success && !result.alreadyUsed && <CheckCircle className="w-12 h-12 text-green-500" />}
            {result.success && result.alreadyUsed && <XCircle className="w-12 h-12 text-orange-500" />}
            {!result.success && <XCircle className="w-12 h-12 text-red-500" />}
            
            <div className="text-lg font-semibold">
              {result.success ? result.message : result.error}
            </div>
            
            {result.reward && (
              <div className="text-sm text-gray-300">
                Reward: <span className="font-bold text-white">{result.reward.reward_options?.name}</span>
              </div>
            )}
            
            {result.success && !result.alreadyUsed && (
              <div className="mt-2 text-sm text-green-400 font-medium">
                Please hand over the reward to the customer now.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
