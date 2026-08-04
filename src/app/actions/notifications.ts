"use server";

import { createClient } from "@/lib/supabase/server";

export async function marquerNotificationLue(notificationId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("notifications")
    .update({ lu: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);
}

export async function marquerToutesLues(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("notifications").update({ lu: true }).eq("user_id", user.id).eq("lu", false);
}
