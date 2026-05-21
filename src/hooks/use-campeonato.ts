import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
          b.gols_pro - b.gols_contra - (a.gols_pro - a.gols_contra) ||
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
        .select("*")
        .eq("campeonato_id", campeonatoId!)
        .order("data", { ascending: false, nullsFirst: false });
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

/** Realtime subscriptions on key tables — invalidates queries on changes */
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_jogadores" },
        () => qc.invalidateQueries({ queryKey: ["time-jogadores"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campeonato_mensal" },
        () => {
          qc.invalidateQueries({ queryKey: ["campeonato-atual"] });
          qc.invalidateQueries({ queryKey: ["campeonato-ultimo-encerrado"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);
}

export function formatMes(iso: string | undefined | null) {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}