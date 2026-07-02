import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTurnstile } from "@/hooks/use-turnstile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import escudo from "@/assets/escudo.png";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({ meta: [{ title: "Entrar — Aliança do Campo Grande" }] }),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [ready, setReady] = useState(false);
  const didSignOut = useRef(false);

  const { containerRef, token, reset } = useTurnstile();

  useEffect(() => {
    // Sempre faz signOut ao entrar na página de login
    // e só mostra o formulário após o logout completar
    if (didSignOut.current) return;
    didSignOut.current = true;
    supabase.auth.signOut().finally(() => setReady(true));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Confirme que você não é um robô.");
      return;
    }

    setSubmitting(true);

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: token },
    });

    if (authError || !data.session) {
      setSubmitting(false);
      console.error("[Auth Error]", authError?.status, authError?.message);
      setError("E-mail ou senha incorretos.");
      reset();
      return;
    }

    // Login bem-sucedido — redireciona
    navigate({ to: "/jogadores", replace: true });
  }

  if (!ready) {
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
              disabled={submitting}
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
              disabled={submitting}
            />
          </div>

          {/* Widget Turnstile */}
          <div>
            <div ref={containerRef} />
            {!token && (
              <p className="text-xs text-muted-foreground mt-1">
                Aguardando verificação de segurança...
              </p>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive rounded-lg bg-destructive/10 px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !token}>
            {submitting ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Entrando...
              </span>
            ) : token ? "Entrar" : "Aguardando verificação..."}
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
