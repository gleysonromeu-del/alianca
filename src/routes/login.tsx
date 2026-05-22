import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import escudo from "@/assets/escudo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Aliança do Campo Grande" }] }),
});

const ADMIN_EMAILS = ["aliancacgec2004@gmail.com"];

function LoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    navigate({ to: isAdmin ? "/admin/campeonato" : "/jogadores", replace: true });
  }, [user, isAdmin, loading, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setSubmitting(false);

    if (authError) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    const isAdminEmail = ADMIN_EMAILS.includes(data.user?.email?.toLowerCase() ?? "");
    navigate({ to: isAdminEmail ? "/admin/campeonato" : "/jogadores", replace: true });
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-5 py-16 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-8 shadow-xl">
        <div className="flex flex-col items-center gap-3 mb-8">
          <img src={escudo} alt="Aliança" className="h-16 w-16 object-contain" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Aliança do Campo Grande</h1>
            <p className="mt-1 text-sm text-muted-foreground">Acesso ao sistema</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-5 flex flex-col gap-2 text-center text-sm">
          <Link to="/esqueci-senha" className="text-primary hover:underline">
            Esqueci minha senha
          </Link>
          <span className="text-muted-foreground">
            Não tem conta?{" "}
            <Link to="/cadastro" className="text-primary font-medium hover:underline">
              Cadastre-se
            </Link>
          </span>
          <Link to="/" className="text-muted-foreground hover:underline">
            ← Voltar ao site
          </Link>
        </div>
      </div>
    </div>
  );
}
