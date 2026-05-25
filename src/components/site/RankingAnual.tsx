import { motion } from "framer-motion";
import { Target, Sparkles, Medal } from "lucide-react";
import { useDestaquesAnuais, type DestaqueEntry } from "@/hooks/use-campeonato";

function TopList({
  title,
  icon,
  items,
  metricLabel,
  colorClass,
}: {
  title: string;
  icon: React.ReactNode;
  items: DestaqueEntry[];
  metricLabel: string;
  colorClass: string;
}) {
  const ordered = [...items].sort((a, b) => b.total - a.total);
  return (
    <div className="rounded-3xl glass p-6 md:p-8 shadow-[var(--shadow-elegant)]">
      <div className="mb-5 flex items-center gap-2">
        <span className={colorClass}>{icon}</span>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      </div>
      {ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ainda não há destaques registrados neste ano.
        </p>
      ) : (
        <ol className="space-y-2">
          {ordered.slice(0, 10).map((j, i) => {
            const podium = i < 3;
            return (
              <li
                key={`${j.nome}-${i}`}
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
                {j.numero && (
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold">
                    {j.numero}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{j.nome}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xl font-black ${colorClass}`}>{j.total}</p>
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
  const { data, isLoading } = useDestaquesAnuais(ano);

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
          Acumulativo de janeiro a dezembro — não zera mês a mês.
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
              title="Artilharia"
              icon={<Target className="h-5 w-5" />}
              items={data?.artilharia ?? []}
              metricLabel="gols"
              colorClass="text-accent"
            />
            <TopList
              title="Assistências"
              icon={<Sparkles className="h-5 w-5" />}
              items={data?.assistencias ?? []}
              metricLabel="assist."
              colorClass="text-emerald-400"
            />
          </>
        )}
      </div>
    </section>
  );
}
