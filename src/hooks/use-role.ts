import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// ⚠️  ADMIN_EMAILS removido — a verificação de admin agora é feita
//     exclusivamente via tabela user_roles no banco (RLS protegida).
//     Para promover alguém a admin, rode o SQL de setup no Supabase.

export function useIsAdmin(userId: string | undefined) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    (async () => {
      // Consulta apenas o banco — sem comparação de e-mail no cliente
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!data);
      setLoading(false);
    })();
  }, [userId]);

  return { isAdmin, loading };
}
