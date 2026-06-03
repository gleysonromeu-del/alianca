// src/pages/admin/AdminCampeonato.tsx
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trophy, Calendar, Shield, Trash2, CheckCircle2,
  Beer, AlertTriangle, X, Loader2, BarChart3, Upload, Camera, Edit3,
} from "lucide-react";
import {
  useCampeonatoAtual,
  useTimes,
  usePartidas,
  useCriarCampeonato,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── Upload helper ─────────────────────────────────────────────────────────────

async function uploadImagem(file: File, pasta: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${pasta}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("campeonato-imagens").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("campeonato-imagens").getPublicUrl(path);
  return data.publicUrl;
}

// ─── Hooks extras ─────────────────────────────────────────────────────────────

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

function useTodosJogadoresClube() {
  return useQuery({
    queryKey: ["jogadores-clube"],
    queryFn: async () => {
      const { data, error } = await supabase.from("jogadores").select("id, nome_completo, apelido").eq("ativo", true).order("apelido");
      if (error) throw error;
      return (data ?? []) as { id: string; nome_completo: string; apelido: string }[];
    },
  });
}

function useEstatisticasPartida(partidaId: string | null) {
  return useQuery({
    queryKey: ["estatisticas-partida", partidaId],
    enabled: !!partidaId,
    queryFn: async () => {
      const { data, error } = await supabase.from("estatisticas_partida").select("*").eq("partida_id", partidaId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useSalvarEstatisticas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: any[]) => {
      if (rows.length === 0) return;
      const partidaId = rows[0].partida_id;
      await supabase.from("estatisticas_partida").delete().eq("partida_id", partidaId);
      const { error } = await supabase.from("estatisticas_partida").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_d, rows) => {
      if (rows[0]) qc.invalidateQueries({ queryKey: ["estatisticas-partida", rows[0].partida_id] });
    },
  });
}

function useSalvarConfig() {
  return useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const { error } = await supabase.from("configuracoes").upsert({ chave, valor, atualizado_em: new Date().toISOString() });
      if (error) throw error;
    },
  });
}

function useConfig(chave: string) {
  return useQuery({
    queryKey: ["config", chave],
    enabled: !!chave,
    queryFn: async () => {
      const { data } = await supabase.from("configuracoes").select("valor").eq("chave", chave).maybeSingle();
      return data?.valor ?? null;
    },
  });
}

function useAtualizarEscudoTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ timeId, escudo_url, campeonatoId }: { timeId: string; escudo_url: string; campeonatoId: string }) => {
      const { error } = await supabase.from("times").update({ escudo_url }).eq("id", timeId);
      if (error) throw error;
      return campeonatoId;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ["times", vars.campeonatoId] }),
  });
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

interface LinhaJogador {
  jogador_id: string;
  nome: string;
  presente: boolean;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
}

function linhaVazia(jogador: { id: string; nome_completo: string; apelido: string }): LinhaJogador {
  return { jogador_id: jogador.id, nome: jogador.apelido || jogador.nome_completo, presente: true, gols: 0, assistencias: 0, amarelos: 0, vermelhos: 0 };
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function ModalOverlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className={`relative w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-3xl border border-white/10 bg-background p-6 shadow-2xl`}
      >
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function NumInput({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="h-6 w-6 rounded-md bg-white/10 text-sm font-bold hover:bg-white/20 transition">−</button>
      <span className="w-5 text-center text-sm font-bold">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="h-6 w-6 rounded-md bg-white/10 text-sm font-bold hover:bg-white/20 transition">+</button>
    </div>
  );
}

function ImageUploadBtn({ label, pasta, onUploaded, currentUrl }: { label: string; pasta: string; onUploaded: (url: string) => void; currentUrl?: string | null }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImagem(file, pasta);
      onUploaded(url);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {currentUrl ? (
        <img src={currentUrl} alt={label} className="h-16 w-16 rounded-xl object-cover border border-white/10" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/5">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <button type="button" onClick={() => ref.current?.click()} disabled={uploading} className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 transition disabled:opacity-50">
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {uploading ? "Enviando..." : label}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

// ─── Nome do Galo editável inline ─────────────────────────────────────────────

function GaloNomeInline({ campId }: { campId: string }) {
  const { data: nomeGalo } = useConfig(`galo_nome_${campId}`);
  const salvarConfig = useSalvarConfig();
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (nomeGalo !== undefined) setValor(nomeGalo ?? "");
  }, [nomeGalo]);

  async function salvar() {
    await salvarConfig.mutateAsync({ chave: `galo_nome_${campId}`, valor });
    qc.invalidateQueries({ queryKey: ["config", `galo_nome_${campId}`] });
    setEditando(false);
    toast.success("Nome do Galo salvo!");
  }

  if (editando) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <input
          autoFocus
          className="rounded-lg border border-amber-500/30 bg-white/5 px-3 py-1.5 text-sm font-bold text-white outline-none focus:border-amber-500/60 w-full max-w-xs"
          placeholder="Nome do time campeão"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }}
        />
        <button onClick={salvar} className="rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/30 transition">
          {salvarConfig.isPending ? "..." : "Salvar"}
        </button>
        <button onClick={() => setEditando(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
    );
  }

  return (
    <button onClick={() => setEditando(true)} className="mt-1 flex items-center gap-2 group text-left">
      <span className="text-xl font-black text-white">
        {valor || "Clique para adicionar o nome do campeão"}
      </span>
      <Edit3 className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition shrink-0" />
    </button>
  );
}

