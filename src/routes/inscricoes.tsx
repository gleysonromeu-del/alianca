import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase, POSICOES } from "@/integrations/supabase/client";
import { useTurnstile } from "@/hooks/use-turnstile";
import { schemaInscricao } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/inscricoes")({
  component: InscricoesPage,
  head: () => ({ meta: [{ title: "Faça parte do Aliança — Inscrição" }] }),
});

function InscricoesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [consentimento, setConsentimento] = useState(false);

  const { containerRef, token, reset } = useTurnstile();

  const [form, setForm] = useState({
    nome_completo: "", apelido: "", cpf: "", telefone: "",
    data_nascimento: "", profissao: "", posicao: "", email: "", quem_indicou: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  function fieldErr(k: string) {
    return fieldErrors[k]
      ? <p className="text-xs text-destructive mt-1">{fieldErrors[k]}</p>
      : null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // ── Consentimento LGPD ─────────────────────────────────────────────────────
    if (!consentimento) {
      setError("Você precisa aceitar a Política de Privacidade para se inscrever.");
      return;
    }

    // ── Turnstile ──────────────────────────────────────────────────────────────
    if (!token) {
      setError("Confirme que você não é um robô.");
      return;
    }

    // ── Validação Zod ──────────────────────────────────────────────────────────
    const resultado = schemaInscricao.safeParse(form);
    if (!resultado.success) {
      const erros: Record<string, string> = {};
      resultado.error.errors.forEach((e) => {
        const campo = e.path[0] as string;
        if (!erros[campo]) erros[campo] = e.message;
      });
      setFieldErrors(erros);
      setError("Corrija os erros abaixo antes de continuar.");
      return;
    }

    setLoading(true);
    try {
      const { error: insErr } = await supabase.from("inscricoes").insert({
        nome_completo: resultado.data.nome_completo,
        apelido: resultado.data.apelido,
        cpf: resultado.data.cpf,
        telefone: resultado.data.telefone,
        data_nascimento: resultado.data.data_nascimento,
        profissao: resultado.data.profissao ?? null,
        posicao: resultado.data.posicao,
        email: resultado.data.email,
        quem_indicou: resultado.data.quem_indicou,
        status: "pendente",
      });
      if (insErr) throw insErr;
      toast.success("Inscrição enviada! Em breve o admin entrará em contato.");
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message ?? "Erro ao enviar inscrição");
      reset();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-16 bg-background">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">Faça parte do Aliança</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preencha seus dados para se inscrever.</p>

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome completo *</Label>
            <Input value={form.nome_completo} onChange={(e) => set("nome_completo", e.target.value)} />
            {fieldErr("nome_completo")}
          </div>
          <div className="space-y-2">
            <Label>Apelido *</Label>
            <Input value={form.apelido} onChange={(e) => set("apelido", e.target.value)} />
            {fieldErr("apelido")}
          </div>
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
            {fieldErr("cpf")}
          </div>
          <div className="space-y-2">
            <Label>Telefone *</Label>
            <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            {fieldErr("telefone")}
          </div>
          <div className="space-y-2">
            <Label>Data de nascimento *</Label>
            <Input type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
            {fieldErr("data_nascimento")}
          </div>
          <div className="space-y-2">
            <Label>Profissão (opcional)</Label>
            <Input value={form.profissao} onChange={(e) => set("profissao", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Posição *</Label>
            <select
              value={form.posicao} onChange={(e) => set("posicao", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {fieldErr("posicao")}
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            {fieldErr("email")}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Quem indicou *</Label>
            <Input value={form.quem_indicou} onChange={(e) => set("quem_indicou", e.target.value)} placeholder="Nome de quem te indicou" />
            {fieldErr("quem_indicou")}
          </div>

          {/* Widget Turnstile */}
          <div className="md:col-span-2" ref={containerRef} />

          {/* Consentimento LGPD */}
          <div className="md:col-span-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentimento}
                onChange={(e) => setConsentimento(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
              />
              <span className="text-sm text-muted-foreground">
                Li e aceito a{" "}
                <Link to="/privacidade" target="_blank" className="text-primary hover:underline font-medium">
                  Política de Privacidade
                </Link>
                {" "}e autorizo o uso dos meus dados para gestão do clube, conforme a LGPD. *
              </span>
            </label>
          </div>

          {error && <p className="md:col-span-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 mt-2">
            <Button type="submit" className="flex-1" disabled={loading || !token || !consentimento}>
              {loading ? "Enviando..." : "Enviar inscrição"}
            </Button>
            <Link to="/" className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
