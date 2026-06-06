import { useEffect, useState, useRef } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// ⚠️  ADMIN_EMAILS removido — a verificação de admin agora é feita
//     exclusivamente via tabela user_roles no banco (RLS protegida).
//     Para promover alguém a admin, rode o SQL de setup no Supabase.

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // loading=true enquanto a sessão inicial OU a verificação de admin estiver pendente
  const [loading, setLoading] = useState(true);

  // Evita atualizar estado após o componente desmontar
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    async function resolveAdmin(u: User | null): Promise<boolean> {
      if (!u) return false;

      // Consulta apenas o banco — sem comparação de e-mail no cliente
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", u.id)
        .eq("role", "admin")
        .maybeSingle();

      return !!data;
    }

    // ── Carga inicial ──────────────────────────────────────────────────────────
    supabase.auth.getSession().then(async ({ data }) => {
      const s = data.session;
      const u = s?.user ?? null;

      if (!mounted.current) return;
      setSession(s);
      setUser(u);

      const admin = await resolveAdmin(u);

      if (!mounted.current) return;
      setIsAdmin(admin);
      setLoading(false);
    });

    // ── Mudanças de estado (login / logout / refresh de token) ─────────────────
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      const u = s?.user ?? null;

      if (!mounted.current) return;
      setSession(s);
      setUser(u);

      // Mantém loading=true enquanto resolve o admin,
      // assim o useEffect do login.tsx não redireciona antes da hora
      setLoading(true);

      const admin = await resolveAdmin(u);

      if (!mounted.current) return;
      setIsAdmin(admin);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user, isAdmin, loading };
}