// ─── Modal Configurações ──────────────────────────────────────────────────────

function ModalConfiguracoes({ campId, onClose }: { campId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: nomeConfig } = useConfig(`campeonato_nome_${campId}`);
  const { data: fotoGaloConfig } = useConfig("foto_galo_atual");
  const salvarConfig = useSalvarConfig();
  const [nome, setNome] = useState("");
  const [fotoGalo, setFotoGalo] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (nomeConfig !== undefined) setNome(nomeConfig ?? ""); }, [nomeConfig]);
  useEffect(() => { if (fotoGaloConfig !== undefined) setFotoGalo(fotoGaloConfig); }, [fotoGaloConfig]);

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarConfig.mutateAsync({ chave: `campeonato_nome_${campId}`, valor: nome });
      if (fotoGalo) await salvarConfig.mutateAsync({ chave: "foto_galo_atual", valor: fotoGalo });
      qc.invalidateQueries({ queryKey: ["config"] });
      toast.success("Configurações salvas!");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <ModalOverlay onClose={onClose} wide>
      <h3 className="mb-6 text-xl font-black">⚙️ Configurações do Campeonato</h3>
      <div className="space-y-6">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Campeonato</label>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-accent/50"
            placeholder="Ex: CHAMPIONS LEAGUE ALIANÇA 2026"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <p className="mt-1 text-xs text-muted-foreground">Aparece no topo da seção pública. Troque a cada mês.</p>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">🐔 Foto do Galo (Campeão Defensor)</label>
          <p className="mb-3 text-xs text-muted-foreground">Foto do campeão do mês anterior. Troque quando o título mudar de mãos.</p>
          <ImageUploadBtn label="Enviar foto do Galo" pasta="galo" currentUrl={fotoGalo} onUploaded={(url) => setFotoGalo(url)} />
        </div>
        <button onClick={handleSalvar} disabled={salvando} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Salvar configurações
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal Escudo do Time ─────────────────────────────────────────────────────

