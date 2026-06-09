import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { schemaSugestao } from "@/lib/schemas";
import { MessageSquarePlus, Send, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import escudo from "@/assets/escudo.png";

// Rate limiting local: impede mais de 1 envio por minuto por sessão
const RATE_LIMIT_MS = 60_000;
let ultimoEnvio = 0;

export function CaixaSugestoes() {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<"sugestao" | "comentario" | "ideia">("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleEnviar() {
    setErro(null);

    const agora = Date.now();
    if (agora - ultimoEnvio < RATE_LIMIT_MS) {
      const restante = Math.ceil((RATE_LIMIT_MS - (agora - ultimoEnvio)) / 1000);
      setErro(`Aguarde ${restante}s antes de enviar outra mensagem.`);
      return;
    }

    const resultado = schemaSugestao.safeParse({ tipo, mensagem, anonimo });
    if (!resultado.success) {
      setErro(resultado.error.errors[0].message);
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.from("sugestoes").insert({
        tipo: resultado.data.tipo,
        mensagem: resultado.data.mensagem,
        anonimo: resultado.data.anonimo,
        user_id: user?.id ?? null,
        nome_remetente: resultado.data.anonimo ? null : (user?.email ?? null),
      });
      if (error) throw error;

      ultimoEnvio = Date.now();
      setEnviado(true);
      setMensagem("");
    } catch (e: any) {
      setErro(e.message ?? "Erro ao enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  const tipos = [
    { id: "sugestao", label: "💡 Sugestão" },
    { id: "comentario", label: "💬 Comentário" },
    { id: "ideia", label: "🚀 Ideia" },
  ] as const;

  return (
    <section className="py-12 px-6" id="sugestoes">
      <div className="mx-auto max-w-lg">
        {/* Cabeçalho */}
        <div className="mb-6 text-center">
          <img src={escudo} alt="Aliança" className="mx-auto h-12 w-12 object-contain mb-3" />
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-accent">Fale com o Aliança</p>
          <h2 className="text-2xl font-black">Caixa de <span className="text-gradient-gold">Sugestões</span></h2>
          <p className="mt-2 text-xs text-muted-foreground">
            Suas ideias e opiniões são importantes. Envie diretamente para a diretoria.
          </p>
        </div>

        <div className="rounded-2xl glass p-5 shadow-[var(--shadow-elegant)]">
          {!user ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Faça login para enviar uma sugestão.</p>
              <Link
                to="/login"
                className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition"
              >
                Entrar
              </Link>
            </div>
          ) : enviado ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-green-500/15">
                <MessageSquarePlus className="h-6 w-6 text-green-400" />
              </div>
              <p className="font-bold">Mensagem enviada!</p>
              <p className="text-xs text-muted-foreground">A diretoria irá analisar sua contribuição. Obrigado!</p>
              <button
                onClick={() => setEnviado(false)}
                className="mt-1 rounded-full border border-white/10 px-5 py-1.5 text-sm font-medium hover:bg-white/5 transition"
              >
                Enviar outra
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Tipo */}
              <div className="flex gap-2 flex-wrap">
                {tipos.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTipo(t.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      tipo === t.id
                        ? "bg-accent text-accent-foreground"
                        : "border border-white/10 text-muted-foreground hover:bg-white/5"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Mensagem */}
              <div>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={3}
                  placeholder="Escreva sua sugestão, comentário ou ideia..."
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none"
                />
                <div className={`mt-0.5 text-right text-xs ${mensagem.length >= 480 ? "text-amber-400" : "text-muted-foreground"}`}>
                  {mensagem.length}/500
                </div>
              </div>

              {/* Anônimo */}
              <label className="flex cursor-pointer items-center gap-2">
                <div
                  onClick={() => setAnonimo((v) => !v)}
                  className={`relative h-4 w-8 rounded-full transition ${anonimo ? "bg-accent" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${anonimo ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-xs text-muted-foreground">Enviar anonimamente</span>
              </label>

              {erro && (
                <p className="text-xs text-destructive rounded-lg bg-destructive/10 px-3 py-2">{erro}</p>
              )}

              <button
                onClick={handleEnviar}
                disabled={enviando || !mensagem.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-accent-foreground transition hover:bg-accent/80 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                {enviando ? "Enviando..." : "Enviar para a Diretoria"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
