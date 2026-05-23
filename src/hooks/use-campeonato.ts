import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CampeonatoStatus = "aberto" | "encerrado";
export type PartidaStatus = "agendada" | "finalizada";
export type HistoricoTipo = "campeao" | "pagador_cerveja";

export interface Campeonato {
  id: string;
  mes: string;
  nome: string | null;
  status: CampeonatoStatus;
  campeao_time_id: string | null;
  pagador_cerveja_time_id: string | null;
  created_at: string;
}


export interface Time {
  id: string;
  campeonato_id: string;
  nome: string;
  escudo_url: string | null;
  cor: string | null;
  capitao_id: string | null;
  pontos: number;
  vitorias: number;
  empates: number;
  derrotas: number;
  gols_pro: number;
  gols_contra: number;
  permanece: boolean;
  created_at: string;
}

export interface Partida {
  id: string;
  campeonato_id: string;
  time_a_id: string;
  time_b_id: string;
  data: string | null;
  gols_a: number;
  gols_b: number;
  status: PartidaStatus;
  observacoes: string | null;
  created_at: string;
  time_a?: Time;
  time_b?: Time;
}

export interface EstatisticaPartida {
  id: string;
  partida_id: string;
  jogador_id: string;
  time_id: string;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
  presente: boolean;
}

export interface HistoricoCampeao {
  id: string;
  campeonato_id: string;
  time_id: string | null;
  mes: string;
  tipo: HistoricoTipo;
  nome_time_snapshot: string | null;
  jogadores_snapshot: Array<{ id: string; apelido: string; nome: string }> | null;
  created_at: string;
}

export interface TimeJogador {
  id: string;
  time_id: string;
  jogador_id: string;
  campeonato_id: string;
  jogador?: { id: string; nome_completo: string; apelido: string; foto_url: string | null };
}

export interface CreatePartidaInput {
  campeonato_id: string;
  time_a_id: string;
  time_b_id: string;
  data?: string | null;
  observacoes?: string | null;
}

export interface FinalizarPartidaInput {
  partida_id: string;
  gols_a: number;
  gols_b: number;
  observacoes?: string | null;
}

export interface CreateTimeInput {
  campeonato_id: string;
  nome: string;
  cor?: string;
  escudo_url?: string | null;
  capitao_id?: string | null;
  jogador_ids?: string[];
}

export function formatMes(mes?: string | null): string {
  if (!mes) return "—";
  const [year, month] = mes.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}

export function saldoGols(time: Time) {
  return time.gols_pro - time.gols_contra;
}

