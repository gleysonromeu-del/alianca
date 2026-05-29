import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase, POSICOES } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MomentosUpload } from "@/components/site/MomentosUpload";
import { toast } from "sonner";
import AdminCampeonato from "@/pages/admin/AdminCampeonato";
import { ChevronDown } from "lucide-react";

export const Route = createFileRoute("/jogadores")({
  component: JogadoresPage,
  head: () => ({ meta: [{ title: "Área dos Jogadores — Aliança do Campo Grande" }] }),
});

const ADMIN_WHATSAPP = "5511924490876";

type Jogador = {
  id: string;
  nome_completo: string;
  apelido: string;
  cpf: string | null;
  profissao: string | null;
  telefone: string | null;
  email: string | null;
  posicao: string;
  numero_camisa: number | null;
  ativo: boolean | null;
};

type Pagamento = {
  id: string;
  jogador_id: string;
  comprovante_url: string;
  referencia: string | null;
  valor: number | null;
  status: string;
  criado_em: string;
};

type Inscricao = {
  id: string;
  nome_completo: string;
  apelido: string;
  cpf: string;
  telefone: string;
  data_nascimento: string;
  profissao: string | null;
  posicao: string;
  numero_camisa: number | null;
  email: string;
  quem_indicou: string;
  status: string;
  criado_em: string;
};

// Abas do painel admin
type AdminAba = "inscricoes" | "elenco" | "pagamentos" | "campeonato";

