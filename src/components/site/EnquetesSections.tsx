import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Vote, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useEnquetesPublicas,
  useResultadosEnquete,
  useMeuVotoEnquete,
  useVotarEnquete,
  CATEGORIA_LABEL,
  type EnqueteOpcao,
} from "@/hooks/use-enquetes";

// Verifica se o usuário logado é um jogador com cadastro aprovado (ativo = true)
function useSouJogadorAtivo(userId: string | undefined) {
  const [ativo, setAtivo] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setAtivo(false);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase.from("jogadores").select("ativo").eq("id", userId).maybeSingle();
      setAtivo(data?.ativo === true);
      setLoading(false);
    })();
  }, [userId]);

  return { ativo, loading };
}

function CardEnquete({ enquete, podeVotar }: { enquete: any; podeVotar: boolean }) {
  const { user } = useAuth();
  const { data: totais } = useResultadosEnquete(enquete.id);
  const { data: meuVoto, isLoading: carregandoVoto } = useMeuVotoEnquete(enquete.id, !!user);
  const votar = useVotarEnquete();
  const [votando, setVotando] = useState<string | null>(null);

  const jaVotou = !!meuVoto;
  const mostrarResultado = jaVotou || enquete.status === "encerrada" || !podeVotar;
  const soma = Object.values(totais ?? {}).reduce((a: number, b) => a + (b as number), 0);

  async function handleVotar(opcaoId: string) {
    if (!user) return;
    setVotando(opcaoId);
    try {
      await votar.mutateAsync({ enqueteId: enquete.id, opcaoId, jogadorId: user.id });
      toast.success("Voto registrado! Obrigado por participar.");
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível registrar seu voto.");
    } finally {
      setVotando(null);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/3 p-6"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
          {CATEGORIA_LABEL[enquete.categoria as keyof typeof CATEGORIA_LABEL]}
        </span>
        {enquete.status === "encerrada" && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground">
            Encerrada
          </span>
        )}
      </div>
      <h3 className="text-xl font-black">{enquete.titulo}</h3>
      {enquete.descricao && <p className="mt-1 text-sm text-muted-foreground">{enquete.descricao}</p>}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(enquete.opcoes as EnqueteOpcao[]).map((op) => {
          const votos = totais?.[op.id] ?? 0;
          const pct = soma > 0 ? Math.round((votos / soma) * 100) : 0;
          const escolhida = meuVoto === op.id;

          if (mostrarResultado) {
            return (
              <div
                key={op.id}
                className={`relative overflow-hidden rounded-2xl border p-3 ${
                  escolhida ? "border-accent bg-accent/10" : "border-white/10 bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3">
                  {op.imagem_url ? (
                    <img src={op.imagem_url} alt={op.texto} className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-14 w-14 place-items-center rounded-xl bg-white/10">
                      <Vote className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-semibold truncate">
                      {op.texto}
                      {escolhida && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent" />}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-[11px] text-muted-foreground">{votos} voto(s) · {pct}%</p>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <button
              key={op.id}
              type="button"
              disabled={!podeVotar || votando !== null || carregandoVoto}
              onClick={() => handleVotar(op.id)}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-accent/50 hover:bg-accent/10 disabled:opacity-60"
            >
              {op.imagem_url ? (
                <img src={op.imagem_url} alt={op.texto} className="h-14 w-14 rounded-xl object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-white/10">
                  <Vote className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <span className="flex-1 text-sm font-semibold">{op.texto}</span>
              {votando === op.id && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
            </button>
          );
        })}
      </div>

      {!podeVotar && !jaVotou && enquete.status === "ativa" && (
        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          Só jogadores cadastrados e aprovados podem votar.{" "}
          <Link to="/jogadores" className="font-semibold text-accent hover:underline">
            Faça login ou cadastre-se
          </Link>
        </p>
      )}
    </motion.div>
  );
}

export function EnquetesSection() {
  const { data: enquetes, isLoading } = useEnquetesPublicas();
  const { user } = useAuth();
  const { ativo: souJogadorAtivo } = useSouJogadorAtivo(user?.id);

  if (isLoading || !enquetes?.length) return null;

  return (
    <section id="enquetes" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Participe</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Enquetes do <span className="text-gradient-gold">Aliança</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Ajude a decidir os rumos do clube: uniformes, festas, eleições e ações sociais.
            Votação exclusiva para jogadores cadastrados e logados.
          </p>
        </div>

        <div className="space-y-6">
          {enquetes.map((e) => (
            <CardEnquete key={e.id} enquete={e} podeVotar={!!user && souJogadorAtivo && e.status === "ativa"} />
          ))}
        </div>
      </div>
    </section>
  );
}
