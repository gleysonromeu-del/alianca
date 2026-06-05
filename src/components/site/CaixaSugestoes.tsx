import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MessageSquarePlus, Send, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function CaixaSugestoes() {
  const { user } = useAuth();
  const [tipo, setTipo] = useState<"sugestao" | "comentario" | "ideia">("sugestao");
  const [mensagem, setMensagem] = useState("");
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function handleEnviar() {
    if (!mensagem.trim()) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from("sugestoes").insert({
        tipo,
        mensagem: mensagem.trim(),
        anonimo,
        user_id: user?.id ?? null,
        nome_remetente: anonimo ? null : (user?.email ?? null),
      });
      if (error) throw error;
      setEnviado(true);
      setMensagem("");
    } catch (e) {
      console.error(e);
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
    <section className="py-20 px-6" id="sugestoes">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">Fale com a Diretoria</p>
          <h2 className="text-3xl font-black md:text-4xl">Caixa de <span className="text-gradient-gold">Sugestões</span></h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Suas ideias e opiniões são importantes. Envie diretamente para a diretoria do Aliança.
          </p>
        </div>

        <div className="rounded-3xl glass p-6 md:p-8 shadow-[var(--shadow-elegant)]">
          {!user ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <Lock className="h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">Faça login para enviar uma sugestão.</p>
              <Link
                to="/login"
                className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition"
              >
                Entrar
              </Link>
            </div>
          ) : enviado ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-green-500/15">
                <MessageSquarePlus className="h-8 w-8 text-green-400" />
              </div>
              <p className="text-lg font-bold">Mensagem enviada!</p>
              <p className="text-sm text-muted-foreground">A diretoria irá analisar sua contribuição. Obrigado!</p>
              <button
                onClick={() => setEnviado(false)}
                className="mt-2 rounded-full border border-white/10 px-6 py-2 text-sm font-medium hover:bg-white/5 transition"
              >
                Enviar outra
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Tipo */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label>
                <div className="flex gap-2 flex-wrap">
                  {tipos.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTipo(t.id)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        tipo === t.id
                          ? "bg-accent text-accent-foreground"
                          : "border border-white/10 text-muted-foreground hover:bg-white/5"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mensagem */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Mensagem
                </label>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={5}
                  placeholder="Escreva sua sugestão, comentário ou ideia aqui..."
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 resize-none"
                />
                <div className="mt-1 text-right text-xs text-muted-foreground">{mensagem.length}/500</div>
              </div>

              {/* Anônimo */}
              <label className="flex cursor-pointer items-center gap-3">
                <div
                  onClick={() => setAnonimo((v) => !v)}
                  className={`relative h-5 w-9 rounded-full transition ${anonimo ? "bg-accent" : "bg-white/10"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${anonimo ? "translate-x-4" : ""}`} />
                </div>
                <span className="text-sm text-muted-foreground">Enviar anonimamente</span>
              </label>

              <button
                onClick={handleEnviar}
                disabled={enviando || !mensagem.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground transition hover:bg-accent/80 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {enviando ? "Enviando..." : "Enviar para a Diretoria"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
