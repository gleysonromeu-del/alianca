import { motion } from "framer-motion";
import { Target, Sparkles, Medal } from "lucide-react";
import { useRankingAnual } from "@/hooks/use-campeonato";

function TopList({
  title,
  icon,
  items,
  metricKey,
  metricLabel,
  colorClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: Array<{
    jogador_id: string;
    apelido: string;
    foto_url: string | null;
    gols: number;
    assistencias: number;
    jogos: number;
  }>;
  metricKey: "gols" | "assistencias";
  metricLabel: string;
  colorClass: string;
}) {
  return (
    <div className="rounded-3xl glass p-6 md:p-8 shadow-[var(--shadow-elegant)]">
      <div className="mb-5 flex items-center gap-2">
        <span className={colorClass}>{icon}</span>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há estatísticas registradas neste ano.
        </p>
      ) : (
        <ol className="space-y-2">
          {items.slice(0, 10).map((j, i) => {
            const podium = i < 3;
            return (
              <li
                key={j.jogador_id}
                className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 hover:bg-white/5 transition-colors"
              >
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                    i === 0
                      ? "bg-amber-500/20 text-amber-300"
                      : i === 1
                        ? "bg-zinc-300/20 text-zinc-200"
                        : i === 2
                          ? "bg-amber-700/30 text-amber-500"
                          : "bg-white/5 text-muted-foreground"
                  }`}
                >
                  {podium ? <Medal className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {j.foto_url ? (
                  <img
                    src={j.foto_url}
                    alt={j.apelido}
                    className="h-9 w-9 shrink-0 rounded-full object-cover border border-white/10"
                  />
                ) : (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
                    {j.apelido.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{j.apelido}</p>
                  <p className="text-xs text-muted-foreground">{j.jogos} jogos</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black ${colorClass}`}>{j[metricKey]}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {metricLabel}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export function RankingAnual({ ano = new Date().getFullYear() }: { ano?: number }) {
  const { data: ranking = [], isLoading } = useRankingAnual(ano);

  const artilheiros = [...ranking].sort((a, b) => b.gols - a.gols || b.assistencias - a.assistencias);
  const garcons = [...ranking].sort((a, b) => b.assistencias - a.assistencias || b.gols - a.gols);

  return (
    <section className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
          Acumulado de {ano}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          Artilharia & Assistências
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Soma de todos os campeonatos mensais — janeiro a dezembro.
        </p>
      </motion.div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {isLoading ? (
          <>
            <div className="h-64 rounded-3xl glass animate-pulse" />
            <div className="h-64 rounded-3xl glass animate-pulse" />
          </>
        ) : (
          <>
            <TopList
              title="Artilheiros"
              icon={<Target className="h-5 w-5" />}
              items={artilheiros}
              metricKey="gols"
              metricLabel="gols"
              colorClass="text-accent"
            />
            <TopList
              title="Garçons"
              icon={<Sparkles className="h-5 w-5" />}
              items={garcons}
              metricKey="assistencias"
              metricLabel="assist."
              colorClass="text-emerald-400"
            />
          </>
        )}
      </div>
    </section>
  );
}
