import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shirt, X, HeartHandshake } from "lucide-react";

// Chave usada para não reexibir o pop-up a cada navegação dentro da mesma visita.
const SESSION_KEY = "agasalho_modal_visto";

function useConfigPublic(chave: string) {
  return useQuery({
    queryKey: ["config-public", chave],
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes").select("valor").eq("chave", chave).maybeSingle();
      return data?.valor ?? null;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function CampanhaAgasalhoModal() {
  const { data: ativa } = useConfigPublic("campanha_agasalho_ativa");
  const { data: titulo } = useConfigPublic("campanha_agasalho_titulo");
  const { data: subtitulo } = useConfigPublic("campanha_agasalho_subtitulo");

  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (ativa !== "true") return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const t = setTimeout(() => setAberto(true), 900);
    return () => clearTimeout(t);
  }, [ativa]);

  function fechar() {
    setAberto(false);
    sessionStorage.setItem(SESSION_KEY, "1");
  }

  function irParaCampanha() {
    fechar();
    document.getElementById("social")?.scrollIntoView({ behavior: "smooth" });
  }

  if (ativa !== "true") return null;

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={fechar}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-amber-400/30 bg-[#0b1230] shadow-2xl"
          >
            {/* topo com gradiente "friagem" */}
            <div className="relative h-28 bg-gradient-to-br from-amber-500/25 via-sky-500/15 to-transparent">
              <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-6 -left-6 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl" />
              <button
                onClick={fechar}
                className="absolute right-3 top-3 rounded-full bg-black/30 p-1.5 text-white/80 hover:bg-black/50 hover:text-white transition"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute -bottom-7 left-6 grid h-14 w-14 place-items-center rounded-2xl bg-amber-400 text-[#0b1230] shadow-lg">
                <Shirt className="h-7 w-7" />
              </div>
            </div>

            <div className="px-6 pb-6 pt-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Aliança Solidário
              </p>
              <h2 className="mt-2 text-xl font-black leading-tight text-white md:text-2xl">
                {titulo || "CAMPANHA DO AGASALHO 2026"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                {subtitulo || "Aliança aquecendo quem precisa!"}
              </p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={irParaCampanha}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-[#0b1230] transition hover:bg-amber-300"
                >
                  <HeartHandshake className="h-4 w-4" />
                  Quero ajudar
                </button>
                <button
                  onClick={fechar}
                  className="flex-1 rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/5"
                >
                  Agora não
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
