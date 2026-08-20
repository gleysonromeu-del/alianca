// src/pages/admin/AdminEstatisticas.tsx
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Save, Loader2, BarChart3 } from "lucide-react";
import { toast } from "sonner";

interface LinhaEstat {
  jogador_id: string;
  apelido: string;
  valor: number;
}

interface LinhaCartao {
  jogador_id: string;
  apelido: string;
  amarelos: number;
  vermelhos: number;
}

const ANO = new Date().getFullYear();
const CHAVE_GOLS = `artilharia_${ANO}`;
const CHAVE_ASSIST = `assistencias_${ANO}`;
const CHAVE_CARTOES = `cartoes_${ANO}`;

function useRanking(chave: string) {
  return useQuery({
    queryKey: ["ranking", chave],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", chave)
        .maybeSingle();
      if (!data?.valor) return [] as LinhaEstat[];
      try { return JSON.parse(data.valor) as LinhaEstat[]; } catch { return []; }
    },
  });
}

function useSalvarRanking(chave: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linhas: LinhaEstat[]) => {
      const { error } = await supabase.from("configuracoes").upsert({
        chave,
        valor: JSON.stringify(linhas),
        atualizado_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ranking", chave] });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

function useJogadoresClube() {
  return useQuery({
    queryKey: ["jogadores-clube"],
    queryFn: async () => {
      // Inclui aprovados (ativo=true) e pendentes (ativo=false), excluindo só rejeitados (ativo=null)
      const { data, error } = await supabase
        .from("jogadores")
        .select("id, nome_completo, apelido")
        .not("ativo", "is", null)
        .order("apelido");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useCartoes() {
  return useQuery({
    queryKey: ["ranking", CHAVE_CARTOES],
    queryFn: async () => {
      const { data } = await supabase
        .from("configuracoes")
        .select("valor")
        .eq("chave", CHAVE_CARTOES)
        .maybeSingle();
      if (!data?.valor) return [] as LinhaCartao[];
      try { return JSON.parse(data.valor) as LinhaCartao[]; } catch { return []; }
    },
  });
}

function useSalvarCartoes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (linhas: LinhaCartao[]) => {
      const { error } = await supabase.from("configuracoes").upsert({
        chave: CHAVE_CARTOES,
        valor: JSON.stringify(linhas),
        atualizado_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ranking", CHAVE_CARTOES] });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

function NumBtn({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} className="h-7 w-7 rounded-lg bg-white/10 text-sm font-bold hover:bg-white/20 transition">−</button>
      <span className="w-8 text-center text-sm font-bold">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} className="h-7 w-7 rounded-lg bg-white/10 text-sm font-bold hover:bg-white/20 transition">+</button>
    </div>
  );
}

// ─── Nome curto: primeiro nome (+ sobrenome só se houver primeiro nome repetido) ──

function primeiroNome(nomeCompleto: string): string {
  return (nomeCompleto || "").trim().split(/\s+/)[0] || "";
}

function ultimoSobrenome(nomeCompleto: string): string {
  const partes = (nomeCompleto || "").trim().split(/\s+/);
  return partes.length > 1 ? partes[partes.length - 1] : "";
}

/** Monta um mapa id -> "Apelido — Nome" (ou "Apelido — Nome Sobrenome" se o primeiro nome se repetir entre os jogadores da lista) */
function construirNomesCurtos(
  jogadores: { id: string; nome_completo: string; apelido: string }[]
): Map<string, string> {
  const contagemPorPrimeiroNome = new Map<string, number>();
  jogadores.forEach((j) => {
    const chave = primeiroNome(j.nome_completo).toLowerCase();
    if (!chave) return;
    contagemPorPrimeiroNome.set(chave, (contagemPorPrimeiroNome.get(chave) ?? 0) + 1);
  });

  const mapa = new Map<string, string>();
  jogadores.forEach((j) => {
    const pn = primeiroNome(j.nome_completo);
    const chave = pn.toLowerCase();
    const repetido = (contagemPorPrimeiroNome.get(chave) ?? 0) > 1;
    const nomeBase = repetido ? `${pn} ${ultimoSobrenome(j.nome_completo)}`.trim() : pn;
    const label = j.apelido && nomeBase ? `${j.apelido} — ${nomeBase}` : (j.apelido || nomeBase || "Jogador sem nome");
    mapa.set(j.id, label);
  });
  return mapa;
}

// ─── Tabela individual de ranking ─────────────────────────────────────────────

function TabelaRanking({
  titulo,
  emoji,
  cor,
  chave,
  todosJogadores,
}: {
  titulo: string;
  emoji: string;
  cor: string;
  chave: string;
  todosJogadores: { id: string; nome_completo: string; apelido: string }[];
}) {
  const { data: salvas = [], isLoading } = useRanking(chave);
  const salvar = useSalvarRanking(chave);
  const [linhas, setLinhas] = useState<LinhaEstat[]>([]);
  const [inicializado, setInicializado] = useState(false);
  const [jogSelecionado, setJogSelecionado] = useState("");

  useEffect(() => {
    if (!isLoading && !inicializado) {
      setLinhas(salvas);
      setInicializado(true);
    }
  }, [salvas, isLoading, inicializado]);

  const disponiveis = todosJogadores.filter(
    (j) => !linhas.find((l) => l.jogador_id === j.id)
  );

  function adicionar() {
    const jog = todosJogadores.find((j) => j.id === jogSelecionado);
    if (!jog) return;
    setLinhas((prev) => [...prev, {
      jogador_id: jog.id,
      apelido: jog.apelido || jog.nome_completo,
      valor: 0,
    }]);
    setJogSelecionado("");
  }

  function remover(id: string) {
    setLinhas((prev) => prev.filter((l) => l.jogador_id !== id));
  }

  function updateValor(id: string, v: number) {
    setLinhas((prev) => prev.map((l) => l.jogador_id === id ? { ...l, valor: v } : l));
  }

  const jogById = new Map(todosJogadores.map((j) => [j.id, j]));
  const nomesCurtos = construirNomesCurtos(todosJogadores);

  function nomeExibicao(l: LinhaEstat): string {
    if (nomesCurtos.has(l.jogador_id)) return nomesCurtos.get(l.jogador_id)!;
    const j = jogById.get(l.jogador_id);
    return j?.apelido || j?.nome_completo || l.apelido || "Jogador sem nome";
  }

  // ordenado por valor desc
  const ordenado = [...linhas].sort((a, b) => b.valor - a.valor);

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      {/* Header da tabela */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white/3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <p className="font-black text-base">{titulo}</p>
            <p className="text-xs text-muted-foreground">Acumulado {ANO}</p>
          </div>
        </div>
        <button
          onClick={() => salvar.mutate(linhas)}
          disabled={salvar.isPending}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: cor, color: "#111" }}
        >
          {salvar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </button>
      </div>

      {/* Adicionar jogador */}
      <div className="flex gap-2 items-center px-4 py-3 border-b border-white/10 bg-white/2">
        <select
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50 text-foreground [&>option]:bg-slate-900 [&>option]:text-white"
          value={jogSelecionado}
          onChange={(e) => setJogSelecionado(e.target.value)}
        >
          <option value="">+ Adicionar jogador</option>
          {disponiveis.map((j) => (
            <option key={j.id} value={j.id} style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
              {nomesCurtos.get(j.id) ?? (j.apelido || j.nome_completo || "Jogador sem nome")}
            </option>
          ))}
        </select>
        <button
          onClick={adicionar}
          disabled={!jogSelecionado}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 transition disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
      ) : ordenado.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum jogador adicionado.</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-white/5">
              <th className="px-4 py-2 text-left w-8">#</th>
              <th className="px-4 py-2 text-left">Jogador</th>
              <th className="px-4 py-2 text-center w-36">{emoji} Total</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {ordenado.map((l, i) => (
              <tr key={l.jogador_id} className="border-t border-white/5 hover:bg-white/3 transition">
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs font-black ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {i + 1}º
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold">{nomeExibicao(l)}</td>
                <td className="px-4 py-3">
                  <NumBtn value={l.valor} onChange={(v) => updateValor(l.jogador_id, v)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => remover(l.jogador_id)} className="rounded-lg p-1 text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Tabela de cartões (amarelos + vermelhos) ─────────────────────────────────

function TabelaCartoes({
  todosJogadores,
}: {
  todosJogadores: { id: string; nome_completo: string; apelido: string }[];
}) {
  const { data: salvas = [], isLoading } = useCartoes();
  const salvar = useSalvarCartoes();
  const [linhas, setLinhas] = useState<LinhaCartao[]>([]);
  const [inicializado, setInicializado] = useState(false);
  const [jogSelecionado, setJogSelecionado] = useState("");

  useEffect(() => {
    if (!isLoading && !inicializado) {
      setLinhas(salvas);
      setInicializado(true);
    }
  }, [salvas, isLoading, inicializado]);

  const disponiveis = todosJogadores.filter(
    (j) => !linhas.find((l) => l.jogador_id === j.id)
  );

  function adicionar() {
    const jog = todosJogadores.find((j) => j.id === jogSelecionado);
    if (!jog) return;
    setLinhas((prev) => [...prev, {
      jogador_id: jog.id,
      apelido: jog.apelido || jog.nome_completo,
      amarelos: 0,
      vermelhos: 0,
    }]);
    setJogSelecionado("");
  }

  function remover(id: string) {
    setLinhas((prev) => prev.filter((l) => l.jogador_id !== id));
  }

  function updateAmarelos(id: string, v: number) {
    setLinhas((prev) => prev.map((l) => l.jogador_id === id ? { ...l, amarelos: v } : l));
  }

  function updateVermelhos(id: string, v: number) {
    setLinhas((prev) => prev.map((l) => l.jogador_id === id ? { ...l, vermelhos: v } : l));
  }

  const jogById = new Map(todosJogadores.map((j) => [j.id, j]));
  const nomesCurtos = construirNomesCurtos(todosJogadores);

  function nomeExibicao(l: LinhaCartao): string {
    if (nomesCurtos.has(l.jogador_id)) return nomesCurtos.get(l.jogador_id)!;
    const j = jogById.get(l.jogador_id);
    return j?.apelido || j?.nome_completo || l.apelido || "Jogador sem nome";
  }

  // ordenado por total de cartões desc (vermelho pesa mais)
  const ordenado = [...linhas].sort((a, b) => (b.vermelhos * 3 + b.amarelos) - (a.vermelhos * 3 + a.amarelos));

  return (
    <div className="rounded-2xl border border-white/10 overflow-hidden">
      {/* Header da tabela */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 bg-white/3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xl">🟨</span>
          <div>
            <p className="font-black text-base">Cartões</p>
            <p className="text-xs text-muted-foreground">Acumulado {ANO}</p>
          </div>
        </div>
        <button
          onClick={() => salvar.mutate(linhas)}
          disabled={salvar.isPending}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition hover:opacity-90 disabled:opacity-50"
          style={{ background: "#f59e0b", color: "#111" }}
        >
          {salvar.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Salvar
        </button>
      </div>

      {/* Adicionar jogador */}
      <div className="flex gap-2 items-center px-4 py-3 border-b border-white/10 bg-white/2">
        <select
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50 text-foreground [&>option]:bg-slate-900 [&>option]:text-white"
          value={jogSelecionado}
          onChange={(e) => setJogSelecionado(e.target.value)}
        >
          <option value="">+ Adicionar jogador</option>
          {disponiveis.map((j) => (
            <option key={j.id} value={j.id} style={{ backgroundColor: "#0f172a", color: "#ffffff" }}>
              {nomesCurtos.get(j.id) ?? (j.apelido || j.nome_completo || "Jogador sem nome")}
            </option>
          ))}
        </select>
        <button
          onClick={adicionar}
          disabled={!jogSelecionado}
          className="flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/15 transition disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-accent" /></div>
      ) : ordenado.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">Nenhum jogador adicionado.</div>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-white/5">
              <th className="px-4 py-2 text-left w-8">#</th>
              <th className="px-4 py-2 text-left">Jogador</th>
              <th className="px-4 py-2 text-center w-36">🟨 Amarelos</th>
              <th className="px-4 py-2 text-center w-36">🟥 Vermelhos</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {ordenado.map((l, i) => (
              <tr key={l.jogador_id} className="border-t border-white/5 hover:bg-white/3 transition">
                <td className="px-4 py-3 text-center">
                  <span className="text-xs font-black text-muted-foreground">{i + 1}º</span>
                </td>
                <td className="px-4 py-3 font-semibold">{nomeExibicao(l)}</td>
                <td className="px-4 py-3">
                  <NumBtn value={l.amarelos} onChange={(v) => updateAmarelos(l.jogador_id, v)} />
                </td>
                <td className="px-4 py-3">
                  <NumBtn value={l.vermelhos} onChange={(v) => updateVermelhos(l.jogador_id, v)} />
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => remover(l.jogador_id)} className="rounded-lg p-1 text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminEstatisticas() {
  const { data: todosJogadores = [] } = useJogadoresClube();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" /> Estatísticas — Acumulado {ANO}
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rankings independentes por jogador. Adicione os jogadores e atualize os totais quando quiser.
        </p>
      </div>

      {/* Três tabelas lado a lado */}
      <div className="grid gap-6 lg:grid-cols-3">
        <TabelaRanking
          titulo="Artilharia"
          emoji="⚽"
          cor="#f59e0b"
          chave={CHAVE_GOLS}
          todosJogadores={todosJogadores}
        />
        <TabelaRanking
          titulo="Assistências"
          emoji="🎯"
          cor="#60a5fa"
          chave={CHAVE_ASSIST}
          todosJogadores={todosJogadores}
        />
        <TabelaCartoes todosJogadores={todosJogadores} />
      </div>
    </div>
  );
}
