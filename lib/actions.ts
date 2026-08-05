"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

export async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getActiveCard() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return null;

  const { data: card } = await supabase
    .from("cards")
    .select("*, card_stamps(*)")
    .eq("user_id", user.id)
    .eq("is_completed", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return card;
}

export async function getRewards() {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return [];

  const { data: rewards } = await supabase
    .from("rewards")
    .select("*, reward_options(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return rewards;
}

export async function getRewardOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("reward_options").select("*").eq("is_active", true);
  return data || [];
}

export async function claimStamp(code: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase.rpc("claim_stamp", { p_code: code });
  
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/");
  return data;
}

export async function redeemReward(rewardId: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("rewards")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", rewardId)
    .select()
    .single();
    
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath("/");
  return { success: true, reward: data };
}

export async function redeemCodeStaff(code: string) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { success: false, error: "Staff not authenticated" };

  // Get the reward by code
  const { data: reward, error: findError } = await supabase
    .from("rewards")
    .select("*, reward_options(name)")
    .eq("redemption_code", code)
    .single();

  if (findError || !reward) {
    return { success: false, error: "Invalid redemption code." };
  }

  // Idempotency check:
  if (reward.redeemed_at) {
    return { 
      success: true, 
      alreadyUsed: true, 
      reward,
      message: `Code already used on ${new Date(reward.redeemed_at).toLocaleString()}`
    };
  }

  if (new Date() > new Date(reward.expires_at)) {
    return { success: false, error: "Redemption code has expired." };
  }

  // Redeem it
  const { data: updatedReward, error: updateError } = await supabase
    .from("rewards")
    .update({ 
      redeemed_at: new Date().toISOString(),
      redeemed_outlet: "STORE-FRONT" // Normally would take from staff context
    })
    .eq("id", reward.id)
    .select("*, reward_options(name)")
    .single();

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true, alreadyUsed: false, reward: updatedReward, message: "Reward redeemed successfully!" };
}

export async function mintReward(rewardOptionId: string, cardId: string) {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Generate a random 6-character redemption code
  const redemptionCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const { data, error } = await supabase
    .from("rewards")
    .insert({
      user_id: user.id,
      card_id: cardId,
      reward_option_id: rewardOptionId,
      redemption_code: redemptionCode,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days validity
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  
  revalidatePath("/");
  return { success: true, reward: data };
}

export async function getLiabilityReport() {
  const supabase = await createClient();
  const { data } = await supabase.from("liability_report").select("*");
  return data || [];
}
