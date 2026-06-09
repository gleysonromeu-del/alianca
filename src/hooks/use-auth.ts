import { useEffect, useState, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // Timeout de segurança — se demorar mais de 5s, libera a tela
    const timeout = setTimeout(() => {
      if (mounted.current) setLoading(false);
    }, 5000);

    async function resolveAdmin(u: User | null): Promise<boolean> {
      if (!u) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();
      return !!data;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      clearTimeout(timeout);
      const s = data.session;
      const u = s?.user ?? null;
      if (!mounted.current) return;
      setSession(s);
      setUser(u);
      setIsAdmin(await resolveAdmin(u));
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, s) => {
      const u = s?.user ?? null;
      if (!mounted.current) return;
      setSession(s);
      setUser(u);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setIsAdmin(await resolveAdmin(u));
      }
    });

    return () => {
      clearTimeout(timeout);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, isAdmin, loading };
}