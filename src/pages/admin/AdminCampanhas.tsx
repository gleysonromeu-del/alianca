import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Upload, Loader2, Shirt, Apple, Droplet, CheckCircle2,
  Vote, Plus, Trash2, ImagePlus, Play, Square, BarChart3, X,
} from "lucide-react";
import {
  useEnquetesAdmin,
  useCriarEnquete,
  useAtualizarStatusEnquete,
  useExcluirEnquete,
  useResultadosEnquete,
  useDefinirImagemRodada,
  uploadImagemOpcao,
  agruparPorRodada,
  CATEGORIA_LABEL,
  type EnqueteCategoria,
} from "@/hooks/use-enquetes";

async function uploadImagem(file: File, pasta: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${pasta}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("campeonato-imagens").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("campeonato-imagens").getPublicUrl(path);
  return data.publicUrl;
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

function useSalvarConfig() {
  return useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const { error } = await supabase.from("configuracoes").upsert({ chave, valor, atualizado_em: new Date().toISOString() });
      if (error) throw error;
    },
  });
}

function CampanhaCard({
  icone: Icone,
  titulo,
  configKey,
  pasta,
  cor,
}: {
  icone: React.ElementType;
  titulo: string;
  configKey: string;
  pasta: string;
  cor: string;
}) {
  const qc = useQueryClient();
  const { data: fotoConfig } = useConfig(configKey);
  const salvarConfig = useSalvarConfig();
  const [foto, setFoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { if (fotoConfig !== undefined) setFoto(fotoConfig); }, [fotoConfig]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImagem(file, pasta);
      setFoto(url);
      toast.success("Imagem enviada! Clique em salvar para confirmar.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar imagem");
    } finally {
      setUploading(false);
    }
  }

  async function handleSalvar() {
    setSalvando(true);
    try {
      await salvarConfig.mutateAsync({ chave: configKey, valor: foto ?? "" });
      qc.invalidateQueries({ queryKey: ["config", configKey] });
      qc.invalidateQueries({ queryKey: ["config-public", configKey] });
      toast.success("Foto da campanha salva!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${cor}22`, color: cor }}>
          <Icone className="h-5 w-5" />
        </div>
        <h3 className="font-bold text-base">{titulo}</h3>
      </div>

      <div className="flex items-center gap-4">
        {foto ? (
          <img src={foto} alt={titulo} className="h-24 w-24 rounded-full object-cover border-4" style={{ borderColor: `${cor}55` }} />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-white/15 bg-white/5">
            <Icone className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => ref.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/15 transition disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Enviando..." : "Enviar foto"}
          </button>
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-[11px] text-muted-foreground max-w-[180px]">
            Foto quadrada (ex: 600×600px). Aparece dentro do círculo no site.
          </p>
        </div>
      </div>

      <button
        onClick={handleSalvar}
        disabled={salvando}
        className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition disabled:opacity-50"
        style={{ background: `${cor}22`, color: cor }}
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Salvar foto da campanha
      </button>
    </div>
  );
}

// ─── Nova enquete: uma imagem única por rodada (mostra todas as opções) + opções em texto ───
type RodadaForm = { rodada: number; opcoesTexto: string[]; imagemUrl: string | null; uploading: boolean };

function NovaEnquete({ onCriada }: { onCriada: () => void }) {
  const criar = useCriarEnquete();
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<EnqueteCategoria>("clube");
  const [rodadas, setRodadas] = useState<RodadaForm[]>([
    { rodada: 0, opcoesTexto: ["", ""], imagemUrl: null, uploading: false },
  ]);
  const [salvando, setSalvando] = useState(false);
  const fileRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const [tempId] = useState(() => crypto.randomUUID());

  function addRodada() {
    const proxima = rodadas.length ? Math.max(...rodadas.map((r) => r.rodada)) + 1 : 0;
    setRodadas((r) => [...r, { rodada: proxima, opcoesTexto: ["", ""], imagemUrl: null, uploading: false }]);
  }

  function removerRodada(rodada: number) {
    if (rodadas.length <= 1) return;
    setRodadas((r) => r.filter((x) => x.rodada !== rodada));
  }

  function setOpcaoTexto(rodada: number, idx: number, texto: string) {
    setRodadas((rs) => rs.map((r) => (r.rodada !== rodada ? r : { ...r, opcoesTexto: r.opcoesTexto.map((t, i) => (i === idx ? texto : t)) })));
  }

  function addOpcaoTexto(rodada: number) {
    setRodadas((rs) => rs.map((r) => (r.rodada !== rodada || r.opcoesTexto.length >= 10 ? r : { ...r, opcoesTexto: [...r.opcoesTexto, ""] })));
  }

  function removerOpcaoTexto(rodada: number, idx: number) {
    setRodadas((rs) => rs.map((r) => (r.rodada !== rodada || r.opcoesTexto.length <= 2 ? r : { ...r, opcoesTexto: r.opcoesTexto.filter((_, i) => i !== idx) })));
  }

  async function handleUploadCapa(rodada: number, file: File) {
    setRodadas((rs) => rs.map((r) => (r.rodada === rodada ? { ...r, uploading: true } : r)));
    try {
      const url = await uploadImagemOpcao(file, tempId);
      setRodadas((rs) => rs.map((r) => (r.rodada === rodada ? { ...r, imagemUrl: url, uploading: false } : r)));
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao enviar imagem");
      setRodadas((rs) => rs.map((r) => (r.rodada === rodada ? { ...r, uploading: false } : r)));
    }
  }

  async function handleCriar() {
    if (!titulo.trim()) return toast.error("Dê um título para a enquete.");

    const opcoesPayload: { texto: string; rodada: number }[] = [];
    const imagensPorRodada: Record<number, string> = {};
    for (const r of rodadas) {
      const textos = r.opcoesTexto.filter((t) => t.trim());
      if (textos.length < 2) return toast.error("Cada rodada precisa de pelo menos 2 opções com texto.");
      for (const t of textos) opcoesPayload.push({ texto: t, rodada: r.rodada });
      if (r.imagemUrl) imagensPorRodada[r.rodada] = r.imagemUrl;
    }

    setSalvando(true);
    try {
      await criar.mutateAsync({ titulo: titulo.trim(), descricao, categoria, opcoes: opcoesPayload, imagensPorRodada });
      toast.success("Enquete criada como rascunho. Ative-a quando quiser abrir a votação.");
      setTitulo("");
      setDescricao("");
      setCategoria("clube");
      setRodadas([{ rodada: 0, opcoesTexto: ["", ""], imagemUrl: null, uploading: false }]);
      onCriada();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao criar enquete");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Vote className="h-5 w-5 text-accent" />
        <h3 className="font-bold text-base">Nova enquete</h3>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Cada rodada tem UMA imagem única mostrando todas as opções (ex: a arte com os uniformes numerados de 1 a 9).
        Liste os nomes/números das opções em texto — o jogador vê a imagem inteira e escolhe pelo nome.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Título</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Escolha do novo uniforme"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Categoria</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as EnqueteCategoria)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
          >
            {Object.entries(CATEGORIA_LABEL).map(([v, label]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Descrição (opcional)</label>
        <textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          rows={2}
          placeholder="Explique do que se trata a enquete"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm resize-none"
        />
      </div>

      <div className="space-y-4">
        {rodadas.map((r, ri) => (
          <div key={r.rodada} className="rounded-xl border border-white/10 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-accent">Rodada {ri + 1}</span>
              {rodadas.length > 1 && (
                <button type="button" onClick={() => removerRodada(r.rodada)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">Imagem única desta rodada (com todas as opções visíveis)</label>
              <button
                type="button"
                onClick={() => fileRefs.current[r.rodada]?.click()}
                className="relative flex h-28 w-full items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5 overflow-hidden"
              >
                {r.uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : r.imagemUrl ? (
                  <img src={r.imagemUrl} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-muted-foreground">
                    <ImagePlus className="h-5 w-5" />
                    <span className="text-xs">Enviar imagem</span>
                  </span>
                )}
              </button>
              <input
                ref={(el) => (fileRefs.current[r.rodada] = el)}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadCapa(r.rodada, f); }}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-muted-foreground">Opções (nomes/números, conforme aparecem na imagem)</label>
              {r.opcoesTexto.map((texto, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    value={texto}
                    onChange={(e) => setOpcaoTexto(r.rodada, idx, e.target.value)}
                    placeholder="Ex: Azul 1"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
                  />
                  {r.opcoesTexto.length > 2 && (
                    <button type="button" onClick={() => removerOpcaoTexto(r.rodada, idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              {r.opcoesTexto.length < 10 && (
                <button type="button" onClick={() => addOpcaoTexto(r.rodada)} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
                  <Plus className="h-3.5 w-3.5" /> Adicionar opção
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" onClick={addRodada} className="flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          <Plus className="h-3.5 w-3.5" /> Adicionar rodada
        </button>
      </div>

      <button
        onClick={handleCriar}
        disabled={salvando}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent/20 py-2.5 text-sm font-bold text-accent transition disabled:opacity-50"
      >
        {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Criar enquete (como rascunho)
      </button>
    </div>
  );
}

function EnqueteResultadoBarra({ enqueteId, opcoes }: { enqueteId: string; opcoes: { id: string; texto: string }[] }) {
  const { data: totais } = useResultadosEnquete(enqueteId);
  const soma = Object.values(totais ?? {}).reduce((a, b) => a + b, 0);

  return (
    <div className="mt-3 space-y-2">
      {opcoes.map((o) => {
        const votos = totais?.[o.id] ?? 0;
        const pct = soma > 0 ? Math.round((votos / soma) * 100) : 0;
        return (
          <div key={o.id} className="text-xs">
            <div className="flex justify-between mb-1">
              <span className="text-foreground/80">{o.texto}</span>
              <span className="font-semibold text-muted-foreground">{votos} voto(s) · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      {soma === 0 && <p className="text-xs text-muted-foreground">Ainda sem votos.</p>}
    </div>
  );
}

function ListaEnquetes() {
  const { data: enquetes, isLoading, refetch } = useEnquetesAdmin();
  const atualizarStatus = useAtualizarStatusEnquete();
  const excluir = useExcluirEnquete();

  async function toggleStatus(id: string, atual: string) {
    const novo = atual === "ativa" ? "encerrada" : "ativa";
    try {
      await atualizarStatus.mutateAsync({ id, status: novo as any });
      toast.success(novo === "ativa" ? "Enquete ativada — jogadores já podem votar!" : "Enquete encerrada.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao atualizar status");
    }
  }

  async function handleExcluir(id: string) {
    if (!confirm("Excluir esta enquete e todos os votos? Essa ação não pode ser desfeita.")) return;
    try {
      await excluir.mutateAsync(id);
      toast.success("Enquete excluída.");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao excluir");
    }
  }

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando enquetes...</p>;
  if (!enquetes?.length) return <p className="text-sm text-muted-foreground">Nenhuma enquete criada ainda.</p>;

  return (
    <div className="space-y-3">
      {enquetes.map((e) => (
        <div key={e.id} className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-sm">{e.titulo}</h4>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                  {CATEGORIA_LABEL[e.categoria]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    e.status === "ativa"
                      ? "bg-green-500/20 text-green-300"
                      : e.status === "encerrada"
                      ? "bg-white/10 text-muted-foreground"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {e.status}
                </span>
              </div>
              {e.descricao && <p className="mt-1 text-xs text-muted-foreground max-w-md">{e.descricao}</p>}
            </div>
            <div className="flex items-center gap-2">
              {e.status !== "encerrada" && (
                <button
                  onClick={() => toggleStatus(e.id, e.status)}
                  className="flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15"
                >
                  {e.status === "ativa" ? <Square className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {e.status === "ativa" ? "Encerrar" : "Ativar"}
                </button>
              )}
              <button
                onClick={() => handleExcluir(e.id)}
                className="rounded-lg bg-white/10 p-1.5 text-muted-foreground hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
            <BarChart3 className="h-3 w-3" /> Resultados em tempo real
          </div>
          <EnqueteResultadoBarra enqueteId={e.id} opcoes={e.opcoes} />
        </div>
      ))}
    </div>
  );
}

function AdminEnquetes() {
  const { refetch } = useEnquetesAdmin();
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold flex items-center gap-2"><Vote className="h-5 w-5 text-accent" /> Enquetes</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Crie enquetes com imagens (ex: escolha do novo uniforme, festas, eleições, ações do clube).
          Só jogadores cadastrados, aprovados e logados podem votar — um voto por jogador.
        </p>
      </div>
      <NovaEnquete onCriada={() => refetch()} />
      <ListaEnquetes />
    </div>
  );
}

export function AdminCampanhas() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold">Campanhas — Aliança Solidário</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Envie as fotos que vão aparecer nos cards circulares da seção "Aliança Solidário" no site.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CampanhaCard
          icone={Shirt}
          titulo="Aliança Sem Frio"
          configKey="campanha_sem_frio_foto"
          pasta="campanhas/sem-frio"
          cor="#f59e0b"
        />
        <CampanhaCard
          icone={Apple}
          titulo="Aliança Sem Fome"
          configKey="campanha_sem_fome_foto"
          pasta="campanhas/sem-fome"
          cor="#22c55e"
        />
        <CampanhaCard
          icone={Droplet}
          titulo="Aliança Dando o Sangue"
          configKey="campanha_sangue_foto"
          pasta="campanhas/sangue"
          cor="#ef4444"
        />
      </div>

      <div className="border-t border-white/10 pt-6">
        <AdminEnquetes />
      </div>
    </div>
  );
}
