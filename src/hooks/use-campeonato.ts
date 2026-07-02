import { useEffect } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Time = {
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
};

export type Campeonato = {
  id: string;
  mes: string;
  status: "aberto" | "encerrado";
  campeao_time_id: string | null;
  pagador_cerveja_time_id: string | null;
};

export type Partida = {
  id: string;
  campeonato_id: string;
  time_a_id: string;
  time_b_id: string;
  data: string | null;
  gols_a: number;
  gols_b: number;
  status: "agendada" | "finalizada";
  observacoes: string | null;
  time_a?: { nome: string; cor: string | null };
  time_b?: { nome: string; cor: string | null };
};

export type TimeJogador = {
  id: string;
  time_id: string;
  jogador_id: string;
  campeonato_id: string;
};

export type JogadorLite = {
  id: string;
  apelido: string;
  nome_completo: string;
  posicao: string | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCampeonatoAtual() {
  return useQuery({
    queryKey: ["campeonato-atual"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .select("*")
        .eq("status", "aberto")
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Campeonato | null;
    },
  });
}

export function useTodosCampeonatos() {
  return useQuery({
    queryKey: ["campeonatos-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .select("*")
        .order("mes", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campeonato[];
    },
  });
}

export function useUltimoEncerrado() {
  return useQuery({
    queryKey: ["campeonato-ultimo-encerrado"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .select("*")
        .eq("status", "encerrado")
        .order("mes", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Campeonato | null;
    },
  });
}

export function useTimes(campeonatoId: string | undefined) {
  return useQuery({
    queryKey: ["times", campeonatoId],
    enabled: !!campeonatoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("times")
        .select("*")
        .eq("campeonato_id", campeonatoId!)
        .order("pontos", { ascending: false });
      if (error) throw error;
      const arr = (data ?? []) as Time[];
      arr.sort(
        (a, b) =>
          b.pontos - a.pontos ||
          (b.gols_pro - b.gols_contra) - (a.gols_pro - a.gols_contra) ||
          b.gols_pro - a.gols_pro,
      );
      return arr;
    },
  });
}

export function useTimeJogadores(campeonatoId: string | undefined) {
  return useQuery({
    queryKey: ["time-jogadores", campeonatoId],
    enabled: !!campeonatoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("time_jogadores")
        .select("*")
        .eq("campeonato_id", campeonatoId!);
      if (error) throw error;
      return (data ?? []) as TimeJogador[];
    },
  });
}

export function usePartidas(campeonatoId: string | undefined) {
  return useQuery({
    queryKey: ["partidas", campeonatoId],
    enabled: !!campeonatoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partidas")
        .select(`
          *,
          time_a:times!partidas_time_a_id_fkey(nome, cor),
          time_b:times!partidas_time_b_id_fkey(nome, cor)
        `)
        .eq("campeonato_id", campeonatoId!)
        .order("data", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data ?? []) as Partida[];
    },
  });
}

export function useJogadores() {
  return useQuery({
    queryKey: ["jogadores-lite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jogadores")
        .select("id,apelido,nome_completo,posicao")
        .order("apelido", { ascending: true });
      if (error) throw error;
      return (data ?? []) as JogadorLite[];
    },
  });
}

export function useHistorico() {
  return useQuery({
    queryKey: ["historico-campeoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("historico_campeoes")
        .select("*")
        .order("mes", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        mes: string;
        tipo: "campeao" | "pagador_cerveja";
        nome_time_snapshot: string | null;
        jogadores_snapshot: Array<{ id: string; apelido: string; nome: string }> | null;
      }>;
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCriarCampeonato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (mes: string) => {
      const { data, error } = await supabase
        .from("campeonato_mensal")
        .insert({ mes, status: "aberto" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campeonato-atual"] });
      qc.invalidateQueries({ queryKey: ["campeonatos-todos"] });
    },
  });
}

export function useCriarTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campeonato_id,
      nome,
      cor,
      jogador_ids,
    }: {
      campeonato_id: string;
      nome: string;
      cor: string;
      jogador_ids: string[];
    }) => {
      // 1. Cria o time
      const { data: time, error } = await supabase
        .from("times")
        .insert({ campeonato_id, nome, cor })
        .select()
        .single();
      if (error) throw error;

      // 2. Vincula jogadores
      if (jogador_ids.length > 0) {
        const rows = jogador_ids.map((jogador_id) => ({
          time_id: time.id,
          jogador_id,
          campeonato_id,
        }));
        const { error: tjErr } = await supabase.from("time_jogadores").insert(rows);
        if (tjErr) throw tjErr;
      }

      return time;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["times", vars.campeonato_id] });
      qc.invalidateQueries({ queryKey: ["time-jogadores", vars.campeonato_id] });
    },
  });
}

