import { supabase } from "@/lib/supabase";

export async function checkRateLimit(
  sessionId: string,
  action: "post" | "comment" | "react" | "vote",
  maxPerHour: number
) {
  const windowStart = Math.floor(Date.now() / (1000 * 60 * 60));

  // try to insert a fresh row for this window
  const { data: existing } = await supabase
    .from("rate_limits")
    .select("count")
    .eq("session_id", sessionId)
    .eq("action", action)
    .eq("window_start", windowStart)
    .single();

  if (existing) {
    if (existing.count >= maxPerHour) {
      throw new Error("slow down. ur posting too fast. take a walk.");
    }
    // increment
    await supabase
      .from("rate_limits")
      .update({ count: existing.count + 1 })
      .eq("session_id", sessionId)
      .eq("action", action)
      .eq("window_start", windowStart);
  } else {
    // first action this hour
    await supabase
      .from("rate_limits")
      .insert({ session_id: sessionId, action, window_start: windowStart, count: 1 });
  }
}
