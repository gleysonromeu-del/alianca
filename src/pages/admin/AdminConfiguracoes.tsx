import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Configuracao {
  chave: string;
  valor: string;
  descricao: string | null;
}

const CHAVES = [
  {
    chave: "mensalidade_valor_pix",
    label: "Valor da mensalidade — PIX",
    descricao: "Valor cobrado quando o jogador paga via PIX (à vista).",
    prefixo: "R$",
    placeholder: "30.00",
  },
  {
    chave: "mensalidade_valor_cartao",
    label: "Valor da mensalidade — Cartão de crédito",
    descricao: "Valor cobrado quando o jogador paga no cartão (pode incluir taxa do gateway).",
    prefixo: "R$",
    placeholder: "35.00",
  },
] as const;

export function AdminConfiguracoes() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  async function fetchConfigs() {
    setLoading(true);
    const chaves = CHAVES.map((c) => c.chave);
    const { data, error } = await supabase
      .from("configuracoes")
      .select("chave, valor")
      .in("chave", chaves);

    if (error) {
      toast.error("Erro ao carregar configurações.");
    } else {
      const map: Record<string, string> = {};
      (data ?? []).forEach((row: Configuracao) => {
        map[row.chave] = row.valor;
      });
      setConfigs(map);
    }
    setLoading(false);
  }

  async function salvar(chave: string, valor: string) {
    const num = parseFloat(valor.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      toast.error("Informe um valor válido maior que zero.");
      return;
    }

    setSalvando(chave);
    const { error } = await supabase
      .from("configuracoes")
      .upsert(
        { chave, valor: num.toFixed(2), atualizado_em: new Date().toISOString() },
        { onConflict: "chave" }
      );

    if (error) {
      toast.error("Erro ao salvar. Tente novamente.");
    } else {
      toast.success("Valor salvo com sucesso!");
      setConfigs((prev) => ({ ...prev, [chave]: num.toFixed(2) }));
    }
    setSalvando(null);
  }

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        Carregando configurações...
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-lg">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Configurações de mensalidade</h2>
        <p className="text-sm text-muted-foreground">
          Defina os valores cobrados por método de pagamento. As alterações têm efeito imediato.
        </p>
      </div>

      <div className="space-y-6">
        {CHAVES.map(({ chave, label, descricao, prefixo, placeholder }) => {
          const valorAtual = configs[chave] ?? "";
          return (
            <ConfigCard
              key={chave}
              chave={chave}
              label={label}
              descricao={descricao}
              prefixo={prefixo}
              placeholder={placeholder}
              valorInicial={valorAtual}
              salvando={salvando === chave}
              onSalvar={(v) => salvar(chave, v)}
            />
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-card/40 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground text-sm">Como funciona</p>
        <p>• O jogador verá os dois valores na tela antes de escolher o método de pagamento.</p>
        <p>• O Mercado Pago receberá o valor correto de acordo com o método escolhido.</p>
        <p>• Alterar os valores aqui não afeta pagamentos já realizados.</p>
      </div>
    </div>
  );
}

// ── Sub-componente de card por configuração ──────────────────────────────────

function ConfigCard({
  chave,
  label,
  descricao,
  prefixo,
  placeholder,
  valorInicial,
  salvando,
  onSalvar,
}: {
  chave: string;
  label: string;
  descricao: string;
  prefixo: string;
  placeholder: string;
  valorInicial: string;
  salvando: boolean;
  onSalvar: (v: string) => void;
}) {
  const [valor, setValor] = useState(valorInicial);
  const alterado = valor !== valorInicial;

  // Atualiza o campo se o valor inicial mudar (ex: após fetch)
  useEffect(() => {
    setValor(valorInicial);
  }, [valorInicial]);

  return (
    <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl p-5 space-y-4">
      <div>
        <p className="font-semibold text-foreground text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
            {prefixo}
          </span>
          <Input
            id={chave}
            type="number"
            step="0.01"
            min="0.01"
            placeholder={placeholder}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="pl-9"
          />
        </div>

        <Button
          onClick={() => onSalvar(valor)}
          disabled={salvando || !alterado || !valor}
          size="sm"
          className="shrink-0"
        >
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {valorInicial && (
        <p className="text-xs text-muted-foreground">
          Valor atual: <span className="font-medium text-foreground">R$ {parseFloat(valorInicial).toFixed(2).replace(".", ",")}</span>
        </p>
      )}

      {!valorInicial && (
        <p className="text-xs text-amber-500">
          Nenhum valor definido — defina antes de abrir os pagamentos.
        </p>
      )}
    </div>
  );
}
