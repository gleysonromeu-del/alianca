import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EnqueteCategoria = "clube" | "festa" | "eleicao" | "acao" | "outro";
export type EnqueteStatus = "rascunho" | "ativa" | "encerrada";

export interface EnqueteOpcao {
  id: string;
  enquete_id: string;
  texto: string;
  imagem_url: string | null;
  ordem: number;
  rodada: number;
}

export interface Enquete {
  id: string;
  titulo: string;
  descricao: string | null;
  categoria: EnqueteCategoria;
  status: EnqueteStatus;
  encerra_em: string | null;
  criado_em: string;
}

export const CATEGORIA_LABEL: Record<EnqueteCategoria, string> = {
  clube: "Clube",
  festa: "Festa",
  eleicao: "Eleição",
  acao: "Ação social",
  outro: "Outro",
};

async function uploadImagemOpcao(file: File, enqueteId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `enquetes/${enqueteId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("campeonato-imagens").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("campeonato-imagens").getPublicUrl(path);
  return data.publicUrl;
}

async function buscarImagensPorRodada(enqueteIds: string[]) {
  if (!enqueteIds.length) return new Map<string, string>();
  const { data, error } = await supabase.from("enquete_rodada_imagens").select("*").in("enquete_id", enqueteIds);
  if (error) throw error;
  const mapa = new Map<string, string>();
  for (const row of data ?? []) mapa.set(`${row.enquete_id}:${row.rodada}`, row.imagem_url);
  return mapa;
}

export function useDefinirImagemRodada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enqueteId, rodada, imagemUrl }: { enqueteId: string; rodada: number; imagemUrl: string }) => {
      const { error } = await supabase
        .from("enquete_rodada_imagens")
        .upsert({ enquete_id: enqueteId, rodada, imagem_url: imagemUrl });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enquetes-admin"] });
      qc.invalidateQueries({ queryKey: ["enquetes-publicas"] });
    },
  });
}

// ─── Público: enquetes visíveis (ativas e encerradas) com opções ───
export function useEnquetesPublicas() {
  return useQuery({
    queryKey: ["enquetes-publicas"],
    queryFn: async () => {
      const { data: enquetes, error } = await supabase
        .from("enquetes")
        .select("*")
        .in("status", ["ativa", "encerrada"])
        .order("criado_em", { ascending: false });
      if (error) throw error;

      const { data: opcoes, error: errOp } = await supabase
        .from("enquete_opcoes")
        .select("*")
        .order("ordem", { ascending: true });
      if (errOp) throw errOp;

      const imagensPorRodada = await buscarImagensPorRodada((enquetes ?? []).map((e) => e.id));

      return (enquetes ?? []).map((e) => ({
        ...e,
        opcoes: (opcoes ?? []).filter((o) => o.enquete_id === e.id) as EnqueteOpcao[],
        imagensPorRodada,
      }));
    },
    staleTime: 1000 * 30,
  });
}

// ─── Resultado agregado (via função pública, nunca expõe votos individuais) ───
export function useResultadosEnquete(enqueteId: string | undefined) {
  return useQuery({
    queryKey: ["enquete-resultados", enqueteId],
    enabled: !!enqueteId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("obter_resultados_enquete", { _enquete_id: enqueteId });
      if (error) throw error;
      const totais: Record<string, number> = {};
      for (const row of data ?? []) totais[row.opcao_id] = Number(row.total_votos);
      return totais;
    },
    staleTime: 1000 * 15,
  });
}

// Agrupa as opções de uma enquete em rodadas (ex: rodada 0 = Azul, rodada 1 = Amarelo)
// imagensPorRodada é o mapa "enqueteId:rodada" -> url, vindo da consulta da enquete.
export function agruparPorRodada(opcoes: EnqueteOpcao[], imagensPorRodada?: Map<string, string>) {
  const porRodada = new Map<number, EnqueteOpcao[]>();
  for (const o of opcoes) {
    if (!porRodada.has(o.rodada)) porRodada.set(o.rodada, []);
    porRodada.get(o.rodada)!.push(o);
  }
  return [...porRodada.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([rodada, ops]) => ({
      rodada,
      opcoes: ops.sort((a, b) => a.ordem - b.ordem),
      imagemUrl: imagensPorRodada?.get(`${ops[0]?.enquete_id}:${rodada}`) ?? null,
    }));
}

// ─── Meus votos nessa enquete: um por rodada já respondida ───
export function useMeusVotosEnquete(enqueteId: string | undefined, logado: boolean) {
  return useQuery({
    queryKey: ["meus-votos-enquete", enqueteId],
    enabled: !!enqueteId && logado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("meus_votos_enquete", { _enquete_id: enqueteId });
      if (error) throw error;
      const porRodada: Record<number, string> = {};
      for (const row of (data ?? []) as { rodada: number; opcao_id: string }[]) porRodada[row.rodada] = row.opcao_id;
      return porRodada;
    },
  });
}

export function useVotarEnquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ enqueteId, opcaoId, jogadorId }: { enqueteId: string; opcaoId: string; jogadorId: string }) => {
      const { error } = await supabase.from("enquete_votos").insert({
        enquete_id: enqueteId,
        opcao_id: opcaoId,
        jogador_id: jogadorId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["enquete-resultados", vars.enqueteId] });
      qc.invalidateQueries({ queryKey: ["meus-votos-enquete", vars.enqueteId] });
    },
  });
}

// ─── Admin: CRUD completo ───
export function useEnquetesAdmin() {
  return useQuery({
    queryKey: ["enquetes-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("enquetes").select("*").order("criado_em", { ascending: false });
      if (error) throw error;

      const { data: opcoes, error: errOp } = await supabase
        .from("enquete_opcoes")
        .select("*")
        .order("ordem", { ascending: true });
      if (errOp) throw errOp;

      const imagensPorRodada = await buscarImagensPorRodada((data ?? []).map((e) => e.id));

      return (data ?? []).map((e) => ({
        ...e,
        opcoes: (opcoes ?? []).filter((o) => o.enquete_id === e.id) as EnqueteOpcao[],
        imagensPorRodada,
      }));
    },
  });
}

export function useCriarEnquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      titulo: string;
      descricao: string;
      categoria: EnqueteCategoria;
      opcoes: { texto: string; rodada: number }[];
      imagensPorRodada: Record<number, string>;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      const { data: enquete, error } = await supabase
        .from("enquetes")
        .insert({
          titulo: input.titulo,
          descricao: input.descricao || null,
          categoria: input.categoria,
          status: "rascunho",
          criado_por: user.user?.id,
        })
        .select()
        .single();
      if (error) throw error;

      const opcoesPayload = input.opcoes
        .filter((o) => o.texto.trim())
        .map((o, i) => ({ enquete_id: enquete.id, texto: o.texto.trim(), ordem: i, rodada: o.rodada }));

      const rodadasComOpcoes = new Set(opcoesPayload.map((o) => o.rodada));
      for (const r of rodadasComOpcoes) {
        if (opcoesPayload.filter((o) => o.rodada === r).length < 2) {
          throw new Error("Cada rodada precisa de pelo menos 2 opções.");
        }
      }
      if (opcoesPayload.length < 2) throw new Error("A enquete precisa de pelo menos 2 opções.");

      const { error: errOp } = await supabase.from("enquete_opcoes").insert(opcoesPayload);
      if (errOp) throw errOp;

      const imagensPayload = Object.entries(input.imagensPorRodada)
        .filter(([, url]) => !!url)
        .map(([rodada, url]) => ({ enquete_id: enquete.id, rodada: Number(rodada), imagem_url: url }));
      if (imagensPayload.length) {
        const { error: errImg } = await supabase.from("enquete_rodada_imagens").insert(imagensPayload);
        if (errImg) throw errImg;
      }

      return enquete;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["enquetes-admin"] }),
  });
}

export function useAtualizarStatusEnquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EnqueteStatus }) => {
      const { error } = await supabase
        .from("enquetes")
        .update({ status, atualizado_em: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enquetes-admin"] });
      qc.invalidateQueries({ queryKey: ["enquetes-publicas"] });
    },
  });
}

export function useExcluirEnquete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("enquetes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["enquetes-admin"] });
      qc.invalidateQueries({ queryKey: ["enquetes-publicas"] });
    },
  });
}

export { uploadImagemOpcao };
