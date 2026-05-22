import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Crown, Beer, Trophy, ArrowRight } from "lucide-react";
import {
  useCampeonatoAtual,
  useTimes,
  useUltimoEncerrado,
  useCampeonatoRealtime,
  formatMes,
} from "@/hooks/use-campeonato";
import { RankingAnual } from "./RankingAnual";


export function CampeonatoMensalSection() {
  useCampeonatoRealtime();
  const { data: camp } = useCampeonatoAtual();
  const { data: times = [] } = useTimes(camp?.id);
  const { data: ultimo } = useUltimoEncerrado();
  const { data: timesUltimo = [] } = useTimes(ultimo?.id);

  const campeao = times.find((t) => t.permanece) ?? times[0];
  const pagador = (() => {
    if (!ultimo) return null;
    const t = timesUltimo.find((x) => x.id === ultimo.pagador_cerveja_time_id);
    return t ?? null;
  })();

  return (
    <section id="campeonato" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Campeonato Mensal
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            <span className="text-gradient-gold">{formatMes(camp?.mes)}</span>
          </h2>
          <p className="mt-3 text-sm text-muted-foreground md:text-base">
            4 times, uma taça, e o último paga a cerveja. 🍺
          </p>
        </motion.div>

        <div className="mt-12 grid gap-6 lg:grid-cols-5">
          {/* Campeão atual */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2 rounded-3xl glass p-8 shadow-[var(--shadow-elegant)] relative overflow-hidden"
            style={{
              boxShadow:
                "0 0 0 1px oklch(0.82 0.17 85 / 0.25), 0 25px 60px -20px oklch(0.82 0.17 85 / 0.35)",
            }}
          >
            <div className="absolute -top-20 -right-20 h-48 w-48 rounded-full bg-accent/20 blur-3xl" />
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-accent" />
              <span className="text-xs font-bold uppercase tracking-widest text-accent">
                Campeão atual
              </span>
            </div>
            {campeao ? (
              <div className="mt-6 flex items-center gap-5">
                <div
                  className="grid h-24 w-24 place-items-center rounded-2xl bg-white/10 border border-white/15 overflow-hidden"
                  style={{ background: campeao.cor ?? undefined }}
                >
                  {campeao.escudo_url ? (
                    <img src={campeao.escudo_url} alt={campeao.nome} className="h-full w-full object-cover" />
                  ) : (
                    <Trophy className="h-10 w-10 text-foreground/80" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-black tracking-tight md:text-3xl truncate">
                    {campeao.nome}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {campeao.pontos} pts · {campeao.vitorias}V {campeao.empates}E{" "}
                    {campeao.derrotas}D
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-6 text-muted-foreground">Campeonato em formação.</p>
            )}
          </motion.div>

          {/* Mini-classificação */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-3 rounded-3xl glass p-6 md:p-8 shadow-[var(--shadow-elegant)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold tracking-tight">Classificação</h3>
              <Link
                to="/campeonato"
                className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline"
              >
                Ver completo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-2 py-2 text-center">V</th>
                    <th className="px-2 py-2 text-center">E</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">SG</th>
                    <th className="px-2 py-2 text-center font-bold text-accent">P</th>
                  </tr>
                </thead>
                <tbody>
                  {times.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum time cadastrado neste mês.
                      </td>
                    </tr>
                  )}
                  {times.map((t, i) => (
                    <tr key={t.id} className="border-t border-white/5 hover:bg-white/5">
                      <td className="px-3 py-2 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ background: t.cor ?? "#FFD166" }}
                          />
                          {t.nome}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">{t.vitorias}</td>
                      <td className="px-2 py-2 text-center">{t.empates}</td>
                      <td className="px-2 py-2 text-center">{t.derrotas}</td>
                      <td className="px-2 py-2 text-center">{t.gols_pro - t.gols_contra}</td>
                      <td className="px-2 py-2 text-center font-black text-accent">{t.pontos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>

        {pagador && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-center"
          >
            <Beer className="h-5 w-5 text-amber-400" />
            <p className="text-sm md:text-base">
              <span className="font-bold text-amber-300">Pagador de cerveja</span> de{" "}
              {formatMes(ultimo?.mes)}:{" "}
              <span className="font-bold">{pagador.nome}</span>
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
}