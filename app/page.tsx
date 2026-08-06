import { getUser, getActiveCard, getRewards, getRewardOptions, signOut } from "@/lib/actions";
import { redirect } from "next/navigation";
import StampCard from "@/components/StampCard";

export default async function Home() {
  const user = await getUser();
  
  if (!user) {
    redirect("/login");
  }

  const [activeCard, rewards, rewardOptions] = await Promise.all([
    getActiveCard(),
    getRewards(),
    getRewardOptions()
  ]);

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 pt-12 md:pt-24 relative overflow-hidden">
      {/* Navbar / User Info */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center max-w-md mx-auto left-0 right-0 z-10">
        <div className="font-bold text-orange-500">Six Stamps</div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hidden sm:block">
            {user.email}
          </div>
          <form action={signOut}>
            <button type="submit" className="text-xs text-red-400 hover:text-red-300 transition-colors bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:border-red-900/50 cursor-pointer">
              Sign Out
            </button>
          </form>
        </div>
      </div>
      
      <div className="w-full h-full flex-1 flex flex-col justify-center mt-8">
        <StampCard initialCard={activeCard} rewards={rewards} rewardOptions={rewardOptions} />
      </div>
    </main>
  );
}
