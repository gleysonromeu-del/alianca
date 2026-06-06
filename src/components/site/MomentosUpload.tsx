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

// ─── Magic bytes permitidos ────────────────────────────────────────────────────
// Valida o tipo real do arquivo lendo os primeiros bytes — não confia apenas
// na extensão ou no atributo accept="" do input, que podem ser bypassados.
const ALLOWED_IMAGE_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/png",  bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: "image/gif",  bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 }, // RIFF....WEBP
];

const ALLOWED_VIDEO_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "video/mp4",  bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // ftyp box
  { mime: "video/mp4",  bytes: [0x00, 0x00, 0x00, 0x18], offset: 0 }, // mp4 variant
  { mime: "video/mp4",  bytes: [0x00, 0x00, 0x00, 0x20], offset: 0 }, // mp4 variant
  { mime: "video/quicktime", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

async function validateMagicBytes(
  file: File,
  signatures: typeof ALLOWED_IMAGE_SIGNATURES
): Promise<boolean> {
  // Lê os primeiros 12 bytes do arquivo
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  return signatures.some(({ bytes: sig, offset = 0 }) =>
    sig.every((b, i) => bytes[offset + i] === b)
  );
}

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

// Tamanho máximo: 10 MB para fotos, 50 MB para vídeos
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export function MomentosUpload({ userId, autorNome }: Props) {
  const [tipo, setTipo] = useState<Tipo>("foto");
  const [file, setFile] = useState<File | null>(null);
  const [legenda, setLegenda] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"ok" | "err">("ok");
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

  function showMsg(text: string, type: "ok" | "err") {
    setMsg(text);
    setMsgType(type);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setMsg(null);
    try {
      let midia_url: string | null = null;

      if (tipo !== "texto") {
        if (!file) throw new Error("Selecione um arquivo");

        // ── Validação de tamanho ────────────────────────────────────────────
        const maxSize = tipo === "foto" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
        if (file.size > maxSize) {
          const mb = Math.round(maxSize / 1024 / 1024);
          throw new Error(`Arquivo muito grande. Máximo permitido: ${mb} MB`);
        }

        // ── Validação de magic bytes (tipo real do arquivo) ─────────────────
        const validSignatures = tipo === "foto"
          ? ALLOWED_IMAGE_SIGNATURES
          : ALLOWED_VIDEO_SIGNATURES;

        const isValidType = await validateMagicBytes(file, validSignatures);
        if (!isValidType) {
          throw new Error(
            tipo === "foto"
              ? "Arquivo inválido. Envie uma imagem JPEG, PNG, GIF ou WebP."
              : "Arquivo inválido. Envie um vídeo MP4."
          );
        }

        // ── Validação de duração (vídeo) ────────────────────────────────────
        if (tipo === "video") {
          const dur = await getVideoDuration(file);
          if (dur > 20.5) throw new Error("O vídeo precisa ter no máximo 20 segundos");
        }

        // ── Extensão segura baseada no magic byte, não no nome do arquivo ───
        const extMap: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png":  "png",
          "image/gif":  "gif",
          "image/webp": "webp",
          "video/mp4":  "mp4",
          "video/quicktime": "mp4",
        };
        // Re-detecta o mime pelo magic para gerar a extensão correta
        const detectedMime = [...ALLOWED_IMAGE_SIGNATURES, ...ALLOWED_VIDEO_SIGNATURES]
          .find(async (sig) => await validateMagicBytes(file, [sig]))?.mime
          ?? (tipo === "foto" ? "image/jpeg" : "video/mp4");
        const ext = extMap[detectedMime] ?? (tipo === "foto" ? "jpg" : "mp4");

        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("momentos")
          .upload(path, file, {
            upsert: false,
            contentType: detectedMime,
          });
        if (upErr) throw upErr;
        midia_url = supabase.storage.from("momentos").getPublicUrl(path).data.publicUrl;

      } else if (!legenda.trim()) {
        throw new Error("Escreva uma mensagem");
      }

      // ── Legenda: trim e limite de segurança ─────────────────────────────
      const legendaSanitizada = legenda.trim().slice(0, 280) || null;

      const { error: insErr } = await supabase.from("momentos").insert({
        autor_id: userId,
        autor_nome: autorNome,
        tipo,
        midia_url,
        legenda: legendaSanitizada,
        aprovado: false, // aguarda moderação admin antes de aparecer publicamente
      });
      if (insErr) throw insErr;

      showMsg("Momento enviado! Aparecerá após aprovação da diretoria.", "ok");
      setFile(null);
      setLegenda("");
      const input = document.getElementById("momento-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await refresh();
    } catch (err: any) {
      showMsg(err.message ?? "Erro ao publicar", "err");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 mb-8">
      <h2 className="text-xl font-bold text-foreground mb-1">Compartilhar um momento Aliança</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Envie foto (JPEG/PNG/WebP), vídeo MP4 (até 20s) ou mensagem. Aparecerá no carrossel após aprovação.
      </p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <select
            value={tipo}
            onChange={(e) => { setTipo(e.target.value as Tipo); setFile(null); setMsg(null); }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
          >
            <option value="foto">Foto</option>
            <option value="video">Vídeo (até 20s)</option>
            <option value="texto">Mensagem / Resenha</option>
          </select>
        </div>
        {tipo !== "texto" && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="momento-file">
              Arquivo * {tipo === "foto" ? "(JPEG, PNG, GIF ou WebP · máx. 10 MB)" : "(MP4 · máx. 50 MB · até 20s)"}
            </Label>
            <Input
              id="momento-file"
              type="file"
              accept={tipo === "foto" ? "image/jpeg,image/png,image/gif,image/webp" : "video/mp4,video/quicktime"}
              required
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setMsg(null); }}
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
          <div className="text-right text-xs text-muted-foreground">{legenda.length}/280</div>
        </div>
        <div className="md:col-span-3 flex items-center gap-3">
          <Button type="submit" disabled={sending}>
            {sending ? "Enviando..." : "Enviar momento"}
          </Button>
          {msg && (
            <span className={`text-sm ${msgType === "err" ? "text-destructive" : "text-muted-foreground"}`}>
              {msg}
            </span>
          )}
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
                <p className={`text-[10px] mt-1 ${m.aprovado ? "text-green-400" : "text-amber-400"}`}>
                  {m.aprovado ? "Publicado" : "Aguardando aprovação"}
                </p>
                <p className="text-[10px] text-muted-foreground">{new Date(m.criado_em).toLocaleDateString("pt-BR")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
