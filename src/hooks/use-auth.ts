import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["aliancacgec2004@gmail.com"];

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveAdmin(u: User | null) {
      if (!u) {
        setIsAdmin(false);
        return;
      }

      const email = u.email?.toLowerCase() ?? "";
      if (ADMIN_EMAILS.includes(email)) {
        setIsAdmin(true);
        supabase
          .from("user_roles")
          .upsert({ user_id: u.id, role: "admin" }, { onConflict: "user_id,role" })
          .then(() => {});
        return;
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data);
    }

    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      setUser(s?.user ?? null);
      resolveAdmin(s?.user ?? null).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      resolveAdmin(s?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading };
}
