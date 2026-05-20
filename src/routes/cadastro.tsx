import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase, POSICOES } from "@/integrations/supabase/client";
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
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState<{
    nome_completo: string;
    apelido: string;
    cpf: string;
    data_nascimento: string;
    profissao: string;
    telefone: string;
    posicao: (typeof POSICOES)[number];
    numero_camisa: string;
    email: string;
    password: string;
  }>({
    nome_completo: "",
    apelido: "",
    cpf: "",
    data_nascimento: "",
    profissao: "",
    telefone: "",
    posicao: POSICOES[0],
    numero_camisa: "",
    email: "",
    password: "",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data: signUp, error: signUpErr } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/jogadores`,
          data: {
            nome_completo: form.nome_completo,
            apelido: form.apelido,
            cpf: form.cpf,
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
      const user = signUp.user;
      if (!user) throw new Error("Falha ao criar usuário.");

      // Login imediato para garantir sessão (caso confirmação esteja desativada)
      if (!signUp.session) {
        await supabase.auth.signInWithPassword({
          email: form.email,
          password: form.password,
        });
      }

      const payload = {
        id: user.id,
        nome_completo: form.nome_completo,
        apelido: form.apelido,
        cpf: form.cpf,
        data_nascimento: form.data_nascimento || null,
        profissao: form.profissao,
        telefone: form.telefone,
        posicao: form.posicao,
        numero_camisa: form.numero_camisa ? Number(form.numero_camisa) : null,
        email: form.email,
        ativo: true,
      };

      const { error: upErr } = await supabase
        .from("jogadores")
        .upsert(payload, { onConflict: "id" });
      if (upErr) throw upErr;

      // Limpa o formulário para não deixar email/senha visíveis
      setForm({
        nome_completo: "",
        apelido: "",
        cpf: "",
        data_nascimento: "",
        profissao: "",
        telefone: "",
        posicao: POSICOES[0],
        numero_camisa: "",
        email: "",
        password: "",
      });

      navigate({ to: "/jogadores" });
    } catch (err: any) {
      setError(err.message ?? "Erro ao cadastrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-16 bg-background">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">Cadastro de Jogador</h1>
        <p className="mt-1 text-sm text-muted-foreground">Preencha seus dados para entrar no time.</p>

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nome">Nome completo *</Label>
            <Input id="nome" required value={form.nome_completo} onChange={(e) => set("nome_completo", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apelido">Apelido *</Label>
            <Input id="apelido" required value={form.apelido} onChange={(e) => set("apelido", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              required
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => set("cpf", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone *</Label>
            <Input id="telefone" required value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de nascimento *</Label>
            <Input
              id="data_nascimento"
              type="date"
              required
              value={form.data_nascimento}
              onChange={(e) => set("data_nascimento", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profissao">Profissão</Label>
            <Input id="profissao" value={form.profissao} onChange={(e) => set("profissao", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="posicao">Posição *</Label>
            <select
              id="posicao"
              required
              value={form.posicao}
              onChange={(e) => set("posicao", e.target.value as (typeof POSICOES)[number])}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              {POSICOES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
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
            <Input id="email" name="cad_email" type="email" autoComplete="off" required value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <Input id="password" name="cad_password" type="password" autoComplete="new-password" required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>


          {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 mt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
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
