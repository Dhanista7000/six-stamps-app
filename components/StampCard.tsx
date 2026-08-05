"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Stamp, Trophy } from "lucide-react";
import { claimStamp } from "@/lib/actions";

interface StampCardProps {
  initialCard: any;
  rewards: any[];
}

export default function StampCard({ initialCard, rewards }: StampCardProps) {
  const [card, setCard] = useState(initialCard);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // Derive stamps
  const stamps = card?.card_stamps || [];
  const totalSlots = 6;
  const currentStamps = stamps.length;
  
  // Calculate expiry text
  const expiryDate = card ? new Date(card.expires_at) : null;
  const daysLeft = expiryDate 
    ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setMessage("");
    setSuccess(false);
    
    const result = await claimStamp(code);
    
    if (result.success) {
      setSuccess(true);
      setMessage("Stamp claimed successfully!");
      setCode("");
      // Add pessimistic update, page refresh will do the rest, but we can optimistically update
      setCard({
        ...card,
        id: result.card_id,
        is_completed: result.is_completed,
        card_stamps: [...(card?.card_stamps || []), { stamp_slot: result.slot }]
      });
    } else {
      setMessage(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto gap-8">
      {/* Card Header */}
      <div className="text-center w-full">
        <h1 className="text-4xl font-bold mb-2 text-gradient">Your Stamps</h1>
        {card && !card.is_completed && (
          <p className="text-gray-400">
            {6 - currentStamps} more to get a free Triple-Decker!
          </p>
        )}
        {!card && (
          <p className="text-gray-400">
            Enter your first code to start collecting!
          </p>
        )}
      </div>

      {/* The Stamp Card */}
      <div className="glass-panel p-6 rounded-3xl w-full relative overflow-hidden">
        {/* Expiry Banner */}
        {card && !card.is_completed && daysLeft !== null && (
          <div className="absolute top-0 left-0 right-0 bg-red-500/20 border-b border-red-500/30 p-2 text-center text-xs font-semibold text-red-200">
            {daysLeft === 0 ? "Expires today!" : `Expires in ${daysLeft} days`}
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-4 mt-8 mb-4">
          {Array.from({ length: totalSlots }).map((_, i) => {
            const isFilled = i < currentStamps;
            return (
              <div 
                key={i}
                className={`aspect-square rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500
                  ${isFilled ? 'bg-orange-500/20 border-orange-500/50' : 'bg-white/5 border-white/10'} border-2
                `}
              >
                <AnimatePresence>
                  {isFilled && (
                    <motion.div
                      initial={{ scale: 0, rotate: -30 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="absolute text-orange-500"
                    >
                      <Stamp size={48} strokeWidth={1.5} />
                    </motion.div>
                  )}
                </AnimatePresence>
                {!isFilled && (
                  <span className="text-white/20 text-2xl font-bold">{i + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Area */}
      {card?.is_completed ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full glass-panel p-6 rounded-2xl text-center bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30"
        >
          <Trophy className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-100 mb-2">Card Completed!</h2>
          <p className="text-green-200/80 mb-6">You've unlocked your free Triple-Decker.</p>
          <button className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl transition-colors shadow-[0_0_20px_rgba(34,197,94,0.3)]">
            Choose Reward
          </button>
        </motion.div>
      ) : (
        <form onSubmit={handleClaim} className="w-full flex flex-col gap-4">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Enter 8-digit claim code"
              className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-orange-500 focus:outline-none transition-colors text-center text-xl tracking-widest uppercase font-mono"
              maxLength={8}
              required
            />
          </div>
          
          {message && (
            <div className={`p-3 rounded-xl text-sm text-center ${success ? 'bg-green-500/20 text-green-200 border border-green-500/50' : 'bg-red-500/20 text-red-200 border border-red-500/50'}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 flex justify-center items-center shadow-[0_0_20px_rgba(249,115,22,0.2)] hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]"
          >
            {loading ? <Loader2 className="animate-spin w-6 h-6" /> : "Claim Stamp"}
          </button>
        </form>
      )}

      {/* Rewards History */}
      {rewards.length > 0 && (
        <div className="w-full mt-8">
          <h3 className="text-xl font-bold mb-4">Your Rewards</h3>
          <div className="flex flex-col gap-3">
            {rewards.map(r => (
              <div key={r.id} className="glass-panel p-4 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-semibold text-orange-200">{r.reward_options?.name || 'Triple-Decker'}</div>
                  <div className="text-sm text-gray-400">Code: <span className="font-mono text-white">{r.redemption_code}</span></div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${r.redeemed_at ? 'bg-gray-500/20 text-gray-400' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                  {r.redeemed_at ? 'Used' : 'Available'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
