"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Keeps the client in sync with the Supabase session. The access token expires
 * after ~1h; when the tab has been idle/backgrounded the browser can throttle
 * the auto-refresh timer, so the token lapses. Without handling this, the next
 * navigation silently fails (the proxy can't authenticate the RSC request and
 * the click appears to do nothing — the "menu para de funcionar" symptom).
 *
 * Here we react to auth events: on a successful token refresh we revalidate the
 * server components so they pick up the new cookie, and on sign-out (including a
 * failed refresh) we send the user to /login instead of leaving a dead UI.
 */
export function AuthListener() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (!session && event !== "INITIAL_SESSION")) {
        router.replace("/login");
        return;
      }
      if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return null;
}
