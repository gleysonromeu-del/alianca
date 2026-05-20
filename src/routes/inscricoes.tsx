import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase, POSICOES } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/inscricoes")({
  component: InscricoesPage,
  head: () => ({ meta: [{ title: "Faça parte do Aliança — Inscrição" }] }),
});

type Form = {
  nome_completo: string;
  apelido: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  profissao: string;
  posicao: string;
  email: string;
  quem_indicou: string;
};

const ORDEM: (keyof Form)[] = [
  "nome_completo",
  "apelido",
  "cpf",
  "telefone",
  "data_nascimento",
  "profissao",
  "posicao",
  "email",
  "quem_indicou",
];

const OPCIONAIS = new Set<keyof Form>(["profissao"]);

function InscricoesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form>({
    nome_completo: "",
    apelido: "",
    cpf: "",
    telefone: "",
    data_nascimento: "",
    profissao: "",
    posicao: "",
    email: "",
    quem_indicou: "",
  });

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Sequencial: campo só libera se TODOS os anteriores obrigatórios estiverem preenchidos
  function liberado(campo: keyof Form): boolean {
    const idx = ORDEM.indexOf(campo);
    for (let i = 0; i < idx; i++) {
      const c = ORDEM[i];
      if (OPCIONAIS.has(c)) continue;
      if (!form[c]?.toString().trim()) return false;
    }
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // valida sequência
    for (const c of ORDEM) {
      if (OPCIONAIS.has(c)) continue;
      if (!form[c]?.toString().trim()) {
        setError(`Preencha o campo "${c.replace("_", " ")}" antes de continuar.`);
        return;
      }
    }
    setLoading(true);
    try {
      const { error: insErr } = await supabase.from("inscricoes").insert({
        nome_completo: form.nome_completo,
        apelido: form.apelido,
        cpf: form.cpf,
        telefone: form.telefone,
        data_nascimento: form.data_nascimento,
        profissao: form.profissao || null,
        posicao: form.posicao,
        email: form.email,
        quem_indicou: form.quem_indicou,
        status: "pendente",
      });
      if (insErr) throw insErr;
      toast.success("Inscrição enviada! Em breve o admin entrará em contato.");
      navigate({ to: "/" });
    } catch (err: any) {
      setError(err.message ?? "Erro ao enviar inscrição");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-16 bg-background">
      <div className="mx-auto w-full max-w-2xl rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-foreground">Faça parte do Aliança</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Preencha os campos na ordem indicada. Cada campo só libera depois do anterior.
        </p>

        <form onSubmit={handleSubmit} autoComplete="off" className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`space-y-2 md:col-span-2 ${liberado("nome_completo") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>1. Nome completo *</Label>
            <Input value={form.nome_completo} onChange={(e) => set("nome_completo", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("apelido") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>2. Apelido *</Label>
            <Input value={form.apelido} onChange={(e) => set("apelido", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("cpf") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>3. CPF *</Label>
            <Input inputMode="numeric" maxLength={14} placeholder="000.000.000-00" value={form.cpf} onChange={(e) => set("cpf", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("telefone") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>4. Telefone *</Label>
            <Input value={form.telefone} onChange={(e) => set("telefone", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("data_nascimento") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>5. Data de nascimento *</Label>
            <Input type="date" value={form.data_nascimento} onChange={(e) => set("data_nascimento", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("profissao") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>6. Profissão (opcional)</Label>
            <Input value={form.profissao} onChange={(e) => set("profissao", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("posicao") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>7. Posição *</Label>
            <select
              value={form.posicao}
              onChange={(e) => set("posicao", e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">Selecione...</option>
              {POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className={`space-y-2 ${liberado("email") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>8. E-mail *</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className={`space-y-2 ${liberado("quem_indicou") ? "" : "opacity-40 pointer-events-none"}`}>
            <Label>9. Quem indicou *</Label>
            <Input value={form.quem_indicou} onChange={(e) => set("quem_indicou", e.target.value)} placeholder="Nome de quem te indicou" />
          </div>

          {error && <p className="md:col-span-2 text-sm text-destructive">{error}</p>}

          <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 mt-2">
            <Button type="submit" className="flex-1" disabled={loading}>
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