import { useEffect, useMemo, useState } from "react";
import { Vote, CheckCircle2, Loader2, X, PartyPopper } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  useEnquetesPublicas,
  useMeusVotosEnquete,
  useResultadosEnquete,
  useVotarEnquete,
  agruparPorRodada,
} from "@/hooks/use-enquetes";

function Placar({ enqueteId, opcoes }: { enqueteId: string; opcoes: { id: string; texto: string }[] }) {
  const { data: totais } = useResultadosEnquete(enqueteId);
  const soma = Object.values(totais ?? {}).reduce((a, b) => a + b, 0);
  const maisVotado = soma > 0 ? Object.entries(totais ?? {}).sort((a, b) => b[1] - a[1])[0][0] : null;

  return (
    <div className="mt-4 space-y-2">
      {opcoes.map((o) => {
        const votos = totais?.[o.id] ?? 0;
        const pct = soma > 0 ? Math.round((votos / soma) * 100) : 0;
        return (
          <div key={o.id} className="text-xs">
            <div className="flex justify-between mb-1">
              <span className={o.id === maisVotado && soma > 0 ? "font-bold text-accent" : "text-foreground/80"}>
                {o.texto}
              </span>
              <span className="font-semibold text-muted-foreground">{votos} voto(s) · {pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ModalDeUmaEnquete({ enquete, onFechar }: { enquete: any; onFechar: () => void }) {
  const { user } = useAuth();
  const { data: meusVotos } = useMeusVotosEnquete(enquete.id, !!user);
  const votar = useVotarEnquete();
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarPlacarDe, setMostrarPlacarDe] = useState<number | null>(null);

  const rodadas = useMemo(() => agruparPorRodada(enquete.opcoes), [enquete.opcoes]);
  const proximaRodada = rodadas.find((r) => !(meusVotos && r.rodada in meusVotos));
  const tudoVotado = !proximaRodada;

  useEffect(() => setSelecionada(null), [proximaRodada?.rodada]);

  async function confirmar() {
    if (!selecionada || !user || !proximaRodada) return;
    setEnviando(true);
    try {
      await votar.mutateAsync({ enqueteId: enquete.id, opcaoId: selecionada, jogadorId: user.id });
      setMostrarPlacarDe(proximaRodada.rodada);
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível registrar seu voto.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0f1a] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-accent">Enquete do Aliança</p>
            <h3 className="text-xl font-black">{enquete.titulo}</h3>
          </div>
          <button onClick={onFechar} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {tudoVotado ? (
          <div className="mt-5 text-center">
            <PartyPopper className="mx-auto h-8 w-8 text-accent" />
            <p className="mt-2 text-sm font-semibold">Obrigado por votar em todas as rodadas!</p>
            <div className="mt-4 space-y-5 text-left">
              {rodadas.map((r) => (
                <div key={r.rodada}>
                  <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Rodada {r.rodada + 1}</p>
                  <Placar enqueteId={enquete.id} opcoes={r.opcoes} />
                </div>
              ))}
            </div>
            <button onClick={onFechar} className="mt-5 w-full rounded-xl bg-accent/20 py-2.5 text-sm font-bold text-accent">
              Fechar
            </button>
          </div>
        ) : mostrarPlacarDe !== null ? (
          <div className="mt-5">
            <p className="text-sm font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-accent" /> Voto registrado! Placar parcial da rodada {mostrarPlacarDe + 1}:
            </p>
            <Placar enqueteId={enquete.id} opcoes={rodadas.find((r) => r.rodada === mostrarPlacarDe)!.opcoes} />
            <button
              onClick={() => setMostrarPlacarDe(null)}
              className="mt-4 w-full rounded-xl bg-accent/20 py-2.5 text-sm font-bold text-accent"
            >
              Continuar
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <p className="mb-3 text-xs font-bold uppercase text-muted-foreground">
              Rodada {proximaRodada!.rodada + 1} de {rodadas.length}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {proximaRodada!.opcoes.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setSelecionada(op.id)}
                  className={`relative overflow-hidden rounded-2xl border-2 p-2 text-left transition ${
                    selecionada === op.id ? "border-accent bg-accent/10" : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  {op.imagem_url ? (
                    <img src={op.imagem_url} alt={op.texto} className="aspect-square w-full rounded-xl object-cover" />
                  ) : (
                    <div className="grid aspect-square w-full place-items-center rounded-xl bg-white/10">
                      <Vote className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <p className="mt-2 text-center text-sm font-bold">{op.texto}</p>
                  {selecionada === op.id && (
                    <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-accent text-[#0b0f1a]">
                      <X className="h-4 w-4" strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={confirmar}
              disabled={!selecionada || enviando}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-[#0b0f1a] transition disabled:opacity-40"
            >
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              OK
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Verifica se o usuário logado é jogador com cadastro aprovado
function useSouJogadorAtivo(userId: string | undefined) {
  const [ativo, setAtivo] = useState(false);
  useEffect(() => {
    if (!userId) return setAtivo(false);
    supabase.from("jogadores").select("ativo").eq("id", userId).maybeSingle()
      .then(({ data }) => setAtivo(data?.ativo === true));
  }, [userId]);
  return ativo;
}

export function EnqueteVotacaoModal() {
  const { user } = useAuth();
  const souJogadorAtivo = useSouJogadorAtivo(user?.id);
  const { data: enquetes } = useEnquetesPublicas();
  const [fechadas, setFechadas] = useState<string[]>([]);

  const ativa = enquetes?.find((e) => e.status === "ativa" && !fechadas.includes(e.id));

  if (!user || !souJogadorAtivo || !ativa) return null;

  return <ModalDeUmaEnquete enquete={ativa} onFechar={() => setFechadas((f) => [...f, ativa.id])} />;
}
