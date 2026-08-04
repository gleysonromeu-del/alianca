import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Loader2, Shirt, Apple, Droplet, CheckCircle2, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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

function PopupAgasalho() {
  const qc = useQueryClient();
  const { data: ativaConfig } = useConfig("campanha_agasalho_ativa");
  const { data: tituloConfig } = useConfig("campanha_agasalho_titulo");
  const { data: subtituloConfig } = useConfig("campanha_agasalho_subtitulo");
  const { data: detalhesConfig } = useConfig("campanha_agasalho_detalhes");
  const salvarConfig = useSalvarConfig();

  const [ativa, setAtiva] = useState(false);
  const [titulo, setTitulo] = useState("CAMPANHA DO AGASALHO 2026");
  const [subtitulo, setSubtitulo] = useState("Aliança aquecendo quem precisa!");
  const [detalhes, setDetalhes] = useState(
    "Ajude o Aliança a aquecer quem precisa! Doe agasalhos! Disponibilizaremos caixas para o recebimento das doações próximo à churrasqueira, durante o inverno."
  );
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (ativaConfig !== undefined) setAtiva(ativaConfig === "true"); }, [ativaConfig]);
  useEffect(() => { if (tituloConfig) setTitulo(tituloConfig); }, [tituloConfig]);
  useEffect(() => { if (subtituloConfig) setSubtitulo(subtituloConfig); }, [subtituloConfig]);
  useEffect(() => { if (detalhesConfig) setDetalhes(detalhesConfig); }, [detalhesConfig]);

  async function handleSalvar() {
    setSalvando(true);
    try {
      await Promise.all([
        salvarConfig.mutateAsync({ chave: "campanha_agasalho_ativa", valor: ativa ? "true" : "false" }),
        salvarConfig.mutateAsync({ chave: "campanha_agasalho_titulo", valor: titulo }),
        salvarConfig.mutateAsync({ chave: "campanha_agasalho_subtitulo", valor: subtitulo }),
        salvarConfig.mutateAsync({ chave: "campanha_agasalho_detalhes", valor: detalhes }),
      ]);
      ["campanha_agasalho_ativa", "campanha_agasalho_titulo", "campanha_agasalho_subtitulo", "campanha_agasalho_detalhes"].forEach((k) => {
        qc.invalidateQueries({ queryKey: ["config", k] });
        qc.invalidateQueries({ queryKey: ["config-public", k] });
      });
      toast.success("Pop-up da campanha atualizado!");
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400/20 text-amber-400">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base">Pop-up da campanha (home)</h3>
            <p className="text-xs text-muted-foreground">
              Aparece uma vez por visita para quem entra no site.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">{ativa ? "Ativo" : "Inativo"}</span>
          <Switch checked={ativa} onCheckedChange={setAtiva} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agasalho-titulo">Título (destaque)</Label>
        <Input
          id="agasalho-titulo"
          value={titulo}
          maxLength={80}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: CAMPANHA DO AGASALHO 2026"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agasalho-subtitulo">Texto de apoio</Label>
        <Textarea
          id="agasalho-subtitulo"
          value={subtitulo}
          maxLength={160}
          rows={2}
          onChange={(e) => setSubtitulo(e.target.value)}
          placeholder="Ex: Aliança aquecendo quem precisa!"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="agasalho-detalhes">Chamada para ação (caixa em destaque)</Label>
        <Textarea
          id="agasalho-detalhes"
          value={detalhes}
          maxLength={300}
          rows={3}
          onChange={(e) => setDetalhes(e.target.value)}
          placeholder="Ex: Ajude o Aliança a aquecer quem precisa! Doe agasalhos! Disponibilizaremos caixas para o recebimento das doações próximo à churrasqueira, durante o inverno."
        />
      </div>

      <Button onClick={handleSalvar} disabled={salvando} className="w-full">
        {salvando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
        Salvar pop-up
      </Button>
    </div>
  );
}

export function AdminCampanhas() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Campanhas — Aliança Solidário</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Envie as fotos que vão aparecer nos cards circulares da seção "Aliança Solidário" no site.
        </p>
      </div>

      <PopupAgasalho />

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
    </div>
  );
}
