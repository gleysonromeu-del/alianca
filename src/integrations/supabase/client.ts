import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://sazstwawpmvgcnhechwl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mQECq1BgrO3ROIOIdhP0FQ_rQL786xB";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const POSICOES = [
  "Goleiro",
  "Zagueiro",
  "Lateral Direito",
  "Lateral Esquerdo",
  "Volante",
  "Meia",
  "Atacante",
] as const;
