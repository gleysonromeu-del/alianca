import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  userId: string;
  jogadorCriadoEm: string; // ISO string do created_at do jogador
}

interface MesAberto {
  referencia: string;  // "MM/YYYY"
  label: string;       // "Janeiro 2026"
  vencimento: Date;
}

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Gera string "MM/YYYY" de uma data
function toReferencia(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Gera label legível "Janeiro 2026"
function toLabel(d: Date): string {
  return `${MESES_PT[d.getMonth()]} ${d.getFullYear()}`;
}

// Retorna todos os meses desde o cadastro até hoje (inclusive se já passou do dia 10)
function gerarMesesDevedores(criadoEm: string): MesAberto[] {
  const inicio = new Date(criadoEm);
  const hoje = new Date();

  // Primeiro mês de cobrança: mês do cadastro (a partir do dia 10)
  const meses: MesAberto[] = [];
  const cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1);

  while (true) {
    const vencimento = new Date(cursor.getFullYear(), cursor.getMonth(), 10);

    // Só inclui meses cujo dia 10 já passou
    if (vencimento > hoje) break;

    meses.push({
      referencia: toReferencia(cursor),
      label: toLabel(cursor),
      vencimento,
    });

    cursor.setMonth(cursor.getMonth() + 1);
  }

  return meses;
}

export function PagamentoMensalidade({ userId, jogadorCriadoEm }: Props) {
  const [valorPix, setValorPix] = useState<number | null>(null);
  const [valorCartao, setValorCartao] = useState<number | null>(null);
  const [mesesAbertos, setMesesAbertos] = useState<MesAberto[]>([]);
  const [mesesSelecionados, setMesesSelecionados] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      setLoading(true);
      await Promise.all([carregarValores(), calcularMesesAbertos()]);
      setLoading(false);
    }
    init();
  }, [userId, jogadorCriadoEm]);

  async function carregarValores() {
    const { data } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", ["mensalidade_valor_pix", "mensalidade_valor_cartao"]);

    (data ?? []).forEach((row: { chave: string; valor: string }) => {
      if (row.chave === "mensalidade_valor_pix") setValorPix(parseFloat(row.valor));
      if (row.chave === "mensalidade_valor_cartao") setValorCartao(parseFloat(row.valor));
    });
  }

  async function calcularMesesAbertos() {
    // Busca todos os pagamentos confirmados do jogador
    const { data: pags } = await supabase
      .from("pagamentos")
      .select("referencia, status")
      .eq("jogador_id", userId)
      .eq("status", "confirmado");

    const pagosRefs = new Set((pags ?? []).map((p: { referencia: string }) => p.referencia));

    // Todos os meses desde o cadastro
    const todos = gerarMesesDevedores(jogadorCriadoEm);

    // Filtra os que não foram pagos
    const abertos = todos.filter((m) => !pagosRefs.has(m.referencia));

    setMesesAbertos(abertos);
    setMesesSelecionados(abertos.length > 0 ? 1 : 0);
  }

  if (loading) return null;

  // Se não há meses em aberto — jogador em dia
  if (mesesAbertos.length === 0) {
    return (
      <div className="rounded-2xl border border-green-500/20 bg-green-500/5 p-6 mb-8">
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-semibold text-foreground">Mensalidade em dia!</p>
            <p className="text-sm text-muted-foreground">Você não possui mensalidades em aberto.</p>
          </div>
        </div>
      </div>
    );
  }

  // Meses que serão quitados com a seleção atual (os mais antigos primeiro)
  const mesesParaPagar = mesesAbertos.slice(0, mesesSelecionados);
  const totalPix = valorPix ? (valorPix * mesesSelecionados).toFixed(2) : "—";
  const totalCartao = valorCartao ? (valorCartao * mesesSelecionados).toFixed(2) : "—";
  const mesAlvo = mesesAbertos[0]; // o mais antigo em aberto

  return (
    <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 mb-8 space-y-5">
      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-xl font-bold text-foreground">Pagar mensalidade</h2>
          {mesesAbertos.length > 1 && (
            <span className="text-xs rounded-full px-2 py-1 bg-red-500/20 text-red-300 font-medium">
              {mesesAbertos.length} meses em atraso
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {mesesAbertos.length === 1
            ? `Mensalidade em aberto: ${mesAlvo.label}`
            : `Mês mais antigo em aberto: ${mesAlvo.label}`}
        </p>
      </div>

      {/* Seletor de quantidade de meses */}
      {mesesAbertos.length > 1 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Quantos meses deseja quitar?</p>
          <div className="flex flex-wrap gap-2">
            {mesesAbertos.map((_, i) => (
              <button
                key={i}
                onClick={() => setMesesSelecionados(i + 1)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                  mesesSelecionados === i + 1
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {i + 1 === mesesAbertos.length ? `Todos (${i + 1})` : `${i + 1}`}
              </button>
            ))}
          </div>

          {/* Lista dos meses selecionados */}
          <div className="rounded-xl border border-white/10 bg-card/40 p-3 space-y-1">
            {mesesParaPagar.map((m) => (
              <div key={m.referencia} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{m.label}</span>
                <span className="text-muted-foreground text-xs">{m.referencia}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões de pagamento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* PIX */}
        <div className="rounded-xl border border-white/10 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <p className="font-semibold text-foreground text-sm">PIX</p>
              <p className="text-xs text-muted-foreground">Pagamento instantâneo</p>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {valorPix ? `R$ ${totalPix}` : "—"}
            </p>
            {mesesSelecionados > 1 && valorPix && (
              <p className="text-xs text-muted-foreground">
                {mesesSelecionados}× R$ {valorPix.toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>
          <Button
            className="w-full"
            disabled={!valorPix}
            onClick={() => iniciarPagamento("pix")}
          >
            Pagar com PIX
          </Button>
        </div>

        {/* Cartão */}
        <div className="rounded-xl border border-white/10 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">💳</span>
            <div>
              <p className="font-semibold text-foreground text-sm">Cartão de crédito</p>
              <p className="text-xs text-muted-foreground">Pagamento à vista</p>
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">
              {valorCartao ? `R$ ${totalCartao}` : "—"}
            </p>
            {mesesSelecionados > 1 && valorCartao && (
              <p className="text-xs text-muted-foreground">
                {mesesSelecionados}× R$ {valorCartao.toFixed(2).replace(".", ",")}
              </p>
            )}
          </div>
          <Button
            className="w-full"
            variant="outline"
            disabled={!valorCartao}
            onClick={() => iniciarPagamento("cartao")}
          >
            Pagar no cartão
          </Button>
        </div>
      </div>

      {/* Aviso se valores não configurados */}
      {(!valorPix || !valorCartao) && (
        <p className="text-xs text-amber-400 text-center">
          Aguardando configuração dos valores pelo administrador.
        </p>
      )}
    </div>
  );

  // ── Iniciar pagamento (placeholder até integração MP) ──────────────────────
  function iniciarPagamento(metodo: "pix" | "cartao") {
    const referencias = mesesParaPagar.map((m) => m.referencia).join(", ");
    const total = metodo === "pix" ? totalPix : totalCartao;
    toast.info(
      `Integração com Mercado Pago em breve!\n${mesesSelecionados} mês(es): ${referencias} — R$ ${total} via ${metodo === "pix" ? "PIX" : "cartão"}`
    );
    // TODO: chamar Edge Function do Mercado Pago
    // const resp = await fetch("/api/criar-pagamento", {
    //   method: "POST",
    //   body: JSON.stringify({ metodo, meses: mesesParaPagar, total }),
    // });
    // window.location.href = resp.checkoutUrl;
  }
}