// ── Card de jogador colapsável ────────────────────────────────────────────────
function JogadorCard({ p }: { p: Jogador }) {
  const [open, setOpen] = useState(false);
  const temDetalhes = p.cpf || p.telefone || p.email || p.profissao;

  return (
    <div className="rounded-xl border border-white/10 bg-card/60 backdrop-blur-xl overflow-hidden">
      {/* Linha principal — sempre visível */}
      <button
        type="button"
        onClick={() => temDetalhes && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition ${
          temDetalhes ? "hover:bg-white/5 cursor-pointer" : "cursor-default"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar inicial */}
          <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/20 grid place-items-center text-xs font-black text-primary">
            {(p.apelido || p.nome_completo)?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {p.nome_completo}
              {p.numero_camisa ? (
                <span className="ml-1.5 text-primary">#{p.numero_camisa}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              "{p.apelido}" · {p.posicao}
            </p>
          </div>
        </div>

        {temDetalhes && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Detalhes — expansível */}
      {open && temDetalhes && (
        <div className="border-t border-white/10 px-4 py-3 space-y-1 text-xs text-muted-foreground">
          {p.cpf      && <p>🪪 CPF: {p.cpf}</p>}
          {p.telefone && <p>📞 {p.telefone}</p>}
          {p.email    && <p>✉️ {p.email}</p>}
          {p.profissao && <p>💼 {p.profissao}</p>}
        </div>
      )}
    </div>
  );
}

function JogadoresPage() {
  const { user, loading } = useAuth();
  const { isAdmin } = useIsAdmin(user?.id);
  const navigate = useNavigate();
  const [me, setMe] = useState<Jogador | null>(null);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [adminAba, setAdminAba] = useState<AdminAba>("inscricoes");

  // upload form
  const [file, setFile] = useState<File | null>(null);
  const [referencia, setReferencia] = useState("");
  const [valor, setValor] = useState("");
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // edit profile
  const [editing, setEditing] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    nome_completo: "",
    apelido: "",
    cpf: "",
    telefone: "",
    email: "",
    profissao: "",
    posicao: "",
    numero_camisa: "",
  });

  useEffect(() => {
    if (me) {
      setEditForm({
        nome_completo: me.nome_completo ?? "",
        apelido: me.apelido ?? "",
        cpf: me.cpf ?? "",
        telefone: me.telefone ?? "",
        email: me.email ?? "",
        profissao: me.profissao ?? "",
        posicao: me.posicao ?? "",
        numero_camisa: me.numero_camisa ? String(me.numero_camisa) : "",
      });
    }
  }, [me]);

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSavingEdit(true);
    setEditMsg(null);
    const { error } = await supabase.from("jogadores").update({
      nome_completo: editForm.nome_completo,
      apelido: editForm.apelido,
      cpf: editForm.cpf || null,
      telefone: editForm.telefone || null,
      email: editForm.email || null,
      profissao: editForm.profissao || null,
      posicao: editForm.posicao,
      numero_camisa: editForm.numero_camisa ? Number(editForm.numero_camisa) : null,
    }).eq("id", user.id);
    setSavingEdit(false);
    if (error) return setEditMsg(error.message);
    setEditMsg("Cadastro atualizado!");
    setEditing(false);
    await refresh();
  }

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  async function refresh() {
    if (!user) return;
    const { data } = await supabase.from("jogadores").select("*").order("nome_completo");
    const list = (data as Jogador[]) ?? [];
    setJogadores(list);
    setMe(list.find((p) => p.id === user.id) ?? null);

    const { data: pags } = await supabase
      .from("pagamentos")
      .select("*")
      .order("criado_em", { ascending: false });
    setPagamentos((pags as Pagamento[]) ?? []);

    if (isAdmin) {
      const { data: ins } = await supabase
        .from("inscricoes")
        .select("*")
        .order("criado_em", { ascending: false });
      setInscricoes((ins as Inscricao[]) ?? []);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase
      .channel("inscricoes-admin")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "inscricoes" },
        (payload) => {
          const novo = payload.new as Inscricao;
          toast.success(`Nova inscrição: ${novo.nome_completo}`, {
            description: `Indicado por ${novo.quem_indicou}`,
          });
          setInscricoes((prev) => [novo, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  async function setInscricaoStatus(id: string, status: string) {
    await supabase.from("inscricoes").update({ status }).eq("id", id);
    await refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!user || !file) return;
    setUploading(true);
    setFeedback(null);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("comprovantes")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("comprovantes").getPublicUrl(path);
      const { error: insErr } = await supabase.from("pagamentos").insert({
        jogador_id: user.id,
        comprovante_url: pub.publicUrl,
        referencia: referencia || null,
        valor: valor ? Number(valor) : null,
      });
      if (insErr) throw insErr;
      const nome = me?.nome_completo || me?.apelido || user.email;
      const msg = `Olá! Enviei o comprovante de mensalidade.%0AJogador: ${nome}%0A` +
        (referencia ? `Referência: ${referencia}%0A` : "") +
        (valor ? `Valor: R$ ${valor}%0A` : "") +
        `Comprovante: ${pub.publicUrl}`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${msg}`, "_blank");
      setFeedback("Comprovante enviado! Notificação aberta no WhatsApp.");
      setFile(null);
      setReferencia("");
      setValor("");
      await refresh();
    } catch (err: any) {
      setFeedback(err.message ?? "Erro ao enviar comprovante");
    } finally {
      setUploading(false);
    }
  }

  async function setStatus(id: string, status: string) {
    await supabase.from("pagamentos").update({ status }).eq("id", id);
    await refresh();
  }

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">Carregando...</div>;
  if (!user) return null;

  // ── Abas do admin ──────────────────────────────────────────────────────────
  const ABAS: { id: AdminAba; label: string; badge?: number }[] = [
    {
      id: "inscricoes",
      label: "Inscrições",
      badge: inscricoes.filter((i) => i.status === "pendente").length || undefined,
    },
    { id: "elenco", label: "Elenco" },
    { id: "pagamentos", label: "Comprovantes" },
    { id: "campeonato", label: "⚽ Campeonato" },
  ];

  return (
    <div className="min-h-screen bg-background px-5 py-12">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {isAdmin ? "Painel do Administrador" : "Área do Jogador"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Bem-vindo, {me?.apelido ?? user.email}
              {isAdmin && (
                <span className="ml-2 rounded-full bg-primary/20 text-primary px-2 py-0.5 text-xs">admin</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/" className="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm hover:bg-accent">
              Site
            </Link>
            <Button variant="outline" onClick={logout}>Sair</Button>
          </div>
        </div>

        {/* ── JOGADOR (não-admin) ── */}
        {me && !isAdmin && (
          <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-5 items-start">
              <div className="h-28 w-28 rounded-2xl bg-muted grid place-items-center text-3xl font-bold text-muted-foreground">
                {me.apelido?.[0] ?? "?"}
              </div>
              <div className="flex-1 space-y-1">
                <h2 className="text-xl font-bold text-foreground">
                  {me.nome_completo} {me.numero_camisa ? <span className="text-primary">#{me.numero_camisa}</span> : null}
                </h2>
                <p className="text-sm text-muted-foreground">"{me.apelido}" — {me.posicao}</p>
                {me.cpf && <p className="text-sm text-muted-foreground">CPF: {me.cpf}</p>}
                {me.profissao && <p className="text-sm text-muted-foreground">💼 {me.profissao}</p>}
                {me.telefone && <p className="text-sm text-muted-foreground">📞 {me.telefone}</p>}
                {me.email && <p className="text-sm text-muted-foreground">✉️ {me.email}</p>}
              </div>
              <Button variant="outline" onClick={() => setEditing((v) => !v)}>
                {editing ? "Cancelar" : "Alterar meu cadastro"}
              </Button>
            </div>
            {editing && (
              <form onSubmit={handleUpdateProfile} className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/10 pt-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nome completo</Label>
                  <Input value={editForm.nome_completo} onChange={(e) => setEditForm((f) => ({ ...f, nome_completo: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Apelido</Label>
                  <Input value={editForm.apelido} onChange={(e) => setEditForm((f) => ({ ...f, apelido: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>CPF</Label>
                  <Input value={editForm.cpf} onChange={(e) => setEditForm((f) => ({ ...f, cpf: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={editForm.telefone} onChange={(e) => setEditForm((f) => ({ ...f, telefone: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Profissão</Label>
                  <Input value={editForm.profissao} onChange={(e) => setEditForm((f) => ({ ...f, profissao: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Posição</Label>
                  <select
                    value={editForm.posicao}
                    onChange={(e) => setEditForm((f) => ({ ...f, posicao: e.target.value }))}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                  >
                    {POSICOES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Número da camisa</Label>
                  <Input type="number" min={1} max={200} value={editForm.numero_camisa} onChange={(e) => setEditForm((f) => ({ ...f, numero_camisa: e.target.value }))} />
                </div>
                {editMsg && <p className="md:col-span-2 text-sm text-muted-foreground">{editMsg}</p>}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={savingEdit}>{savingEdit ? "Salvando..." : "Salvar alterações"}</Button>
                </div>
              </form>
            )}
          </div>
        )}

        {!isAdmin && (
          <MomentosUpload userId={user.id} autorNome={me?.apelido || me?.nome_completo || (user.email ?? "Jogador")} />
        )}

        {!isAdmin && (
          <div className="rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-1">Enviar comprovante de mensalidade</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Anexe o comprovante. Ao enviar, abrimos o WhatsApp para você confirmar com o admin.
            </p>
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="comprovante">Comprovante *</Label>
                <Input id="comprovante" type="file" accept="image/*,application/pdf" required onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ref">Referência (mês)</Label>
                <Input id="ref" placeholder="Ex: 05/2026" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor">Valor (R$)</Label>
                <Input id="valor" type="number" step="0.01" min="0" value={valor} onChange={(e) => setValor(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full" disabled={uploading || !file}>
                  {uploading ? "Enviando..." : "Enviar comprovante"}
                </Button>
              </div>
              {feedback && <p className="md:col-span-3 text-sm text-muted-foreground">{feedback}</p>}
            </form>
          </div>
        )}

        {!isAdmin && pagamentos.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-3">Meus comprovantes</h2>
            <div className="space-y-2">
              {pagamentos.map((p) => (
                <div key={p.id} className="rounded-xl border border-white/10 bg-card/60 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{p.referencia ?? "—"} {p.valor ? `· R$ ${p.valor}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.criado_em).toLocaleString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs rounded-full px-2 py-1 ${p.status === "confirmado" ? "bg-green-500/20 text-green-300" : p.status === "rejeitado" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>{p.status}</span>
                    <a href={p.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">ver</a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADMIN ── */}
        {isAdmin && (
          <>
            {/* Badge pendentes */}
            {inscricoes.filter((i) => i.status === "pendente").length > 0 && (
              <div className="mb-5 rounded-2xl border border-accent/40 bg-accent/10 p-4">
                <p className="text-sm font-semibold text-accent">
                  🔔 {inscricoes.filter((i) => i.status === "pendente").length} nova(s) inscrição(ões) aguardando análise
                </p>
              </div>
            )}

            {/* ── Navegação por abas ── */}
            <div className="mb-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
              {ABAS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAdminAba(a.id)}
                  className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    adminAba === a.id
                      ? "bg-primary/20 text-primary border border-primary/30"
                      : "border border-white/10 text-muted-foreground hover:bg-white/5"
                  }`}
                >
                  {a.label}
                  {a.badge ? (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white">
                      {a.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* ── Aba: Inscrições ── */}
            {adminAba === "inscricoes" && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-4">Inscrições recebidas ({inscricoes.length})</h2>
                <div className="space-y-2 mb-10">
                  {inscricoes.map((i) => (
                    <div key={i.id} className="rounded-xl border border-white/10 bg-card/60 p-3">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {i.nome_completo} <span className="text-muted-foreground">"{i.apelido}"</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {i.posicao} · 📞 {i.telefone} · ✉️ {i.email}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            CPF: {i.cpf} · Nasc: {i.data_nascimento}
                            {i.profissao ? ` · 💼 ${i.profissao}` : ""}
                          </p>
                          <p className="text-xs text-accent mt-1">Indicado por: {i.quem_indicou}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(i.criado_em).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs rounded-full px-2 py-1 ${i.status === "aprovado" ? "bg-green-500/20 text-green-300" : i.status === "rejeitado" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>{i.status}</span>
                          {i.status !== "aprovado" && <Button size="sm" onClick={() => setInscricaoStatus(i.id, "aprovado")}>Aprovar</Button>}
                          {i.status !== "rejeitado" && <Button size="sm" variant="outline" onClick={() => setInscricaoStatus(i.id, "rejeitado")}>Rejeitar</Button>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {inscricoes.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma inscrição recebida.</p>}
                </div>
              </>
            )}

            {/* ── Aba: Elenco ── */}
            {adminAba === "elenco" && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Elenco ({jogadores.length})
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Clique em um jogador para ver os detalhes.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-10">
                  {jogadores.map((p) => (
                    <JogadorCard key={p.id} p={p} />
                  ))}
                  {jogadores.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum jogador cadastrado.</p>
                  )}
                </div>
              </>
            )}

            {/* ── Aba: Comprovantes ── */}
            {adminAba === "pagamentos" && (
              <>
                <h2 className="text-xl font-bold text-foreground mb-4">Comprovantes recebidos ({pagamentos.length})</h2>
                <div className="space-y-2">
                  {pagamentos.map((p) => {
                    const j = jogadores.find((x) => x.id === p.jogador_id);
                    return (
                      <div key={p.id} className="rounded-xl border border-white/10 bg-card/60 p-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground">{j?.nome_completo ?? p.jogador_id} — {p.referencia ?? "—"} {p.valor ? `· R$ ${p.valor}` : ""}</p>
                          <p className="text-xs text-muted-foreground">{new Date(p.criado_em).toLocaleString("pt-BR")}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <a href={p.comprovante_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">ver comprovante</a>
                          <span className={`text-xs rounded-full px-2 py-1 ${p.status === "confirmado" ? "bg-green-500/20 text-green-300" : p.status === "rejeitado" ? "bg-red-500/20 text-red-300" : "bg-yellow-500/20 text-yellow-300"}`}>{p.status}</span>
                          {p.status !== "confirmado" && <Button size="sm" onClick={() => setStatus(p.id, "confirmado")}>Confirmar</Button>}
                          {p.status !== "rejeitado" && <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejeitado")}>Rejeitar</Button>}
                        </div>
                      </div>
                    );
                  })}
                  {pagamentos.length === 0 && <p className="text-sm text-muted-foreground">Nenhum comprovante enviado ainda.</p>}
                </div>
            </>
            )}

            {/* ── Aba: Campeonato ── */}
            {adminAba === "campeonato" && (
              <AdminCampeonato />
            )}
          </>
        )}
      </div>
    </div>
  );
}