function ModalEscudoTime({ time, campeonatoId, onClose }: { time: Time; campeonatoId: string; onClose: () => void }) {
  const atualizarEscudo = useAtualizarEscudoTime();

  async function handleUploaded(url: string) {
    await atualizarEscudo.mutateAsync({ timeId: time.id, escudo_url: url, campeonatoId });
    toast.success(`Escudo do ${time.nome} atualizado!`);
    onClose();
  }

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Escudo — {time.nome}</h3>
      <div className="flex flex-col items-center gap-4 py-4">
        {time.escudo_url
          ? <img src={time.escudo_url} alt={time.nome} className="h-24 w-24 rounded-2xl object-cover border border-white/10" />
          : <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 text-2xl font-black" style={{ color: time.cor ?? "#FFD166" }}>{time.nome.slice(0, 2).toUpperCase()}</div>
        }
        <ImageUploadBtn label="Enviar escudo" pasta={`escudos/${time.id}`} currentUrl={time.escudo_url} onUploaded={handleUploaded} />
        <p className="text-xs text-muted-foreground text-center">PNG ou JPG quadrado (ex: 200×200px)</p>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal Estatísticas ───────────────────────────────────────────────────────

function ModalEstatisticas({ partida, onClose }: { partida: Partida; onClose: () => void }) {
  const { data: todosJogadores = [], isLoading: loadingJog } = useTodosJogadoresClube();
  const { data: estatSalvas = [], isLoading: loadingEstat } = useEstatisticasPartida(partida.id);
  const salvar = useSalvarEstatisticas();
  const isLoading = loadingJog || loadingEstat;
  const [aba, setAba] = useState<"a" | "b">("a");

  const initLinhas = (timeId: string): LinhaJogador[] =>
    todosJogadores.map((j) => {
      const salvo = estatSalvas.find((e: any) => e.jogador_id === j.id && e.time_id === timeId);
      if (salvo) return { jogador_id: j.id, nome: j.apelido || j.nome_completo, presente: salvo.presente, gols: salvo.gols, assistencias: salvo.assistencias, amarelos: salvo.amarelos, vermelhos: salvo.vermelhos };
      return { ...linhaVazia(j), presente: false };
    });

  const [linhasA, setLinhasA] = useState<LinhaJogador[]>([]);
  const [linhasB, setLinhasB] = useState<LinhaJogador[]>([]);
  const [inicializado, setInicializado] = useState(false);

  if (!isLoading && !inicializado && todosJogadores.length > 0) {
    setLinhasA(initLinhas(partida.time_a_id));
    setLinhasB(initLinhas(partida.time_b_id));
    setInicializado(true);
  }

  const updateLinha = (setLinhas: React.Dispatch<React.SetStateAction<LinhaJogador[]>>, idx: number, campo: keyof LinhaJogador, valor: any) =>
    setLinhas((prev) => prev.map((l, i) => i === idx ? { ...l, [campo]: valor } : l));

  const handleSalvar = async () => {
    const toRow = (l: LinhaJogador, timeId: string) => ({ partida_id: partida.id, jogador_id: l.jogador_id, time_id: timeId, presente: l.presente, gols: l.gols, assistencias: l.assistencias, amarelos: l.amarelos, vermelhos: l.vermelhos });
    const rows = [
      ...linhasA.filter((l) => l.presente || l.gols > 0 || l.assistencias > 0 || l.amarelos > 0 || l.vermelhos > 0).map((l) => toRow(l, partida.time_a_id)),
      ...linhasB.filter((l) => l.presente || l.gols > 0 || l.assistencias > 0 || l.amarelos > 0 || l.vermelhos > 0).map((l) => toRow(l, partida.time_b_id)),
    ];
    await salvar.mutateAsync(rows);
    onClose();
  };

  const renderTabela = (linhas: LinhaJogador[], setLinhas: React.Dispatch<React.SetStateAction<LinhaJogador[]>>) => (
    <div className="overflow-x-auto">
      <p className="mb-3 text-xs text-muted-foreground">✅ Marque <strong>Pres.</strong> para os jogadores que participaram desta partida.</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <th className="pb-2 text-left">Jogador</th>
            <th className="pb-2 text-center w-14">Pres.</th>
            <th className="pb-2 text-center w-20">⚽</th>
            <th className="pb-2 text-center w-20">🎯</th>
            <th className="pb-2 text-center w-20">🟨</th>
            <th className="pb-2 text-center w-20">🟥</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, idx) => (
            <tr key={l.jogador_id} className={`border-b border-white/5 transition-opacity ${!l.presente ? "opacity-30" : ""}`}>
              <td className="py-2 font-medium">{l.nome}</td>
              <td className="py-2 text-center"><input type="checkbox" className="accent-accent h-4 w-4 cursor-pointer" checked={l.presente} onChange={(e) => updateLinha(setLinhas, idx, "presente", e.target.checked)} /></td>
              <td className="py-2"><NumInput value={l.gols} onChange={(v) => updateLinha(setLinhas, idx, "gols", v)} /></td>
              <td className="py-2"><NumInput value={l.assistencias} onChange={(v) => updateLinha(setLinhas, idx, "assistencias", v)} /></td>
              <td className="py-2"><NumInput value={l.amarelos} onChange={(v) => updateLinha(setLinhas, idx, "amarelos", v)} /></td>
              <td className="py-2"><NumInput value={l.vermelhos} onChange={(v) => updateLinha(setLinhas, idx, "vermelhos", v)} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const resumo = (linhas: LinhaJogador[]) => {
    const pres = linhas.filter((l) => l.presente);
    return { pres: pres.length, gols: pres.reduce((s, x) => s + x.gols, 0), assist: pres.reduce((s, x) => s + x.assistencias, 0), amar: pres.reduce((s, x) => s + x.amarelos, 0), verm: pres.reduce((s, x) => s + x.vermelhos, 0) };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }} className="relative my-8 w-full max-w-3xl rounded-3xl border border-white/10 bg-background p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Estatísticas da Partida</p>
            <h3 className="text-xl font-black">{partida.time_a?.nome} <span className="text-muted-foreground">×</span> {partida.time_b?.nome}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Resultado: {partida.gols_a} – {partida.gols_b}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-muted-foreground hover:text-foreground transition-colors"><X className="h-5 w-5" /></button>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-accent" /></div>
        ) : (
          <>
            <div className="mb-5 flex gap-2">
              {([{ key: "a", nome: partida.time_a?.nome, cor: partida.time_a?.cor }, { key: "b", nome: partida.time_b?.nome, cor: partida.time_b?.cor }] as const).map((t) => {
                const r = resumo(t.key === "a" ? linhasA : linhasB);
                return (
                  <button key={t.key} onClick={() => setAba(t.key)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition ${aba === t.key ? "bg-accent/20 text-accent border border-accent/30" : "border border-white/10 text-muted-foreground hover:bg-white/5"}`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.cor ?? "#888" }} />
                    {t.nome}
                    <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{r.pres} pres.</span>
                  </button>
                );
              })}
            </div>
            <div className="max-h-[50vh] overflow-y-auto">
              {aba === "a" ? renderTabela(linhasA, setLinhasA) : renderTabela(linhasB, setLinhasB)}
            </div>
            {(() => {
              const r = resumo(aba === "a" ? linhasA : linhasB);
              return r.pres > 0 ? (
                <div className="mt-4 flex flex-wrap gap-3 rounded-xl bg-white/5 px-4 py-3 text-xs text-muted-foreground">
                  <span>👥 {r.pres} presentes</span><span>⚽ {r.gols} gols</span><span>🎯 {r.assist} assist.</span><span>🟨 {r.amar} amarelos</span><span>🟥 {r.verm} vermelhos</span>
                </div>
              ) : null;
            })()}
            <button onClick={handleSalvar} disabled={salvar.isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
              {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar estatísticas
            </button>
          </>
        )}
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
  const toggle = (id: string) => setSelecionados((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = async () => {
    if (!nome.trim()) return;
    await criarTime.mutateAsync({ campeonato_id: campeonatoId, nome: nome.trim(), cor, jogador_ids: selecionados });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Novo time</h3>
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do time</label>
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none focus:border-accent/50" placeholder="Ex: Os Guerreiros" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cor</label>
          <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-8 w-14 cursor-pointer rounded-lg border border-white/10" />
          <span className="rounded-lg px-3 py-1 text-xs font-bold" style={{ background: cor, color: "#111" }}>Prévia</span>
        </div>
        {jogadores.length > 0 && (
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Jogadores ({selecionados.length} selecionados)</label>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-white/10 p-2">
              {jogadores.map((j) => (
                <label key={j.id} className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${selecionados.includes(j.id) ? "bg-accent/20 text-foreground" : "hover:bg-white/5 text-muted-foreground"}`}>
                  <input type="checkbox" className="accent-accent" checked={selecionados.includes(j.id)} onChange={() => toggle(j.id)} />
                  {j.apelido || j.nome_completo}
                </label>
              ))}
            </div>
          </div>
        )}
        <button onClick={handleSubmit} disabled={!nome.trim() || criarTime.isPending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
          {criarTime.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Criar time
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─── Modal: Agendar Partida ───────────────────────────────────────────────────

function ModalAgendarPartida({ campeonatoId, times, onClose }: { campeonatoId: string; times: Time[]; onClose: () => void }) {
  const criarPartida = useCriarPartida();
  const [timeA, setTimeA] = useState("");
  const [timeB, setTimeB] = useState("");
  const [dataStr, setDataStr] = useState("");
  const [horaStr, setHoraStr] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = async () => {
    setErro("");
    if (!timeA || !timeB || timeA === timeB) return;
    let isoData: string | null = null;
    if (dataStr) {
      const iso = dataStr + (horaStr ? "T" + horaStr + ":00" : "T12:00:00");
      const parsed = new Date(iso);
      if (isNaN(parsed.getTime())) { setErro("Data inválida."); return; }
      isoData = parsed.toISOString();
    }
    try {
      await criarPartida.mutateAsync({ campeonato_id: campeonatoId, time_a_id: timeA, time_b_id: timeB, data: isoData, observacoes: obs || null });
      onClose();
    } catch (e: any) { setErro(e?.message ?? "Erro ao agendar."); }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Agendar partida</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time A</label>
            <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none" value={timeA} onChange={(e) => setTimeA(e.target.value)}>
              <option value="">Selecione</option>
              {times.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time B</label>
            <select className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none" value={timeB} onChange={(e) => setTimeB(e.target.value)}>
              <option value="">Selecione</option>
              {times.filter((t) => t.id !== timeA).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data (opcional)</label>
            <input type="date" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none" value={dataStr} onChange={(e) => setDataStr(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hora (opcional)</label>
            <input type="time" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none" value={horaStr} onChange={(e) => setHoraStr(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações (opcional)</label>
          <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none" placeholder="Ex: Campo do Estrela" value={obs} onChange={(e) => setObs(e.target.value)} />
        </div>
        {erro && <p className="rounded-xl bg-red-500/10 px-4 py-2 text-xs text-red-400">{erro}</p>}
        <button onClick={handleSubmit} disabled={!timeA || !timeB || timeA === timeB || criarPartida.isPending} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:opacity-90 disabled:opacity-50">
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
    await finalizarPartida.mutateAsync({ partida_id: partida.id, gols_a: golsA, gols_b: golsB, observacoes: obs || null });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h3 className="mb-5 text-xl font-black">Registrar placar</h3>
      <p className="mb-6 text-center text-sm text-muted-foreground">{partida.time_a?.nome} <span className="font-bold text-foreground">vs</span> {partida.time_b?.nome}</p>
      <div className="grid grid-cols-3 items-center gap-4">
        <div className="text-center">
          <p className="mb-2 truncate text-sm font-bold">{partida.time_a?.nome}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setGolsA(Math.max(0, golsA - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20">-</button>
            <span className="w-8 text-center text-3xl font-black text-accent">{golsA}</span>
            <button onClick={() => setGolsA(golsA + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20">+</button>
          </div>
        </div>
        <div className="text-center text-2xl font-black text-muted-foreground">×</div>
        <div className="text-center">
          <p className="mb-2 truncate text-sm font-bold">{partida.time_b?.nome}</p>
          <div className="flex items-center justify-center gap-2">
            <button onClick={() => setGolsB(Math.max(0, golsB - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20">-</button>
            <span className="w-8 text-center text-3xl font-black text-accent">{golsB}</span>
            <button onClick={() => setGolsB(golsB + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-lg font-bold hover:bg-white/20">+</button>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <input className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm outline-none" placeholder="Observações (opcional)" value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      <button onClick={handleSubmit} disabled={finalizarPartida.isPending} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
        {finalizarPartida.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Confirmar placar
      </button>
    </ModalOverlay>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function AdminCampeonato() {
  useCampeonatoRealtime();

  const { data: camp, isLoading: loadingCamp } = useCampeonatoAtual();
  const { data: times = [] } = useTimes(camp?.id);
  const { data: partidas = [] } = usePartidas(camp?.id);

  const criarCampeonato = useCriarCampeonato();
  const deletarTime = useDeletarTime();
  const deletarPartida = useDeletarPartida();
  const encerrarCampeonato = useEncerrarCampeonato();

  const [modalTime, setModalTime] = useState(false);
  const [modalPartida, setModalPartida] = useState(false);
  const [modalPlacar, setModalPlacar] = useState<Partida | null>(null);
  const [modalEstat, setModalEstat] = useState<Partida | null>(null);
  const [modalConfig, setModalConfig] = useState(false);
  const [modalEscudo, setModalEscudo] = useState<Time | null>(null);
  const [confirmEncerrar, setConfirmEncerrar] = useState(false);

  const { data: nomeConfig } = useConfig(camp ? `campeonato_nome_${camp.id}` : "");
  const { data: fotoGalo } = useConfig("foto_galo_atual");

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

  if (loadingCamp) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;
  }

  if (!camp) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <Trophy className="mx-auto mb-4 h-16 w-16 text-accent/40" />
        <h2 className="text-2xl font-black">Nenhum campeonato aberto</h2>
        <p className="mt-2 text-muted-foreground">Crie o campeonato deste mês para começar.</p>
        <button onClick={handleCriarMesAtual} disabled={criarCampeonato.isPending} className="mt-6 flex items-center gap-2 mx-auto rounded-2xl bg-accent px-6 py-3 font-bold text-accent-foreground hover:opacity-90 disabled:opacity-50">
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
        {modalPartida && <ModalAgendarPartida campeonatoId={camp.id} times={times} onClose={() => setModalPartida(false)} />}
        {modalPlacar && <ModalRegistrarPlacar partida={modalPlacar} onClose={() => setModalPlacar(null)} />}
        {modalEstat && <ModalEstatisticas partida={modalEstat} onClose={() => setModalEstat(null)} />}
        {modalConfig && <ModalConfiguracoes campId={camp.id} onClose={() => setModalConfig(false)} />}
        {modalEscudo && <ModalEscudoTime time={modalEscudo} campeonatoId={camp.id} onClose={() => setModalEscudo(null)} />}
        {confirmEncerrar && (
          <ModalOverlay onClose={() => setConfirmEncerrar(false)}>
            <div className="text-center">
              <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-400" />
              <h3 className="text-xl font-black">Encerrar campeonato?</h3>
              <p className="mt-2 text-sm text-muted-foreground">O campeão e pagador serão registrados. Esta ação não pode ser desfeita.</p>
              <div className="mt-6 flex gap-3">
                <button onClick={() => setConfirmEncerrar(false)} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm font-semibold hover:bg-white/5">Cancelar</button>
                <button onClick={handleEncerrar} disabled={encerrarCampeonato.isPending} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 py-3 text-sm font-bold text-black hover:opacity-90 disabled:opacity-50">
                  {encerrarCampeonato.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Beer className="h-4 w-4" />}
                  Encerrar
                </button>
              </div>
            </div>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Admin · Campeonato</p>
            <h1 className="text-3xl font-black tracking-tight">{nomeConfig || formatMes(camp.mes)}</h1>
            {nomeConfig && <p className="text-sm text-muted-foreground">{formatMes(camp.mes)}</p>}
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Campeonato aberto
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setModalConfig(true)} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition">
              <Edit3 className="h-4 w-4" /> Configurações
            </button>
            <button onClick={() => setModalTime(true)} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition">
              <Shield className="h-4 w-4" /> Novo time
            </button>
            <button onClick={() => setModalPartida(true)} disabled={times.length < 2} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40">
              <Calendar className="h-4 w-4" /> Agendar partida
            </button>
            <button onClick={() => setConfirmEncerrar(true)} disabled={times.length === 0} className="flex items-center gap-2 rounded-2xl bg-amber-500/20 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-500/30 transition disabled:opacity-40">
              <Beer className="h-4 w-4" /> Encerrar mês
            </button>
          </div>
        </div>

        {/* ── Card do Galo ── */}
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <div className="flex items-stretch gap-0">
            {/* Foto grande à esquerda */}
            <div className="relative shrink-0 w-44 bg-black/20">
              {fotoGalo ? (
                <img src={fotoGalo} alt="O Galo" className="h-full w-full object-cover" style={{ minHeight: 160 }} />
              ) : (
                <div className="flex h-full w-full min-h-40 items-center justify-center text-5xl">🐔</div>
              )}
              {/* botão de troca sobreposto */}
              <button
                onClick={() => setModalConfig(true)}
                className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-[10px] font-semibold text-white hover:bg-black/80 transition"
              >
                <Camera className="h-3 w-3" /> Trocar
              </button>
            </div>

            {/* Info à direita */}
            <div className="flex flex-1 flex-col justify-center gap-2 p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">🐔 O Galo — Campeão Defensor</p>

              {/* Nome editável inline */}
              <GaloNomeInline campId={camp.id} />

              <p className="text-sm text-muted-foreground">
                O atual campeão a ser destronado este mês.<br />
                <span className="text-xs opacity-60">Clique no nome acima para editar.</span>
              </p>
            </div>
          </div>
        </section>

        {/* Times */}
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
          <div className="grid gap-4 sm:grid-cols-2">
            {times.map((t, i) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="group relative rounded-2xl border border-white/10 bg-white/3 p-4">
                <span className="absolute right-3 top-3 text-xs font-black text-muted-foreground">#{i + 1}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setModalEscudo(t)} title="Clique para atualizar o escudo" className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden border border-white/10 hover:border-accent/50 transition group/escudo">
                    {t.escudo_url
                      ? <img src={t.escudo_url} alt={t.nome} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-xs font-black" style={{ background: t.cor ?? "#FFD166", color: "#111" }}>{t.nome.slice(0, 2).toUpperCase()}</div>
                    }
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/escudo:opacity-100 transition">
                      <Upload className="h-4 w-4 text-white" />
                    </div>
                  </button>
                  <div className="min-w-0">
                    <p className="truncate font-bold">{t.nome}</p>
                    <p className="text-xs text-muted-foreground">{t.pontos} pts · {t.vitorias}V {t.empates}E {t.derrotas}D</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>SG: {t.gols_pro - t.gols_contra > 0 ? "+" : ""}{t.gols_pro - t.gols_contra}</span>
                  <button onClick={() => deletarTime.mutate({ id: t.id, campeonato_id: camp.id })} className="rounded-lg p-1.5 text-red-400/60 opacity-0 transition hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Partidas Agendadas */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
            <Calendar className="h-5 w-5 text-amber-400" /> Partidas agendadas ({partidasAgendadas.length})
          </h2>
          {partidasAgendadas.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma partida agendada.{" "}
              {times.length >= 2 && <button onClick={() => setModalPartida(true)} className="text-accent underline">Agendar agora</button>}
            </p>
          )}
          <div className="space-y-3">
            {partidasAgendadas.map((p) => (
              <div key={p.id} className="group flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/3 px-5 py-4">
                <div className="flex flex-1 items-center text-sm font-semibold">
                  <span className="w-0 flex-1 text-right truncate pr-3">{p.time_a?.nome}</span>
                  <span className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-black">VS</span>
                  <span className="w-0 flex-1 text-left truncate pl-3">{p.time_b?.nome}</span>
                </div>
                {p.data && <span className="text-xs text-muted-foreground">{new Date(p.data).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>}
                <div className="flex gap-2">
                  <button onClick={() => setModalPlacar(p)} className="flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/30 transition">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Registrar placar
                  </button>
                  <button onClick={() => deletarPartida.mutate({ id: p.id, campeonato_id: camp.id })} className="rounded-xl p-1.5 text-red-400/50 opacity-0 hover:bg-red-500/10 hover:text-red-400 transition group-hover:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Resultados */}
        {partidasFinalizadas.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Resultados ({partidasFinalizadas.length})
            </h2>
            <div className="space-y-2">
              {[...partidasFinalizadas].reverse().map((p) => {
                const aV = p.gols_a > p.gols_b, bV = p.gols_b > p.gols_a;
                return (
                  <div key={p.id} className="group flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-white/3 px-5 py-3">
                    <div className="flex flex-1 items-center text-sm">
                      <span className={`w-0 flex-1 text-right font-semibold truncate pr-3 ${bV ? "opacity-40" : ""}`}>{p.time_a?.nome}</span>
                      <span className="shrink-0 rounded-xl bg-white/10 px-3 py-1 font-black">
                        <span className={aV ? "text-emerald-400" : ""}>{p.gols_a}</span>
                        <span className="mx-1 text-muted-foreground">–</span>
                        <span className={bV ? "text-emerald-400" : ""}>{p.gols_b}</span>
                      </span>
                      <span className={`w-0 flex-1 text-left font-semibold truncate pl-3 ${aV ? "opacity-40" : ""}`}>{p.time_b?.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setModalEstat(p)} className="flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-400 hover:bg-blue-500/30 transition">
                        <BarChart3 className="h-3.5 w-3.5" /> Estatísticas
                      </button>
                      <button onClick={() => setModalPlacar(p)} className="text-xs text-muted-foreground underline">Editar</button>
                      <button onClick={() => deletarPartida.mutate({ id: p.id, campeonato_id: camp.id })} className="rounded-xl p-1.5 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">💡 Passe o mouse sobre um resultado para lançar as estatísticas.</p>
          </section>
        )}
      </div>
    </>
  );
}
