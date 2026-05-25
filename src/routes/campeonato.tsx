// Página pública — classificação, partidas e Hall da Fama
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Trophy, Beer, Calendar, CheckCircle2, Clock, Shield } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useCampeonatoAtual,
  useTimes,
  usePartidas,
  useHistoricoCampeoes,
  useUltimoEncerrado,
  useCampeonatoRealtime,
  formatMes,
  saldoGols,
} from "@/hooks/use-campeonato";
import { RankingAnual } from "@/components/site/RankingAnual";

// ─── Sub-componentes ─────────────────────────────────────────────────────────

function BadgeStatus({ status }: { status: "agendada" | "finalizada" }) {
  if (status === "finalizada")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Finalizado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
      <Clock className="h-3 w-3" /> Agendado
    </span>
  );
}

function EscudoPlaceholder({ cor, nome }: { cor?: string | null; nome: string }) {
  return (
    <div
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-xs font-black"
      style={{ background: cor ?? "#FFD166", color: "#1a1a1a" }}
    >
      {nome.slice(0, 2).toUpperCase()}
    </div>
  );
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function CampeonatoPage() {
  useCampeonatoRealtime();

  const { data: camp, isLoading: loadingCamp } = useCampeonatoAtual();
  const { data: times = [], isLoading: loadingTimes } = useTimes(camp?.id);
  const { data: partidas = [], isLoading: loadingPartidas } = usePartidas(camp?.id);
  const { data: historico = [] } = useHistoricoCampeoes();
  const { data: ultimo } = useUltimoEncerrado();

  const partidasAgendadas = partidas.filter((p) => p.status === "agendada");
  const partidasFinalizadas = partidas.filter((p) => p.status === "finalizada").reverse();

  const leader = times[0];

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-white/10 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-accent">Campeonato Mensal</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-16 px-4 py-12 md:py-16">
        {/* ── Hero: mês ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            {camp?.status === "aberto" ? "Em disputa" : "Encerrado"}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">
            <span className="text-gradient-gold">{formatMes(camp?.mes)}</span>
          </h1>

          {leader && (
            <p className="mt-3 text-sm text-muted-foreground">
              Líder atual: <span className="font-bold text-foreground">{leader.nome}</span> com{" "}
              <span className="font-bold text-accent">{leader.pontos} pts</span>
            </p>
          )}
          {loadingCamp && <p className="mt-4 text-muted-foreground">Carregando campeonato...</p>}
        </motion.div>

        {/* ── Classificação ── */}
        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="mb-6 text-2xl font-black tracking-tight">Classificação</h2>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-3 py-3 text-center">J</th>
                  <th className="px-3 py-3 text-center">V</th>
                  <th className="px-3 py-3 text-center">E</th>
                  <th className="px-3 py-3 text-center">D</th>
                  <th className="px-3 py-3 text-center">GP</th>
                  <th className="px-3 py-3 text-center">GC</th>
                  <th className="px-3 py-3 text-center">SG</th>
                  <th className="px-4 py-3 text-center font-bold text-accent">Pts</th>
                </tr>
              </thead>
              <tbody>
                {loadingTimes && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      Carregando...
                    </td>
                  </tr>
                )}
                {!loadingTimes && times.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum time cadastrado neste mês.
                    </td>
                  </tr>
                )}
                {times.map((t, i) => {
                  const jogos = t.vitorias + t.empates + t.derrotas;
                  const sg = saldoGols(t);
                  const isFirst = i === 0 && times.length > 0;
                  const isLast = i === times.length - 1 && times.length > 1;
                  return (
                    <tr
                      key={t.id}
                      className={`border-t border-white/5 transition-colors hover:bg-white/5 ${
                        isFirst ? "bg-amber-500/5" : ""
                      } ${isLast ? "bg-red-500/5" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                            isFirst
                              ? "bg-amber-500/20 text-amber-400"
                              : isLast
                                ? "bg-red-500/20 text-red-400"
                                : "text-muted-foreground"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {t.escudo_url ? (
                            <img src={t.escudo_url} alt={t.nome} className="h-8 w-8 rounded-lg object-cover" />
                          ) : (
                            <span
                              className="inline-block h-3 w-3 shrink-0 rounded-full"
                              style={{ background: t.cor ?? "#FFD166" }}
                            />
                          )}
                          <span className="font-semibold">{t.nome}</span>
                          {t.permanece && (
                            <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">
                              DEF
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center text-muted-foreground">{jogos}</td>
                      <td className="px-3 py-3 text-center">{t.vitorias}</td>
                      <td className="px-3 py-3 text-center">{t.empates}</td>
                      <td className="px-3 py-3 text-center">{t.derrotas}</td>
                      <td className="px-3 py-3 text-center">{t.gols_pro}</td>
                      <td className="px-3 py-3 text-center">{t.gols_contra}</td>
                      <td
                        className={`px-3 py-3 text-center font-semibold ${sg > 0 ? "text-emerald-400" : sg < 0 ? "text-red-400" : ""}`}
                      >
                        {sg > 0 ? `+${sg}` : sg}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-accent">{t.pontos}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legenda */}
          {times.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400/60" />
                Campeão
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-400/60" />
                Paga a cerveja 🍺
              </div>
            </div>
          )}
        </motion.section>

        {/* ── Grid: Próximas + Resultados ── */}
        <div className="grid gap-10 md:grid-cols-2">
          {/* Próximas partidas */}
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="mb-5 flex items-center gap-2 text-xl font-black tracking-tight">
              <Calendar className="h-5 w-5 text-accent" />
              Próximas partidas
            </h2>

            {loadingPartidas && <p className="text-muted-foreground text-sm">Carregando...</p>}
            {!loadingPartidas && partidasAgendadas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma partida agendada.</p>
            )}

            <div className="space-y-3">
              {partidasAgendadas.map((p) => (
                <div key={p.id} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <EscudoPlaceholder cor={p.time_a?.cor} nome={p.time_a?.nome ?? "?"} />
                      <span className="truncate text-sm font-semibold">{p.time_a?.nome}</span>
                    </div>
                    <span className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-black">VS</span>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className="truncate text-sm font-semibold text-right">{p.time_b?.nome}</span>
                      <EscudoPlaceholder cor={p.time_b?.cor} nome={p.time_b?.nome ?? "?"} />
                    </div>
                  </div>
                  {p.data && (
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      {new Date(p.data).toLocaleDateString("pt-BR", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </motion.section>

          {/* Resultados */}
          <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="mb-5 flex items-center gap-2 text-xl font-black tracking-tight">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              Resultados
            </h2>

            {!loadingPartidas && partidasFinalizadas.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum jogo finalizado.</p>
            )}

            <div className="space-y-3">
              {partidasFinalizadas.map((p) => {
                const aVenceu = p.gols_a > p.gols_b;
                const bVenceu = p.gols_b > p.gols_a;
                return (
                  <div key={p.id} className="rounded-2xl border border-white/10 bg-white/3 p-4">
                    <div className="flex items-center gap-3">
                      <div className={`flex min-w-0 flex-1 items-center gap-2 ${bVenceu ? "opacity-50" : ""}`}>
                        <EscudoPlaceholder cor={p.time_a?.cor} nome={p.time_a?.nome ?? "?"} />
                        <span className="truncate text-sm font-semibold">{p.time_a?.nome}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/10 px-3 py-1.5">
                        <span className={`text-lg font-black ${aVenceu ? "text-emerald-400" : ""}`}>{p.gols_a}</span>
                        <span className="text-muted-foreground">–</span>
                        <span className={`text-lg font-black ${bVenceu ? "text-emerald-400" : ""}`}>{p.gols_b}</span>
                      </div>
                      <div
                        className={`flex min-w-0 flex-1 items-center justify-end gap-2 ${aVenceu ? "opacity-50" : ""}`}
                      >
                        <span className="truncate text-sm font-semibold text-right">{p.time_b?.nome}</span>
                        <EscudoPlaceholder cor={p.time_b?.cor} nome={p.time_b?.nome ?? "?"} />
                      </div>
                    </div>
                    {p.observacoes && (
                      <p className="mt-2 text-center text-xs text-muted-foreground italic">{p.observacoes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>
        </div>


        {/* ── Ranking Anual (acumulado Jan–Dez) ── */}
        <RankingAnual />

        {/* ── Hall da Fama ── */}
        <motion.section initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="mb-6 flex items-center gap-2 text-2xl font-black tracking-tight">
            <Trophy className="h-6 w-6 text-accent" />
            Hall da Fama
          </h2>

          {historico.length === 0 && <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>}

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {historico.map((h, i) => (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * i }}
                className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-center"
              >
                <Trophy className="mx-auto mb-3 h-8 w-8 text-accent" />
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">{formatMes(h.mes)}</p>
                <p className="mt-2 text-lg font-black">{h.nome_time_snapshot ?? "—"}</p>
                {h.jogadores_snapshot && h.jogadores_snapshot.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                   {Array.isArray(h.jogadores_snapshot) && h.jogadores_snapshot.length > 0 && (
  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
    {h.jogadores_snapshot.map((j) => j.apelido ?? j.nome).join(", ")}
  </p>
)}
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}

export const Route = createFileRoute('/campeonato')({ component: CampeonatoPage });

