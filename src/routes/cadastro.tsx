import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase, POSICOES } from "@/integrations/supabase/client";
import { useTurnstile } from "@/hooks/use-turnstile";
import { schemaCadastro } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/cadastro")({
  component: CadastroPage,
  head: () => ({ meta: [{ title: "Cadastro — Aliança do Campo Grande" }] }),
});

function CadastroPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [consentimento, setConsentimento] = useState(false);

  const { containerRef, token, reset } = useTurnstile();

  const [form, setForm] = useState({
    nome_completo: "",
    apelido: "",
    cpf: "",
    data_nascimento: "",
    profissao: "",
    telefone: "",
    posicao: POSICOES[0] as string,
    numero_camisa: "",
    email: "",
    password: "",
    confirmar_password: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    // Limpa erro do campo ao editar
    setFieldErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // ── Consentimento LGPD ─────────────────────────────────────────────────────
    if (!consentimento) {
      setError("Você precisa aceitar a Política de Privacidade para se cadastrar.");
      return;
    }

    // ── Turnstile ──────────────────────────────────────────────────────────────
    if (!token) {
      setError("Confirme que você não é um robô.");
      return;
    }

    // ── Validação Zod ──────────────────────────────────────────────────────────
    const resultado = schemaCadastro.safeParse({
      ...form,
      numero_camisa: form.numero_camisa || undefined,
    });

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
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: resultado.data.email,
        password: resultado.data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/jogadores`,
          captchaToken: token,
          data: {
            nome_completo: resultado.data.nome_completo,
            apelido: resultado.data.apelido,
            cpf: resultado.data.cpf,
          },
        },
      });

      if (signUpErr) {
        const msg = signUpErr.message?.toLowerCase() ?? "";
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
          throw new Error("E-mail já cadastrado. Faça login para acessar sua área.");
        }
        throw signUpErr;
      }

      const user = signUp?.user;
      if (!user) throw new Error("Falha ao criar usuário.");

      if (!signUp.session) {
        await supabase.auth.signInWithPassword({
          email: resultado.data.email,
          password: resultado.data.password,
          options: { captchaToken: token },
        });
      }

      const { error: upErr } = await supabase.from("jogadores").upsert({
        id: user.id,
        nome_completo: resultado.data.nome_completo,
        apelido: resultado.data.apelido,
        cpf: resultado.data.cpf,
        data_nascimento: resultado.data.data_nascimento,
        profissao: resultado.data.profissao ?? null,
        telefone: resultado.data.telefone,
        posicao: resultado.data.posicao,
        numero_camisa: resultado.data.numero_camisa || null,
        email: resultado.data.email,
        ativo: false, // pendente de aprovação pelo admin
      }, { onConflict: "id" });

      if (upErr) throw upErr;

      navigate({ to: "/login", state: { cadastroPendente: true } });
    } catch (err: any) {
      setError(err.message ?? "Erro ao cadastrar");
      reset();
    } finally {
      setLoading(false);
    }
  }

  function fieldErr(k: string) {
    return fieldErrors[k]
      ? <p className="text-xs text-destructive mt-1">{fieldErrors[k]}</p>
      : null;
  }

  return (
    <div className="min-h-screen px-5 py-16 bg-background">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">Cadastro de Jogador</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preencha seus dados para entrar no time.</p>

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" value={form.nome_completo} onChange={(e) => set("nome_completo", e.target.value)} />
            {fieldErr("nome_completo")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="apelido">Apelido *</Label>
            <Input id="apelido" value={form.apelido} onChange={(e) => set("apelido", e.target.value)} />
            {fieldErr("apelido")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf" inputMode="numeric" maxLength={14}
              placeholder="000.000.000-00"
              value={form.cpf} onChange={(e) => set("cpf", e.target.value)}
            />
            {fieldErr("cpf")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input id="telefone" value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
            {fieldErr("telefone")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de nascimento *</Label>
            <Input id="data_nascimento" type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
            {fieldErr("data_nascimento")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profissao">Profissão (opcional)</Label>
            <Input id="profissao" value={form.profissao} onChange={(e) => set("profissao", e.target.value)} />
            {fieldErr("profissao")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="posicao">Posição *</Label>
            <select
              id="posicao" value={form.posicao}
              onChange={(e) => set("posicao", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {fieldErr("posicao")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="numero">Número da camisa (opcional)</Label>
            <Input id="numero" type="number" min={1} max={200} value={form.numero_camisa} onChange={(e) => set("numero_camisa", e.target.value)} />
          </div>

          <div className="md:col-span-2 border-t border-white/10 pt-4 mt-2">
            <p className="text-sm font-medium text-foreground mb-2">Dados de acesso</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <Input id="email" name="cad_email" type="email" autoComplete="off" value={form.email} onChange={(e) => set("email", e.target.value)} />
            {fieldErr("email")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">
              Senha * <span className="text-xs text-muted-foreground">(mín. 8 chars, letra e número)</span>
            </Label>
            <Input id="password" name="cad_password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} />
            {fieldErr("password")}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="confirmar_password">Confirmar senha *</Label>
            <Input id="confirmar_password" type="password" autoComplete="new-password" value={form.confirmar_password} onChange={(e) => set("confirmar_password", e.target.value)} />
            {fieldErr("confirmar_password")}
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
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
            <Link to="/login" className="inline-flex h-9 flex-1 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent">
              Já tenho conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
