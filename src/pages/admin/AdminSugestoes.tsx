import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, Check, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Sugestao {
  id: string;
  tipo: string;
  mensagem: string;
  anonimo: boolean;
  nome_remetente: string | null;
  lida: boolean;
  resposta: string | null;
  created_at: string;
}

const TIPO_LABEL: Record<string, string> = {
  sugestao: "💡 Sugestão",
  comentario: "💬 Comentário",
  ideia: "🚀 Ideia",
};

export function AdminSugestoes() {
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState<"todas" | "nao_lidas" | "lidas">("nao_lidas");

  useEffect(() => { fetchSugestoes(); }, []);

  async function fetchSugestoes() {
    setLoading(true);
    const { data } = await supabase
      .from("sugestoes")
      .select("*")
      .order("created_at", { ascending: false });
    setSugestoes(data ?? []);
    setLoading(false);
  }

  async function marcarLida(id: string, lida: boolean) {
    await supabase.from("sugestoes").update({ lida }).eq("id", id);
    setSugestoes((prev) => prev.map((s) => s.id === id ? { ...s, lida } : s));
  }

  async function salvarResposta(id: string) {
    const resposta = respostas[id]?.trim();
    await supabase.from("sugestoes").update({ resposta: resposta || null, lida: true }).eq("id", id);
    setSugestoes((prev) => prev.map((s) => s.id === id ? { ...s, resposta: resposta || null, lida: true } : s));
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta sugestão?")) return;
    await supabase.from("sugestoes").delete().eq("id", id);
    setSugestoes((prev) => prev.filter((s) => s.id !== id));
  }

  const filtradas = sugestoes.filter((s) => {
    if (filtro === "nao_lidas") return !s.lida;
    if (filtro === "lidas") return s.lida;
    return true;
  });

  const naoLidas = sugestoes.filter((s) => !s.lida).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold">Caixa de Sugestões</h2>
          {naoLidas > 0 && (
            <span className="rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-400">
              {naoLidas} não lida{naoLidas > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {(["nao_lidas", "todas", "lidas"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filtro === f ? "bg-accent text-accent-foreground" : "border border-white/10 text-muted-foreground hover:bg-white/5"
              }`}
            >
              {f === "nao_lidas" ? "Não lidas" : f === "todas" ? "Todas" : "Lidas"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-white/5" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="rounded-2xl border border-white/10 py-12 text-center text-muted-foreground">
          <MessageSquare className="mx-auto mb-3 h-8 w-8 opacity-30" />
          <p>Nenhuma sugestão {filtro === "nao_lidas" ? "não lida" : filtro === "lidas" ? "lida" : ""} encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border p-4 transition ${
                !s.lida ? "border-accent/30 bg-accent/5" : "border-white/10 bg-white/3"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold">{TIPO_LABEL[s.tipo] ?? s.tipo}</span>
                    {!s.lida && <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">NOVA</span>}
                    <span className="text-xs text-muted-foreground">
                      {s.anonimo ? "Anônimo" : (s.nome_remetente ?? "—")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{s.mensagem}</p>
                  {s.resposta && (
                    <div className="mt-2 rounded-xl border border-green-500/20 bg-green-500/5 px-3 py-2">
                      <p className="text-xs font-semibold text-green-400 mb-1">Resposta da diretoria:</p>
                      <p className="text-xs text-muted-foreground">{s.resposta}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => marcarLida(s.id, !s.lida)}
                    title={s.lida ? "Marcar como não lida" : "Marcar como lida"}
                    className={`grid h-8 w-8 place-items-center rounded-lg transition ${
                      s.lida ? "text-green-400/50 hover:bg-green-500/10" : "text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setExpandido(expandido === s.id ? null : s.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-white/5 transition"
                  >
                    {expandido === s.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => excluir(s.id)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expandido === s.id && (
                <div className="mt-4 border-t border-white/8 pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responder</p>
                  <textarea
                    value={respostas[s.id] ?? s.resposta ?? ""}
                    onChange={(e) => setRespostas((prev) => ({ ...prev, [s.id]: e.target.value }))}
                    rows={3}
                    placeholder="Escreva uma resposta (opcional)..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50 resize-none"
                  />
                  <button
                    onClick={() => salvarResposta(s.id)}
                    className="rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground hover:bg-accent/80 transition"
                  >
                    Salvar resposta e marcar como lida
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