export function useCampeonatoAtual() {
  return useQuery({
    queryKey: ["campeonato", "atual"],
    queryFn: async (): Promise<Campeonato | null> => {
      const mesAtual = new Date();
      mesAtual.setDate(1);
      const mesISO = mesAtual.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .select("*")
        .eq("status", "aberto")
        .lte("mes", mesISO)
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUltimoEncerrado() {
  return useQuery({
    queryKey: ["campeonato", "ultimo-encerrado"],
    queryFn: async (): Promise<Campeonato | null> => {
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .select("*")
        .eq("status", "encerrado")
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useTodosCampeonatos() {
  return useQuery({
    queryKey: ["campeonato", "todos"],
    queryFn: async (): Promise<Campeonato[]> => {
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .select("*")
        .order("mes", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTimes(campeonatoId?: string | null) {
  return useQuery({
    queryKey: ["times", campeonatoId],
    enabled: !!campeonatoId,
    queryFn: async (): Promise<Time[]> => {
      const { data, error } = await supabase
        .from("times")
        .select("*")
        .eq("campeonato_id", campeonatoId!)
        .order("pontos", { ascending: false })
        .order("gols_pro", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function usePartidas(campeonatoId?: string | null) {
  return useQuery({
    queryKey: ["partidas", campeonatoId],
    enabled: !!campeonatoId,
    queryFn: async (): Promise<Partida[]> => {
      const { data, error } = await supabase
        .from("partidas")
        .select(`
          *,
          time_a:times!partidas_time_a_id_fkey(*),
          time_b:times!partidas_time_b_id_fkey(*)
        `)
        .eq("campeonato_id", campeonatoId!)
        .order("data", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as unknown as Partida[]) ?? [];
    },
    staleTime: 1000 * 30,
  });
}

export function useHistoricoCampeoes() {
  return useQuery({
    queryKey: ["historico-campeoes"],
    queryFn: async (): Promise<HistoricoCampeao[]> => {
      const { data, error } = await supabase
        .from("historico_campeoes")
        .select("*")
        .eq("tipo", "campeao")
        .order("mes", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useTimeJogadores(timeId?: string | null) {
  return useQuery({
    queryKey: ["time-jogadores", timeId],
    enabled: !!timeId,
    queryFn: async (): Promise<TimeJogador[]> => {
      const { data, error } = await supabase
        .from("time_jogadores")
        .select(`*, jogador:jogadores(id, nome_completo, apelido, foto_url)`)
        .eq("time_id", timeId!);
      if (error) throw error;
      return (data as unknown as TimeJogador[]) ?? [];
    },
  });
}

export function useEstatisticasPartida(partidaId?: string | null) {
  return useQuery({
    queryKey: ["estatisticas-partida", partidaId],
    enabled: !!partidaId,
    queryFn: async (): Promise<EstatisticaPartida[]> => {
      const { data, error } = await supabase
        .from("estatisticas_partida")
        .select("*")
        .eq("partida_id", partidaId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCampeonatoRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("campeonato-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "times" }, () => {
        qc.invalidateQueries({ queryKey: ["times"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partidas" }, () => {
        qc.invalidateQueries({ queryKey: ["partidas"] });
        qc.invalidateQueries({ queryKey: ["times"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campeonato_mensal" }, () => {
        qc.invalidateQueries({ queryKey: ["campeonato"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

export function useCriarCampeonato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { mes: string; nome?: string | null } | string) => {
      const payload =
        typeof input === "string"
          ? { mes: input, status: "aberto" as const }
          : { mes: input.mes, nome: input.nome ?? null, status: "aberto" as const };
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campeonato"] });
      toast.success("Campeonato criado com sucesso!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export interface AtualizarCampeonatoInput {
  id: string;
  nome?: string | null;
  mes?: string;
  campeao_time_id?: string | null;
  pagador_cerveja_time_id?: string | null;
}

export function useAtualizarCampeonato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: AtualizarCampeonatoInput) => {
      const { error } = await supabase.from("campeonato_mensal").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campeonato"] });
      toast.success("Campeonato atualizado");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}


export function useJogadores() {
  return useQuery({
    queryKey: ["jogadores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogadores")
        .select("id, nome_completo, apelido, foto_url")
        .order("apelido", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCriarTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jogador_ids, ...timeData }: CreateTimeInput) => {
      const { data: time, error } = await supabase
        .from("times")
        .insert(timeData)
        .select()
        .single();
      if (error) throw error;
      if (jogador_ids?.length) {
        const rows = jogador_ids.map((jid) => ({
          time_id: time.id,
          jogador_id: jid,
          campeonato_id: timeData.campeonato_id,
        }));
        const { error: e2 } = await supabase.from("time_jogadores").insert(rows);
        if (e2) throw e2;
      }
      return time;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["times"] });
      qc.invalidateQueries({ queryKey: ["time-jogadores"] });
      toast.success("Time criado!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeletarTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("times").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["times"] });
      toast.success("Time removido");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useCriarPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePartidaInput) => {
      const { data, error } = await supabase.from("partidas").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partidas"] });
      toast.success("Partida criada");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useDeletarPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partidas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partidas"] });
      qc.invalidateQueries({ queryKey: ["times"] });
      toast.success("Partida removida");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useFinalizarPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ partida_id, gols_a, gols_b, observacoes }: FinalizarPartidaInput) => {
      const { error } = await supabase
        .from("partidas")
        .update({ gols_a, gols_b, status: "finalizada", observacoes: observacoes ?? null })
        .eq("id", partida_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partidas"] });
      qc.invalidateQueries({ queryKey: ["times"] });
      toast.success("Partida finalizada");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}

export function useEncerrarCampeonato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campeonato_id: string) => {
      const { error } = await supabase.rpc("encerrar_campeonato", { p_campeonato_id: campeonato_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campeonato"] });
      qc.invalidateQueries({ queryKey: ["historico-campeoes"] });
      toast.success("Campeonato encerrado!");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}
export type JogadorLite = { id: string; nome_completo: string; apelido: string; foto_url: string | null };

export interface RankingAnualRow {
  jogador_id: string;
  apelido: string;
  nome_completo: string;
  foto_url: string | null;
  gols: number;
  assistencias: number;
  amarelos: number;
  vermelhos: number;
  jogos: number;
}

export function useRankingAnual(ano: number = new Date().getFullYear()) {
  return useQuery({
    queryKey: ["ranking-anual", ano],
    queryFn: async (): Promise<RankingAnualRow[]> => {
      const { data, error } = await supabase.rpc("ranking_anual", { _ano: ano });
      if (error) throw error;
      return (data ?? []) as RankingAnualRow[];
    },
    staleTime: 1000 * 60,
  });
}

