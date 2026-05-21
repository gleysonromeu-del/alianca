import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Beer, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { WatermarkBackground } from "@/components/site/WatermarkBackground";
import {
  useCampeonatoAtual,
  useTimes,
  usePartidas,
  useTimeJogadores,
  useJogadores,
  useHistorico,
  useCampeonatoRealtime,
  formatMes,
} from "@/hooks/use-campeonato";

export const Route = createFileRoute("/campeonato")({
  component: CampeonatoPage,
  head: () => ({
    meta: [
      { title: "Campeonato Mensal — Aliança do Campo Grande" },
      {
        name: "description",
        content:
          "Acompanhe a classificação, partidas, campeões e estatísticas do Campeonato Mensal do Aliança do Campo Grande.",
      },
      { property: "og:title", content: "Campeonato Mensal — Aliança" },
      {
        property: "og:description",
        content: "Classificação, partidas e história dos campeões mensais.",
      },
    ],
  }),
});

function CampeonatoPage() {
  useCampeonatoRealtime();
  const { data: camp } = useCampeonatoAtual();
  const { data: times = [] } = useTimes(camp?.id);
  const { data: partidas = [] } = usePartidas(camp?.id);
  const { data: tjs = [] } = useTimeJogadores(camp?.id);
  const { data: jogadores = [] } = useJogadores();
  const { data: historico = [] } = useHistorico();

  const jogadorById = new Map(jogadores.map((j) => [j.id, j]));
  const timeById = new Map(times.map((t) => [t.id, t]));
  const finalizadas = partidas.filter((p) => p.status === "finalizada");
  const agendadas = partidas.filter((p) => p.status === "agendada");

  return (
    <div className="relative min-h-screen">
      <WatermarkBackground />
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="mt-4 text-4xl md:text-6xl font-black tracking-tight">
            Campeonato <span className="text-gradient-gold">{formatMes(camp?.mes)}</span>
          </h1>

          {/* Classificação completa */}
          <section className="mt-10 rounded-3xl glass p-6 md:p-8 shadow-[var(--shadow-elegant)]">
            <h2 className="text-xl font-bold">Classificação</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-white/5 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-2 py-2 text-center">J</th>
                    <th className="px-2 py-2 text-center">V</th>
                    <th className="px-2 py-2 text-center">E</th>
                    <th className="px-2 py-2 text-center">D</th>
                    <th className="px-2 py-2 text-center">GP</th>
                    <th className="px-2 py-2 text-center">GC</th>
                    <th className="px-2 py-2 text-center">SG</th>
                    <th className="px-2 py-2 text-center font-bold text-accent">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {times.map((t, i) => (
                    <tr key={t.id} className="border-t border-white/5">
                      <td className="px-3 py-2 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2 font-semibold">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full"
                            style={{ background: t.cor ?? "#FFD166" }}
                          />
                          {t.nome}
                          {t.permanece && <Crown className="h-3.5 w-3.5 text-accent" />}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {t.vitorias + t.empates + t.derrotas}
                      </td>
                      <td className="px-2 py-2 text-center">{t.vitorias}</td>
                      <td className="px-2 py-2 text-center">{t.empates}</td>
                      <td className="px-2 py-2 text-center">{t.derrotas}</td>
                      <td className="px-2 py-2 text-center">{t.gols_pro}</td>
                      <td className="px-2 py-2 text-center">{t.gols_contra}</td>
                      <td className="px-2 py-2 text-center">{t.gols_pro - t.gols_contra}</td>
                      <td className="px-2 py-2 text-center font-black text-accent">
                        {t.pontos}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Times e elenco */}
          <section className="mt-10 grid gap-6 md:grid-cols-2">
            {times.map((t) => {
              const elenco = tjs
                .filter((x) => x.time_id === t.id)
                .map((x) => jogadorById.get(x.jogador_id))
                .filter(Boolean);
              return (
                <div
                  key={t.id}
                  className="rounded-3xl glass p-6 shadow-[var(--shadow-elegant)]"
                  style={{ borderTop: `4px solid ${t.cor ?? "#FFD166"}` }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="grid h-14 w-14 place-items-center rounded-xl bg-white/10 overflow-hidden"
                      style={{ background: t.cor ?? undefined }}
                    >
                      {t.escudo_url && (
                        <img src={t.escudo_url} alt={t.nome} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div>
                      <p className="text-lg font-bold">{t.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        Capitão:{" "}
                        {t.capitao_id
                          ? jogadorById.get(t.capitao_id)?.apelido ?? "—"
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {elenco.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem jogadores ainda.</p>
                    )}
                    {elenco.map((j) => (
                      <span
                        key={j!.id}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium"
                      >
                        {j!.apelido}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Partidas */}
          <section className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl glass p-6">
              <h3 className="text-lg font-bold">Próximas partidas</h3>
              <ul className="mt-4 space-y-3">
                {agendadas.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhuma partida agendada.</li>
                )}
                {agendadas.map((p) => (
                  <li key={p.id} className="rounded-xl border border-white/10 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{timeById.get(p.time_a_id)?.nome}</span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="font-semibold">{timeById.get(p.time_b_id)?.nome}</span>
                    </div>
                    {p.data && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(p.data).toLocaleString("pt-BR")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl glass p-6">
              <h3 className="text-lg font-bold">Resultados</h3>
              <ul className="mt-4 space-y-3">
                {finalizadas.length === 0 && (
                  <li className="text-sm text-muted-foreground">Nenhum jogo finalizado.</li>
                )}
                {finalizadas.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-xl border border-white/10 p-3 text-sm flex items-center justify-between"
                  >
                    <span className="font-semibold">{timeById.get(p.time_a_id)?.nome}</span>
                    <span className="font-black text-lg text-accent">
                      {p.gols_a} × {p.gols_b}
                    </span>
                    <span className="font-semibold">{timeById.get(p.time_b_id)?.nome}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Histórico */}
          <section className="mt-10">
            <h2 className="text-xl font-bold">Hall da Fama</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {historico.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem histórico ainda.</p>
              )}
              {historico.map((h) => (
                <div
                  key={h.id}
                  className={`rounded-2xl border p-4 ${
                    h.tipo === "campeao"
                      ? "border-accent/40 bg-accent/5"
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {h.tipo === "campeao" ? (
                      <Crown className="h-4 w-4 text-accent" />
                    ) : (
                      <Beer className="h-4 w-4 text-amber-400" />
                    )}
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {h.tipo === "campeao" ? "Campeão" : "Pagou a cerveja"}
                    </span>
                  </div>
                  <p className="mt-2 text-lg font-bold">{h.nome_time_snapshot}</p>
                  <p className="text-xs text-muted-foreground">{formatMes(h.mes)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}