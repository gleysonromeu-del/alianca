import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Shirt, Apple, Droplet, X } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const INFO_DOACAO_BENS =
  "O Aliança disponibiliza caixas que ficam junto à churrasqueira em dias de jogos, para receber as doações de alimentos e agasalhos. Depois fazemos a triagem e direcionamos para famílias, ONGs e institutos parceiros.";

const INFO_DOACAO_SANGUE =
  "O Aliança incentiva e organiza mutirões de doação de sangue em parceria com hemocentros da região. Em datas especiais, o clube se mobiliza para levar jogadores, torcedores e familiares aos postos de coleta, multiplicando vidas salvas dentro e fora de campo.";

const projects = [
  {
    icon: Shirt,
    title: "Aliança Sem Frio",
    desc: "Campanha de arrecadação de agasalhos, cobertores e roupas de inverno para idosos e crianças da nossa comunidade.",
    tag: "Campanha do Agasalho",
    accent: "#f59e0b",
    accentSoft: "rgba(245,158,11,0.18)",
    configKey: "campanha_sem_frio_foto",
    info: INFO_DOACAO_BENS,
  },
  {
    icon: Apple,
    title: "Aliança Sem Fome",
    desc: "Campanha de arrecadação de alimentos não perecíveis para apoiar famílias em situação de vulnerabilidade no Campo Grande.",
    tag: "Campanha de Alimentos",
    accent: "#22c55e",
    accentSoft: "rgba(34,197,94,0.18)",
    configKey: "campanha_sem_fome_foto",
    info: INFO_DOACAO_BENS,
  },
  {
    icon: Droplet,
    title: "Aliança Dando o Sangue",
    desc: "Campanha de incentivo à doação de sangue, em parceria com hemocentros, para ajudar a salvar vidas dentro e fora de campo.",
    tag: "Campanha de Doação de Sangue",
    accent: "#ef4444",
    accentSoft: "rgba(239,68,68,0.18)",
    configKey: "campanha_sangue_foto",
    info: INFO_DOACAO_SANGUE,
  },
];

export function SocialProjects() {
  const { data: fotoSemFrio } = useConfigPublic("campanha_sem_frio_foto");
  const { data: fotoSemFome } = useConfigPublic("campanha_sem_fome_foto");
  const { data: fotoSangue } = useConfigPublic("campanha_sangue_foto");
  const fotos: Record<string, string | null | undefined> = {
    campanha_sem_frio_foto: fotoSemFrio,
    campanha_sem_fome_foto: fotoSemFome,
    campanha_sangue_foto: fotoSangue,
  };

  const [aberto, setAberto] = useState<string | null>(null);

  return (
    <section id="social" className="relative py-24 md:py-32 overflow-hidden">
      {/* glows decorativos */}
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Aliança Solidário
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              O esporte que <span className="text-gradient-gold">transforma vidas</span>
            </h2>
          </motion.div>
          <p className="max-w-md text-muted-foreground">
            Iniciativas que levam solidariedade, acolhimento e cidadania para o coração do
            Campo Grande.
          </p>
        </div>

        <div className="mt-16 grid gap-12 sm:grid-cols-2 lg:grid-cols-3 place-items-center">
          {projects.map((p, i) => {
            const foto = fotos[p.configKey];
            return (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="group relative flex flex-col items-center text-center w-full max-w-xs"
              >
                {/* Card circular tipo "bola" */}
                <div
                  className="relative aspect-square w-full max-w-[280px] rounded-full overflow-hidden border-4 transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-[1.02]"
                  style={{
                    borderColor: p.accentSoft,
                    boxShadow: `0 0 0 8px rgba(255,255,255,0.02), 0 20px 60px -20px ${p.accentSoft}`,
                  }}
                >
                  {foto ? (
                    <img
                      src={foto}
                      alt={p.title}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: `radial-gradient(circle at 30% 30%, ${p.accentSoft}, transparent 70%), linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))` }}
                    >
                      <p.icon className="h-16 w-16" style={{ color: p.accent }} strokeWidth={1.5} />
                    </div>
                  )}

                  {/* costuras estilo bola de futebol */}
                  <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 200 200" fill="none">
                    <path d="M100 0 L100 200 M0 100 L200 100" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
                    <circle cx="100" cy="100" r="98" stroke="white" strokeWidth="1.5" strokeDasharray="6 6" />
                  </svg>

                  {/* overlay gradiente inferior */}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                  {/* tag */}
                  <span
                    className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white backdrop-blur-sm"
                    style={{ borderColor: p.accent, background: "rgba(0,0,0,0.35)" }}
                  >
                    {p.tag}
                  </span>

                  {/* título dentro do círculo */}
                  <h3 className="absolute bottom-7 left-1/2 -translate-x-1/2 w-4/5 text-lg font-black text-white drop-shadow-lg">
                    {p.title}
                  </h3>
                </div>

                {/* descrição abaixo do círculo */}
                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
                <button
                  type="button"
                  onClick={() => setAberto(aberto === p.title ? null : p.title)}
                  className="mt-4 flex items-center gap-2 text-sm font-semibold transition"
                  style={{ color: p.accent }}
                >
                  Saiba mais
                  <ArrowUpRight className={`h-4 w-4 transition-transform ${aberto === p.title ? "rotate-90" : "group-hover:-translate-y-0.5 group-hover:translate-x-0.5"}`} />
                </button>

                {/* Balão de informações */}
                <AnimatePresence>
                  {aberto === p.title && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.2 }}
                      className="relative mt-4 w-full max-w-sm rounded-2xl border bg-[#0d1435] p-5 text-left shadow-2xl"
                      style={{ borderColor: p.accentSoft }}
                    >
                      {/* seta do balão */}
                      <span
                        className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-l border-t bg-[#0d1435]"
                        style={{ borderColor: p.accentSoft }}
                      />
                      <button
                        onClick={() => setAberto(null)}
                        className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <p className="pr-6 text-sm leading-relaxed text-foreground/90">
                        {p.info}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
