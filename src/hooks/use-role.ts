import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAILS = ["aliancacgec2004@gmail.com"];

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
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email?.toLowerCase();
      const isHardcodedAdmin = !!email && ADMIN_EMAILS.includes(email);

      if (isHardcodedAdmin) {
        // tenta persistir no banco (pode falhar por RLS — não bloqueia)
        await supabase
          .from("user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      }

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!data || isHardcodedAdmin);
      setLoading(false);
    })();
  }, [userId]);

  return { isAdmin, loading };
}
