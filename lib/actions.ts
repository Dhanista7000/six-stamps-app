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
  
  // NOTE: This should ideally be a staff-only action.
  // We'll implement staff verification in a separate flow.
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
