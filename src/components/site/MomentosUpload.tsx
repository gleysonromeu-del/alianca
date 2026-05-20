import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Tipo = "foto" | "video" | "texto";

type Props = { userId: string; autorNome: string };

type Momento = {
  id: string;
  tipo: Tipo;
  midia_url: string | null;
  legenda: string | null;
  aprovado: boolean | null;
  criado_em: string;
};

async function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(v.duration);
    };
    v.onerror = () => reject(new Error("Não foi possível ler o vídeo"));
    v.src = url;
  });
}

export function MomentosUpload({ userId, autorNome }: Props) {
  const [tipo, setTipo] = useState<Tipo>("foto");
  const [file, setFile] = useState<File | null>(null);
  const [legenda, setLegenda] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [meus, setMeus] = useState<Momento[]>([]);

  async function refresh() {
    const { data } = await supabase
      .from("momentos")
      .select("id, tipo, midia_url, legenda, aprovado, criado_em")
      .eq("autor_id", userId)
      .order("criado_em", { ascending: false })
      .limit(8);
    setMeus((data as Momento[]) ?? []);
  }

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [userId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      let midia_url: string | null = null;

      if (tipo !== "texto") {
        if (!file) throw new Error("Selecione um arquivo");
        if (tipo === "video") {
          const dur = await getVideoDuration(file);
          if (dur > 20.5) throw new Error("O vídeo precisa ter no máximo 20 segundos");
        }
        const ext = file.name.split(".").pop() || "bin";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("momentos").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        midia_url = supabase.storage.from("momentos").getPublicUrl(path).data.publicUrl;
      } else if (!legenda.trim()) {
        throw new Error("Escreva uma mensagem");
      }

      const { error: insErr } = await supabase.from("momentos").insert({
        autor_id: userId,
        autor_nome: autorNome,
        tipo,
        midia_url,
        legenda: legenda || null,
        aprovado: true,
      });
      if (insErr) throw insErr;

      setMsg("Momento publicado!");
      setFile(null);
      setLegenda("");
      const input = document.getElementById("momento-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
    } catch (err: any) {
      setMsg(err.message ?? "Erro ao publicar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 mb-8">
      <h2 className="text-xl font-bold text-foreground mb-1">Compartilhar um momento Aliança</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Envie foto, vídeo (até 20s) ou mensagem. Aparecerá no carrossel da página inicial.
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value as Tipo); setFile(null); }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="foto">Foto</option>
            <option value="video">Vídeo (até 20s)</option>
            <option value="texto">Mensagem / Resenha</option>
          </select>
        </div>
        {tipo !== "texto" && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="momento-file">Arquivo *</Label>
            <Input
              id="momento-file"
              type="file"
              accept={tipo === "foto" ? "image/*" : "video/*"}
              required
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        )}
        <div className="space-y-2 md:col-span-3">
          <Label>{tipo === "texto" ? "Mensagem *" : "Legenda (opcional)"}</Label>
          <Textarea
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            maxLength={280}
            placeholder={tipo === "texto" ? "Ex: Que vitória inesquecível!" : "Conte rapidinho o momento..."}
          />
        </div>
        <div className="md:col-span-3">
          <Button type="submit" disabled={sending}>{sending ? "Enviando..." : "Publicar momento"}</Button>
          {msg && <span className="ml-3 text-sm text-muted-foreground">{msg}</span>}
        </div>
      </form>

      {meus.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-sm font-semibold text-foreground mb-2">Meus momentos</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {meus.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/10 bg-background/40 p-2 text-xs">
                <p className="capitalize text-muted-foreground">{m.tipo}</p>
                <p className="truncate text-foreground">{m.legenda ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
