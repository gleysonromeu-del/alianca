import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, BarChart3, Crown, ArrowRight, X, ChevronRight } from "lucide-react";

interface CampeonatoMensal {
  id: string;
  mes: string;
  status: string;
  campeao_time_id: string | null;
  campeao_nome: string | null;
}

interface Time {
  id: string;
  nome: string;
  cor: string;
  escudo_url: string | null;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  cartoes_amarelos: number;
  cartoes_vermelhos: number;
}

interface EstatisticaJogador {
  jogador_id: string;
  nome: string;
  apelido: string;
  foto_url: string | null;
  time_nome: string;
  time_cor: string;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
  partidas: number;
}

interface Partida {
  id: string;
  data: string | null;
  gols_a: number;
  gols_b: number;
  status: string;
  time_a: { nome: string; cor: string };
  time_b: { nome: string; cor: string };
}

const TeamDot = ({ cor, size = 10 }: { cor: string; size?: number }) => (
  <span
    style={{
      display: "inline-block",
      width: size,
      height: size,
      borderRadius: "50%",
      backgroundColor: cor || "#888",
      flexShrink: 0,
      border: "1px solid rgba(255,255,255,0.18)",
    }}
  />
);

export function CampeonatoMensalSection() {
  const [campeonato, setCampeonato] = useState<CampeonatoMensal | null>(null);
  const [times, setTimes] = useState<Time[]>([]);
  const [jogadores, setJogadores] = useState<EstatisticaJogador[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [aba, setAba] = useState<"artilharia" | "assistencias" | "partidas" | "cartoes">("artilharia");
  const [nomeCampeonato, setNomeCampeonato] = useState<string | null>(null);
  const [fotoGalo, setFotoGalo] = useState<string | null>(null);

  useEffect(() => {
    fetchCampeonato();
  }, []);

  async function fetchCampeonato() {
    setLoading(true);
    try {
      const { data: camp } = await supabase
        .from("campeonato_mensal")
        .select("id, mes, status, campeao_time_id, campeao_nome")
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!camp) return;
      setCampeonato(camp);

      // Busca nome do campeonato e foto do Galo nas configuracoes
      const { data: configNome } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", `campeonato_nome_${camp.id}`)
        .maybeSingle();
      if (configNome?.valor) setNomeCampeonato(configNome.valor);

      const { data: configGalo } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", "foto_galo_atual")
        .maybeSingle();
      if (configGalo?.valor) setFotoGalo(configGalo.valor);

      const { data: timesData } = await supabase
        .from("times")
        .select("id, nome, cor, escudo_url, pontos, vitorias, empates, derrotas, gols_pro, gols_contra, cartoes_amarelos, cartoes_vermelhos")
        .eq("campeonato_id", camp.id)
        .order("pontos", { ascending: false })
        .order("vitorias", { ascending: false });

      if (timesData) setTimes(timesData);

      const { data: partidasData } = await supabase
        .from("partidas")
        .select(`id, data, gols_a, gols_b, status,
           time_a:times!partidas_time_a_id_fkey(nome, cor),
           time_b:times!partidas_time_b_id_fkey(nome, cor)`)
        .eq("campeonato_id", camp.id)
        .eq("status", "finalizada")
        .order("data", { ascending: false });

      if (partidasData) setPartidas(partidasData as any);

      // ── Estatísticas ACUMULADAS DO ANO (jan-dez) ──────────────────────────────
      // Busca todos os campeonatos do ano atual
      const anoAtual = new Date().getFullYear();
      const inicioAno = `${anoAtual}-01-01`;
      const fimAno = `${anoAtual}-12-31`;

      const { data: campsAno } = await supabase
        .from("campeonato_mensal")
        .select("id")
        .gte("mes", inicioAno)
        .lte("mes", fimAno);

      const campIds = (campsAno ?? []).map((c: any) => c.id);

      // Partidas finalizadas do ano todo
      let todasPartidasIds: string[] = [];
      if (campIds.length > 0) {
        const { data: todasPartidas } = await supabase
          .from("partidas")
          .select("id")
          .in("campeonato_id", campIds)
          .eq("status", "finalizada");
        todasPartidasIds = (todasPartidas ?? []).map((p: any) => p.id);
      }

      // Estatísticas acumuladas do ano
      if (todasPartidasIds.length > 0) {
        const { data: estatData } = await supabase
          .from("estatisticas_partida")
          .select("jogador_id, time_id, gols, assistencias, amarelos, vermelhos, presente")
          .in("partida_id", todasPartidasIds)
          .eq("presente", true);

        if (estatData && estatData.length > 0) {
          const jogIds = [...new Set(estatData.map((e: any) => e.jogador_id))];
          const timeIds = [...new Set(estatData.map((e: any) => e.time_id))];

          const { data: jogData } = await supabase
            .from("jogadores")
            .select("id, nome_completo, apelido, foto_url")
            .in("id", jogIds);

          const { data: timesEstat } = await supabase
            .from("times")
            .select("id, nome, cor")
            .in("id", timeIds);

          const jogMap = Object.fromEntries((jogData ?? []).map((j: any) => [j.id, j]));
          const timeMap = Object.fromEntries((timesEstat ?? []).map((t: any) => [t.id, t]));

          const map: Record<string, EstatisticaJogador> = {};
          for (const row of estatData as any[]) {
            const jid = row.jogador_id;
            const jog = jogMap[jid];
            const time = timeMap[row.time_id];
            if (!jog) continue;
            if (!map[jid]) {
              map[jid] = {
                jogador_id: jid,
                nome: jog.nome_completo ?? "",
                apelido: jog.apelido ?? "",
                foto_url: jog.foto_url ?? null,
                time_nome: time?.nome ?? "",
                time_cor: time?.cor ?? "#888",
                gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0, partidas: 0,
              };
            }
            map[jid].gols += row.gols ?? 0;
            map[jid].assistencias += row.assistencias ?? 0;
            map[jid].amarelos += row.amarelos ?? 0;
            map[jid].vermelhos += row.vermelhos ?? 0;
            map[jid].partidas += 1;
          }
          setJogadores(Object.values(map));
        }
      }

      // Partidas do mês atual para exibir na aba "Partidas"
      const partidaIds = (partidasData || []).map((p: any) => p.id);
      void partidaIds; // já usado acima via todasPartidasIds
    } finally {
      setLoading(false);
    }
  }

  const campeaoTime = times.find((t) => t.id === campeonato?.campeao_time_id) ?? times[0] ?? null;
  const artilheiros = [...jogadores].sort((a, b) => b.gols - a.gols || b.assistencias - a.assistencias);
  const assistentes = [...jogadores].sort((a, b) => b.assistencias - a.assistencias || b.gols - a.gols);
  const cartoeiros = [...jogadores].filter((j) => j.amarelos + j.vermelhos > 0).sort((a, b) => (b.vermelhos * 3 + b.amarelos) - (a.vermelhos * 3 + a.amarelos));
  const maxGols = Math.max(...jogadores.map((j) => j.gols), 1);
  const maxAssist = Math.max(...jogadores.map((j) => j.assistencias), 1);

  const mesLabel = campeonato
    ? new Date(campeonato.mes + "T12:00:00").toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "";
  const mesCapital = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  const S = {
    section: { background: "linear-gradient(180deg,#08102a 0%,#0b1536 60%,#08102a 100%)", padding: "80px 0", fontFamily: "'Segoe UI',system-ui,sans-serif", position: "relative" as const, overflow: "hidden" } as React.CSSProperties,
    container: { maxWidth: 1160, margin: "0 auto", padding: "0 24px" },
    header: { textAlign: "center" as const, marginBottom: 52 },
    pre: { fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#60a5fa", marginBottom: 10 },
    h2: { fontSize: "clamp(30px,5vw,50px)", fontWeight: 900, color: "#fff", margin: "0 0 8px", lineHeight: 1.1 },
    hl: { background: "linear-gradient(90deg,#3b82f6,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" },
    sub: { fontSize: 15, color: "rgba(255,255,255,0.4)", margin: 0 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: 18, marginBottom: 18 } as React.CSSProperties,
    card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "26px 22px" },
    cardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
    cardTitle: { fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 },
    verBtn: { fontSize: 13, color: "#f59e0b", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 600, padding: 0 },
    champLabel: { fontSize: 11, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" as const, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6, marginBottom: 18 },
    champRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 20 },
    champIcon: (cor: string) => ({ width: 60, height: 60, borderRadius: 13, background: cor || "#dc2626", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),
    champNome: { fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 3px" },
    champSub: { fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 },
    statsRow: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
    statBox: { background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "11px 0", textAlign: "center" as const },
    statVal: (accent?: boolean) => ({ fontSize: 21, fontWeight: 800, color: accent ? "#f59e0b" : "#fff", lineHeight: 1 }),
    statLbl: { fontSize: 10, color: "rgba(255,255,255,0.38)", marginTop: 4, textTransform: "uppercase" as const, letterSpacing: "0.08em" },
    th: { fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.32)", textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "0 7px 11px", textAlign: "center" as const, borderBottom: "1px solid rgba(255,255,255,0.07)" },
    td: { padding: "11px 7px", fontSize: 13, color: "rgba(255,255,255,0.72)", textAlign: "center" as const, borderBottom: "1px solid rgba(255,255,255,0.04)" },
    pos: { fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)" },
    tNome: { fontSize: 13, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 7 },
    pts: { fontSize: 14, fontWeight: 800, color: "#f59e0b" },
    cta: { background: "linear-gradient(135deg,rgba(59,130,246,0.09) 0%,rgba(99,102,241,0.07) 100%)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 16, padding: "26px 30px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20 } as React.CSSProperties,
    ctaTitle: { fontSize: 19, fontWeight: 800, color: "#fff", margin: "0 0 5px" },
    ctaDesc: { fontSize: 13, color: "rgba(255,255,255,0.45)", margin: 0 },
    ctaBtn: { background: "#3b82f6", color: "#fff", border: "none", borderRadius: 10, padding: "13px 26px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 7, flexShrink: 0 },
    overlay: { position: "fixed" as const, inset: 0, background: "rgba(4,9,28,0.93)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, backdropFilter: "blur(5px)" },
    modal: { background: "#0d1435", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, width: "100%", maxWidth: 880, maxHeight: "90vh", overflowY: "auto" as const, padding: "30px 28px" },
    mHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 26 },
    mTitle: { fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 },
    mSub: { fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "3px 0 0" },
    closeBtn: { background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" },
    tabs: { display: "flex", gap: 7, marginBottom: 22, flexWrap: "wrap" as const },
    tab: (on: boolean) => ({ padding: "7px 16px", borderRadius: 8, border: `1px solid ${on ? "#3b82f6" : "rgba(255,255,255,0.09)"}`, background: on ? "rgba(59,130,246,0.14)" : "transparent", color: on ? "#60a5fa" : "rgba(255,255,255,0.48)", fontSize: 13, fontWeight: 600, cursor: "pointer" }),
    etbl: { width: "100%", borderCollapse: "collapse" as const },
    eth: (left?: boolean) => ({ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase" as const, letterSpacing: "0.08em", padding: "0 12px 11px", textAlign: (left ? "left" : "center") as any, borderBottom: "1px solid rgba(255,255,255,0.07)" }),
    etd: (left?: boolean) => ({ padding: "12px 12px", fontSize: 13, color: "rgba(255,255,255,0.78)", textAlign: (left ? "left" : "center") as any, borderBottom: "1px solid rgba(255,255,255,0.04)" }),
    rank: (i: number) => ({ fontSize: 13, fontWeight: 800, color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#c2855a" : "rgba(255,255,255,0.25)" }),
    barTrack: { width: 100, height: 4, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden", display: "inline-block" as const },
    bar: (pct: number, cor: string) => ({ display: "inline-block", height: 4, width: `${Math.max(4, pct * 100)}%`, background: cor, borderRadius: 2 }),
    pCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: "14px 18px", display: "flex", alignItems: "center", gap: 16, marginBottom: 8 } as React.CSSProperties,
    pRound: { fontSize: 11, color: "rgba(255,255,255,0.3)", minWidth: 64, lineHeight: 1.5 },
    pScore: { background: "rgba(255,255,255,0.08)", borderRadius: 8, padding: "5px 14px", display: "flex", gap: 9, alignItems: "center", flexShrink: 0 },
    pGol: (w: boolean) => ({ fontSize: 19, fontWeight: 900, color: w ? "#f59e0b" : "#fff", lineHeight: 1 }),
    pTime: { fontSize: 13, fontWeight: 600, color: "#fff", display: "flex", alignItems: "center", gap: 7 },
  };

  return (
    <section style={S.section} id="campeonato">
      {/* glows decorativos */}
      <div style={{ position: "absolute", top: "8%", left: "4%", width: 380, height: 380, borderRadius: "50%", background: "radial-gradient(circle,rgba(59,130,246,0.07) 0%,transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "8%", right: "4%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(245,158,11,0.05) 0%,transparent 70%)", pointerEvents: "none" }} />

      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <p style={S.pre}>⚽ Campeonato do Mês</p>
          <h2 style={S.h2}><span style={S.hl}>{nomeCampeonato || mesCapital || "Campeonato"}</span></h2>
          {nomeCampeonato && <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: "4px 0 8px" }}>{mesCapital}</p>}
          <p style={S.sub}>4 times, uma taça, e o último paga a cerveja 🍺</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: "60px 0", fontSize: 14 }}>Carregando...</div>
        ) : (
          <>
            {/* Card do Galo */}
            {fotoGalo && (
              <div style={{ background: "linear-gradient(135deg,rgba(245,158,11,0.08) 0%,rgba(245,158,11,0.04) 100%)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 16, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, marginBottom: 18 }}>
                <img src={fotoGalo} alt="O Galo" style={{ width: 72, height: 72, borderRadius: 12, objectFit: "cover", border: "2px solid rgba(245,158,11,0.3)", flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "#f59e0b", margin: "0 0 4px" }}>🐔 O Galo — Campeão Defensor</p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>O atual campeão a ser destronado este mês.</p>
                </div>
              </div>
            )}

            {/* Grid: Campeão + Classificação */}
            <div style={S.grid}>
              {/* O Galo — Campeão Defensor */}
              <div style={{ ...S.card, display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 16, textAlign: "center" as const, position: "relative" as const, overflow: "hidden" }}>
                {/* brilho dourado de fundo */}
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%,rgba(245,158,11,0.12) 0%,transparent 70%)", pointerEvents: "none" }} />

                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" as const, color: "#f59e0b", display: "flex", alignItems: "center", gap: 6 }}>
                  <Crown size={12} /> O Galo
                </div>

                {fotoGalo ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={fotoGalo}
                      alt="O Galo"
                      style={{ width: 120, height: 120, borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(245,158,11,0.5)", boxShadow: "0 0 32px rgba(245,158,11,0.25)" }}
                    />
                    {/* coroa dourada */}
                    <div style={{ position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)", fontSize: 22 }}>👑</div>
                  </div>
                ) : (
                  <div style={{ width: 120, height: 120, borderRadius: "50%", background: "rgba(245,158,11,0.08)", border: "2px dashed rgba(245,158,11,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>
                    🐔
                  </div>
                )}

                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", margin: "0 0 4px" }}>
                    {fotoGalo ? "Campeão Defensor" : "Aguardando foto"}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>
                    {fotoGalo ? "O Galo a ser destronado" : "Admin deve cadastrar a foto do Galo"}
                  </p>
                </div>
              </div>

              {/* Classificação */}
              <div style={S.card}>
                <div style={S.cardHead}>
                  <p style={S.cardTitle}>Classificação</p>
                  <button style={S.verBtn} onClick={() => { setShowModal(true); setAba("artilharia"); }}>
                    Ver estatísticas <ChevronRight size={13} />
                  </button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...S.th, textAlign: "left", width: 28 }}>#</th>
                      <th style={{ ...S.th, textAlign: "left" }}>Time</th>
                      <th style={S.th}>V</th><th style={S.th}>E</th><th style={S.th}>D</th>
                      <th style={S.th}>SG</th><th style={S.th}>P</th>
                    </tr>
                  </thead>
                  <tbody>
                    {times.map((t, i) => (
                      <tr key={t.id}>
                        <td style={{ ...S.td, textAlign: "left" }}><span style={S.pos}>{i + 1}</span></td>
                        <td style={{ ...S.td, textAlign: "left" }}>
                          <span style={S.tNome}>
                            {t.escudo_url
                              ? <img src={t.escudo_url} alt={t.nome} style={{ width: 20, height: 20, borderRadius: 4, objectFit: "cover", flexShrink: 0 }} />
                              : <TeamDot cor={t.cor} />
                            }
                            {t.nome}
                          </span>
                        </td>
                        <td style={S.td}>{t.vitorias}</td>
                        <td style={S.td}>{t.empates}</td>
                        <td style={S.td}>{t.derrotas}</td>
                        <td style={S.td}>{t.gols_pro - t.gols_contra > 0 ? "+" : ""}{t.gols_pro - t.gols_contra}</td>
                        <td style={S.td}><span style={S.pts}>{t.pontos}</span></td>
                      </tr>
                    ))}
                    {times.length === 0 && (
                      <tr><td colSpan={7} style={{ ...S.td, color: "rgba(255,255,255,0.25)", paddingTop: 24 }}>Nenhum time cadastrado ainda.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CTA Estatísticas */}
            <div style={S.cta}>
              <div>
                <p style={S.ctaTitle}>
                  <BarChart3 size={17} style={{ display: "inline", verticalAlign: "-3px", marginRight: 7, color: "#60a5fa" }} />
                  Estatísticas do campeonato
                </p>
                <p style={S.ctaDesc}>Artilheiros, assistências, cartões e resultados de todas as rodadas.</p>
              </div>
              <button style={S.ctaBtn} onClick={() => setShowModal(true)}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#3b82f6")}>
                Ver estatísticas <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div style={S.overlay} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={S.modal}>
            <div style={S.mHead}>
              <div>
                <p style={S.mTitle}>Estatísticas — Acumulado do Ano</p>
                <p style={S.mSub}>Gols e assistências acumulados de jan a dez · {mesCapital} (partidas do mês)</p>
              </div>
              <button style={S.closeBtn} onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <div style={S.tabs}>
              {[{ id: "artilharia", label: "⚽ Artilharia" }, { id: "assistencias", label: "🎯 Assistências" }, { id: "partidas", label: "📅 Partidas" }, { id: "cartoes", label: "🟨 Cartões" }].map((t) => (
                <button key={t.id} style={S.tab(aba === t.id)} onClick={() => setAba(t.id as any)}>{t.label}</button>
              ))}
            </div>

            {/* Artilharia */}
            {aba === "artilharia" && (
              <table style={S.etbl}>
                <thead><tr>
                  <th style={S.eth()}>#</th>
                  <th style={S.eth(true)}>Jogador</th>
                  <th style={S.eth(true)}>Time</th>
                  <th style={S.eth()}>Jogos</th>
                  <th style={S.eth()}>Gols</th>
                  <th style={S.eth(true)}>Barra</th>
                </tr></thead>
                <tbody>
                  {artilheiros.filter((j) => j.gols > 0).map((j, i) => (
                    <tr key={j.jogador_id}>
                      <td style={S.etd()}><span style={S.rank(i)}>{i + 1}º</span></td>
                      <td style={{ ...S.etd(true), fontWeight: 600, color: "#fff" }}>{j.apelido || j.nome}</td>
                      <td style={S.etd(true)}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><TeamDot cor={j.time_cor} size={8} /><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{j.time_nome}</span></span></td>
                      <td style={S.etd()}>{j.partidas}</td>
                      <td style={{ ...S.etd(), fontWeight: 800, color: "#f59e0b", fontSize: 15 }}>{j.gols}</td>
                      <td style={S.etd(true)}><div style={S.barTrack}><div style={S.bar(j.gols / maxGols, "#f59e0b")} /></div></td>
                    </tr>
                  ))}
                  {artilheiros.filter((j) => j.gols > 0).length === 0 && (
                    <tr><td colSpan={6} style={{ ...S.etd(), color: "rgba(255,255,255,0.25)", paddingTop: 24 }}>Nenhum gol registrado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Assistências */}
            {aba === "assistencias" && (
              <table style={S.etbl}>
                <thead><tr>
                  <th style={S.eth()}>#</th>
                  <th style={S.eth(true)}>Jogador</th>
                  <th style={S.eth(true)}>Time</th>
                  <th style={S.eth()}>Jogos</th>
                  <th style={S.eth()}>Assist.</th>
                  <th style={S.eth(true)}>Barra</th>
                </tr></thead>
                <tbody>
                  {assistentes.filter((j) => j.assistencias > 0).map((j, i) => (
                    <tr key={j.jogador_id}>
                      <td style={S.etd()}><span style={S.rank(i)}>{i + 1}º</span></td>
                      <td style={{ ...S.etd(true), fontWeight: 600, color: "#fff" }}>{j.apelido || j.nome}</td>
                      <td style={S.etd(true)}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><TeamDot cor={j.time_cor} size={8} /><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{j.time_nome}</span></span></td>
                      <td style={S.etd()}>{j.partidas}</td>
                      <td style={{ ...S.etd(), fontWeight: 800, color: "#60a5fa", fontSize: 15 }}>{j.assistencias}</td>
                      <td style={S.etd(true)}><div style={S.barTrack}><div style={S.bar(j.assistencias / maxAssist, "#60a5fa")} /></div></td>
                    </tr>
                  ))}
                  {assistentes.filter((j) => j.assistencias > 0).length === 0 && (
                    <tr><td colSpan={6} style={{ ...S.etd(), color: "rgba(255,255,255,0.25)", paddingTop: 24 }}>Nenhuma assistência registrada ainda.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {/* Partidas */}
            {aba === "partidas" && (
              <div>
                {partidas.length === 0 && <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 13, textAlign: "center", paddingTop: 24 }}>Nenhuma partida encerrada ainda.</p>}
                {partidas.map((p) => {
                  const aW = p.gols_a > p.gols_b, bW = p.gols_b > p.gols_a;
                  const dt = p.data ? new Date(p.data).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—";
                  return (
                    <div key={p.id} style={S.pCard}>
                      <div style={S.pRound}>{dt}</div>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <span style={S.pTime}><TeamDot cor={(p.time_a as any).cor} size={8} />{(p.time_a as any).nome}</span>
                        <div style={S.pScore}>
                          <span style={S.pGol(aW)}>{p.gols_a}</span>
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>×</span>
                          <span style={S.pGol(bW)}>{p.gols_b}</span>
                        </div>
                        <span style={S.pTime}>{(p.time_b as any).nome}<TeamDot cor={(p.time_b as any).cor} size={8} /></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cartões */}
            {aba === "cartoes" && (
              <table style={S.etbl}>
                <thead><tr>
                  <th style={S.eth()}>#</th>
                  <th style={S.eth(true)}>Jogador</th>
                  <th style={S.eth(true)}>Time</th>
                  <th style={S.eth()}>🟨 Amarelos</th>
                  <th style={S.eth()}>🟥 Vermelhos</th>
                </tr></thead>
                <tbody>
                  {cartoeiros.map((j, i) => (
                    <tr key={j.jogador_id}>
                      <td style={S.etd()}><span style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.28)" }}>{i + 1}</span></td>
                      <td style={{ ...S.etd(true), fontWeight: 600, color: "#fff" }}>{j.apelido || j.nome}</td>
                      <td style={S.etd(true)}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><TeamDot cor={j.time_cor} size={8} /><span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{j.time_nome}</span></span></td>
                      <td style={{ ...S.etd(), fontWeight: 700, color: "#f59e0b" }}>{j.amarelos}</td>
                      <td style={{ ...S.etd(), fontWeight: 700, color: "#ef4444" }}>{j.vermelhos}</td>
                    </tr>
                  ))}
                  {cartoeiros.length === 0 && (
                    <tr><td colSpan={5} style={{ ...S.etd(), color: "rgba(255,255,255,0.25)", paddingTop: 24 }}>Nenhum cartão registrado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
