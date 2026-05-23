// src/pages/admin/AdminCampeonato.tsx
// Painel do admin: cria campeonato, gerencia times, lança resultados e encerra mês

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trophy,
  Calendar,
  Shield,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Beer,
  AlertTriangle,
  X,
  Loader2,
  LogOut,
  Users,
} from "lucide-react";
import {
  useCampeonatoAtual,
  useTodosCampeonatos,
  useTimes,
  usePartidas,
  useCriarCampeonato,
  useAtualizarCampeonato,
  useCriarTime,
  useDeletarTime,
  useCriarPartida,
  useFinalizarPartida,
  useDeletarPartida,
  useEncerrarCampeonato,
  useCampeonatoRealtime,
  formatMes,
  type Partida,
  type Time,
} from "@/hooks/use-campeonato";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, Link } from "@tanstack/react-router";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function useJogadores() {
  return useQuery({
    queryKey: ["jogadores-todos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jogadores").select("id, nome_completo, apelido").order("apelido");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-background p-6 shadow-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

// ─── Modal: Criar Time ────────────────────────────────────────────────────────

function ModalCriarTime({ campeonatoId, onClose }: { campeonatoId: string; onClose: () => void }) {
  const { data: jogadores = [] } = useJogadores();
  const criarTime = useCriarTime();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#FFD166");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const toggle = (id: string) =>
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    await criarTime.mutateAsync({
      campeonato_id: campeonatoId,
      nome: nome.trim(),
      cor,
      jogador_ids: selecionados,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Novo time</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nome do time
          </label>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
            placeholder="Ex: Os Guerreiros"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cor</label>
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-8 w-14 cursor-pointer rounded-lg border border-white/10"
          />
          <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: cor, color: "#111" }}>
            Prévia
          </span>
        </div>

        {jogadores.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Jogadores ({selecionados.length} selecionados)
            </label>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-2">
              {jogadores.map((j) => (
                <label
                  key={j.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    selecionados.includes(j.id)
                      ? "bg-accent/20 text-foreground"
                      : "hover:bg-white/5 text-muted-foreground"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-accent"
                    checked={selecionados.includes(j.id)}
                    onChange={() => toggle(j.id)}
                  />
                  {j.apelido || j.nome_completo}
                </label>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!nome.trim() || criarTime.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {criarTime.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar time
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal: Agendar Partida ───────────────────────────────────────────────────

function ModalAgendarPartida({
  campeonatoId,
  times,
  onClose,
}: {
  campeonatoId: string;
  times: Time[];
  onClose: () => void;
}) {
  const criarPartida = useCriarPartida();
  const [timeA, setTimeA] = useState("");
  const [timeB, setTimeB] = useState("");
  const [data, setData] = useState("");
  const [obs, setObs] = useState("");

  const handleSubmit = async () => {
    if (!timeA || !timeB || timeA === timeB) return;
    await criarPartida.mutateAsync({
      campeonato_id: campeonatoId,
      time_a_id: timeA,
      time_b_id: timeB,
      data: data ? new Date(data).toISOString() : null,
      observacoes: obs || null,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Agendar partida</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Time A
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
              value={timeA}
              onChange={(e) => setTimeA(e.target.value)}
            >
              <option value="">Selecione</option>
              {times.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Time B
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-accent/50"
              value={timeB}
              onChange={(e) => setTimeB(e.target.value)}
            >
              <option value="">Selecione</option>
              {times
                .filter((t) => t.id !== timeA)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Data e hora (opcional)
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observações (opcional)
          </label>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            placeholder="Ex: Campo do Estrela"
            value={obs}
            onChange={(e) => setObs(e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!timeA || !timeB || timeA === timeB || criarPartida.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {criarPartida.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
          Agendar
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal: Registrar Placar ──────────────────────────────────────────────────

function ModalRegistrarPlacar({ partida, onClose }: { partida: Partida; onClose: () => void }) {
  const finalizarPartida = useFinalizarPartida();
  const [golsA, setGolsA] = useState(partida.gols_a);
  const [golsB, setGolsB] = useState(partida.gols_b);
  const [obs, setObs] = useState(partida.observacoes ?? "");

  const handleSubmit = async () => {
    await finalizarPartida.mutateAsync({
      partida_id: partida.id,
      gols_a: golsA,
      gols_b: golsB,
      observacoes: obs || null,
    });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Registrar placar</h3>
      <p className="mb-6 text-center text-sm text-muted-foreground">
        {partida.time_a?.nome} <span className="font-bold text-foreground">vs</span> {partida.time_b?.nome}
      </p>

      <div className="grid grid-cols-3 items-center gap-4">
        <div className="text-center">
          <p className="mb-2 truncate text-sm font-bold">{partida.time_a?.nome}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setGolsA(Math.max(0, golsA - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20"
            >
              -
            </button>
            <span className="w-8 text-center text-3xl font-black text-accent">{golsA}</span>
            <button
              onClick={() => setGolsA(golsA + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20"
            >
              +
            </button>
          </div>
        </div>

        <div className="text-center text-2xl font-black text-muted-foreground">×</div>

        <div className="text-center">
          <p className="mb-2 truncate text-sm font-bold">{partida.time_b?.nome}</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setGolsB(Math.max(0, golsB - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20"
            >
              -
            </button>
            <span className="w-8 text-center text-3xl font-black text-accent">{golsB}</span>
            <button
              onClick={() => setGolsB(golsB + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <input
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
          placeholder="Observações (opcional)"
          value={obs}
          onChange={(e) => setObs(e.target.value)}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={finalizarPartida.isPending}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {finalizarPartida.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        Confirmar placar
      </button>
    </ModalOverlay>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AdminCampeonato() {
  useCampeonatoRealtime();

  const { user, isAdmin, loading: loadingAuth } = useAuth();
  const navigate = useNavigate();

  const { data: camp, isLoading: loadingCamp } = useCampeonatoAtual();
  const { data: todosCamp = [] } = useTodosCampeonatos();
  const { data: times = [] } = useTimes(camp?.id);
  const { data: partidas = [] } = usePartidas(camp?.id);

  const criarCampeonato = useCriarCampeonato();
  const deletarTime = useDeletarTime();
  const deletarPartida = useDeletarPartida();
  const encerrarCampeonato = useEncerrarCampeonato();

  const [modalTime, setModalTime] = useState(false);
  const [modalPartida, setModalPartida] = useState(false);
  const [modalPlacar, setModalPlacar] = useState<Partida | null>(null);
  const [confirmEncerrar, setConfirmEncerrar] = useState(false);

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (!isAdmin) {
      navigate({ to: "/jogadores", replace: true });
    }
  }, [loadingAuth, user, isAdmin, navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  if (loadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  const partidasAgendadas = partidas.filter((p) => p.status === "agendada");
  const partidasFinalizadas = partidas.filter((p) => p.status === "finalizada");

  const handleCriarMesAtual = async () => {
    const mes = new Date();
    mes.setDate(1);
    await criarCampeonato.mutateAsync(mes.toISOString().slice(0, 10));
  };

  const handleEncerrar = async () => {
    if (!camp) return;
    await encerrarCampeonato.mutateAsync(camp.id);
    setConfirmEncerrar(false);
  };

  // ── Estado vazio: sem campeonato ──
  if (loadingCamp) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!camp) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Trophy className="mx-auto mb-4 h-16 w-16 text-accent/40" />
        <h2 className="text-2xl font-black">Nenhum campeonato aberto</h2>
        <p className="mt-2 text-muted-foreground">Crie o campeonato deste mês para começar.</p>
        <button
          onClick={handleCriarMesAtual}
          disabled={criarCampeonato.isPending}
          className="mt-6 flex items-center gap-2 mx-auto rounded-2xl bg-accent px-6 py-3 font-bold text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {criarCampeonato.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar campeonato de {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </button>
      </div>
    );
  }

  return (
    <>
      <AnimatePresence>
        {modalTime && <ModalCriarTime campeonatoId={camp.id} onClose={() => setModalTime(false)} />}
        {modalPartida && (
          <ModalAgendarPartida campeonatoId={camp.id} times={times} onClose={() => setModalPartida(false)} />
        )}
        {modalPlacar && <ModalRegistrarPlacar partida={modalPlacar} onClose={() => setModalPlacar(null)} />}
        {confirmEncerrar && (
          <ModalOverlay onClose={() => setConfirmEncerrar(false)}>
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-400" />
              <h3 className="text-xl font-black">Encerrar campeonato?</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                O campeão e pagador serão registrados. O próximo mês será criado automaticamente.
                <strong className="block mt-1 text-foreground">Esta ação não pode ser desfeita.</strong>
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setConfirmEncerrar(false)}
                  className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEncerrar}
                  disabled={encerrarCampeonato.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50"
                >
                  {encerrarCampeonato.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Beer className="h-4 w-4" />
                  )}
                  Encerrar
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Admin</p>
            <h1 className="text-3xl font-black tracking-tight">{formatMes(camp.mes)}</h1>
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Campeonato aberto
            </span>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setModalTime(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition"
            >
              <Shield className="h-4 w-4" /> Novo time
            </button>
            <button
              onClick={() => setModalPartida(true)}
              disabled={times.length < 2}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40"
            >
              <Calendar className="h-4 w-4" /> Agendar partida
            </button>
            <button
              onClick={() => setConfirmEncerrar(true)}
              disabled={times.length === 0}
              className="flex items-center gap-2 rounded-2xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition disabled:opacity-40"
            >
              <Beer className="h-4 w-4" /> Encerrar mês
            </button>
            <Link
              to="/jogadores"
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition"
            >
              <Users className="h-4 w-4" /> Cadastros & Comprovantes
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
            >
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </div>
        </div>

        {/* ── Times ── */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Shield className="h-5 w-5 text-accent" /> Times ({times.length})
          </h2>

          {times.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/10 py-12 text-center text-muted-foreground">
              <Shield className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p className="text-sm">Nenhum time cadastrado. Clique em "Novo time" para começar.</p>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {times.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative rounded-2xl border border-white/10 bg-white/3 p-4"
              >
                {/* Posição */}
                <span className="absolute right-3 top-3 text-xs font-black text-muted-foreground">#{i + 1}</span>

                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl text-xs font-black"
                    style={{ background: t.cor ?? "#FFD166", color: "#111" }}
                  >
                    {t.nome.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.pontos} pts · {t.vitorias}V {t.empates}E {t.derrotas}D
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    SG: {t.gols_pro - t.gols_contra > 0 ? "+" : ""}
                    {t.gols_pro - t.gols_contra}
                  </span>
                  <button
                    onClick={() => deletarTime.mutate(t.id)}
                    className="rounded-lg p-1.5 text-red-400/60 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ── Partidas Agendadas ── */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Calendar className="h-5 w-5 text-amber-400" /> Partidas agendadas ({partidasAgendadas.length})
          </h2>

          {partidasAgendadas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma partida agendada.{" "}
              {times.length >= 2 && (
                <button onClick={() => setModalPartida(true)} className="text-accent underline">
                  Agendar agora
                </button>
              )}
            </p>
          )}

          <div className="space-y-3">
            {partidasAgendadas.map((p) => (
              <div
                key={p.id}
                className="group flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/3 px-5 py-4"
              >
                <div className="flex flex-1 items-center justify-center gap-3 text-sm font-semibold">
                  <span className="truncate text-right">{p.time_a?.nome}</span>
                  <span className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-black">VS</span>
                  <span className="truncate">{p.time_b?.nome}</span>
                </div>

                {p.data && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(p.data).toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setModalPlacar(p)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Registrar placar
                  </button>
                  <button
                    onClick={() => deletarPartida.mutate(p.id)}
                    className="rounded-xl p-1.5 text-red-400/50 opacity-0 hover:bg-red-500/10 hover:text-red-400 transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Resultados ── */}
        {partidasFinalizadas.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Resultados ({partidasFinalizadas.length})
            </h2>

            <div className="space-y-2">
              {[...partidasFinalizadas].reverse().map((p) => {
                const aVenceu = p.gols_a > p.gols_b;
                const bVenceu = p.gols_b > p.gols_a;
                return (
                  <div
                    key={p.id}
                    className="group flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/3 px-5 py-3"
                  >
                    <div className="flex flex-1 items-center justify-center gap-3 text-sm">
                      <span className={`truncate text-right font-semibold ${bVenceu ? "opacity-40" : ""}`}>
                        {p.time_a?.nome}
                      </span>
                      <span className="shrink-0 rounded-xl bg-white/10 px-3 py-1 font-black">
                        <span className={aVenceu ? "text-emerald-400" : ""}>{p.gols_a}</span>
                        <span className="mx-1 text-muted-foreground">–</span>
                        <span className={bVenceu ? "text-emerald-400" : ""}>{p.gols_b}</span>
                      </span>
                      <span className={`truncate font-semibold ${aVenceu ? "opacity-40" : ""}`}>{p.time_b?.nome}</span>
                    </div>
                    <button
                      onClick={() => setModalPlacar(p)}
                      className="text-xs text-muted-foreground underline opacity-0 group-hover:opacity-100 transition"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deletarPartida.mutate(p.id)}
                      className="rounded-xl p-1.5 text-red-400/50 opacity-0 hover:bg-red-500/10 hover:text-red-400 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/admin/campeonato")({ component: AdminCampeonato });