export function useDeletarTime() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, campeonato_id }: { id: string; campeonato_id: string }) => {
      const { error } = await supabase.from("times").delete().eq("id", id);
      if (error) throw error;
      return campeonato_id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["times", vars.campeonato_id] });
      qc.invalidateQueries({ queryKey: ["time-jogadores", vars.campeonato_id] });
    },
  });
}

export function useCriarPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campeonato_id,
      time_a_id,
      time_b_id,
      data,
      observacoes,
    }: {
      campeonato_id: string;
      time_a_id: string;
      time_b_id: string;
      data: string | null;
      observacoes: string | null;
    }) => {
      const { data: partida, error } = await supabase
        .from("partidas")
        .insert({ campeonato_id, time_a_id, time_b_id, data, observacoes, status: "agendada" })
        .select()
        .single();
      if (error) throw error;
      return partida;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["partidas", vars.campeonato_id] });
    },
  });
}

export function useFinalizarPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      partida_id,
      gols_a,
      gols_b,
      observacoes,
    }: {
      partida_id: string;
      gols_a: number;
      gols_b: number;
      observacoes: string | null;
    }) => {
      const { data, error } = await supabase
        .from("partidas")
        .update({ gols_a, gols_b, observacoes, status: "finalizada" })
        .eq("id", partida_id)
        .select("campeonato_id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["partidas", data.campeonato_id] });
      qc.invalidateQueries({ queryKey: ["times", data.campeonato_id] });
    },
  });
}

export function useDeletarPartida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, campeonato_id }: { id: string; campeonato_id: string }) => {
      const { error } = await supabase.from("partidas").delete().eq("id", id);
      if (error) throw error;
      return campeonato_id;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["partidas", vars.campeonato_id] });
      qc.invalidateQueries({ queryKey: ["times", vars.campeonato_id] });
    },
  });
}

export function useEncerrarCampeonato() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (campeonatoId: string) => {
      // Busca times ordenados por pontos para determinar campeão e pagador
      const { data: times, error: tErr } = await supabase
        .from("times")
        .select("id, nome, pontos, vitorias, gols_pro, gols_contra")
        .eq("campeonato_id", campeonatoId)
        .order("pontos", { ascending: false });
      if (tErr) throw tErr;

      const campeao = times?.[0] ?? null;
      const pagador = times?.[times.length - 1] ?? null;

      const { error } = await supabase
        .from("campeonato_mensal")
        .update({
          status: "encerrado",
          campeao_time_id: campeao?.id ?? null,
          campeao_nome: campeao?.nome ?? null,
          pagador_cerveja_time_id: pagador?.id ?? null,
        })
        .eq("id", campeonatoId);
      if (error) throw error;

      // Registra histórico
      if (campeao) {
        await supabase.from("historico_campeoes").insert({
          campeonato_id: campeonatoId,
          time_id: campeao.id,
          mes: new Date().toISOString().slice(0, 10),
          tipo: "campeao",
          nome_time_snapshot: campeao.nome,
        });
      }
      if (pagador && pagador.id !== campeao?.id) {
        await supabase.from("historico_campeoes").insert({
          campeonato_id: campeonatoId,
          time_id: pagador.id,
          mes: new Date().toISOString().slice(0, 10),
          tipo: "pagador_cerveja",
          nome_time_snapshot: pagador.nome,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["campeonato-atual"] });
      qc.invalidateQueries({ queryKey: ["campeonatos-todos"] });
      qc.invalidateQueries({ queryKey: ["historico-campeoes"] });
    },
  });
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

export function useCampeonatoRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("campeonato-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "times" }, () => {
        qc.invalidateQueries({ queryKey: ["times"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "partidas" }, () => {
        qc.invalidateQueries({ queryKey: ["partidas"] });
        qc.invalidateQueries({ queryKey: ["times"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "time_jogadores" }, () => {
        qc.invalidateQueries({ queryKey: ["time-jogadores"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campeonato_mensal" }, () => {
        qc.invalidateQueries({ queryKey: ["campeonato-atual"] });
        qc.invalidateQueries({ queryKey: ["campeonato-ultimo-encerrado"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatMes(iso: string | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}