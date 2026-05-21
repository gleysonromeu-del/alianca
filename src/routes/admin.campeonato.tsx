import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-role";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { WatermarkBackground } from "@/components/site/WatermarkBackground";
import { DraftBoard } from "@/components/admin/DraftBoard";
import { SumulaForm } from "@/components/admin/SumulaForm";
import {
  type Time,
  type Partida,
  useCampeonatoAtual,
  useTimes,
  usePartidas,
  useJogadores,
  useCampeonatoRealtime,
  formatMes,
} from "@/hooks/use-campeonato";
import { ArrowLeft, Plus, Trash2, Trophy } from "lucide-react";

export const Route = createFileRoute("/admin/campeonato")({
  component: AdminCampeonatoPage,
  head: () => ({ meta: [{ title: "Admin · Campeonato Mensal" }] }),
});

function AdminCampeonatoPage() {
  useCampeonatoRealtime();
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsAdmin(user?.id);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  if (loading || roleLoading) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Carregando…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-center">
        <div>
          <p className="text-lg font-semibold">Acesso restrito</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Apenas administradores podem gerenciar o campeonato.
          </p>
          <Link to="/" className="mt-4 inline-block text-accent underline">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <WatermarkBackground />
      <Navbar />
      <main className="pt-28 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="mt-4 text-3xl md:text-5xl font-black tracking-tight">
            Admin · <span className="text-gradient-gold">Campeonato Mensal</span>
          </h1>
          <AdminBody />
        </div>
      </main>
      <Footer />
    </div>
  );
}

function AdminBody() {
  const { data: camp } = useCampeonatoAtual();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  async function criarCampeonato() {
    setCreating(true);
    try {
      const now = new Date();
      const mes = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { error } = await supabase
        .from("campeonato_mensal")
        .insert({ mes, status: "aberto" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["campeonato-atual"] });
      toast.success("Campeonato criado");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error(`Erro: ${msg}`);
    } finally {
      setCreating(false);
    }
  }

  if (!camp) {
    return (
      <div className="mt-10 rounded-3xl glass p-8 text-center">
        <p className="text-lg font-semibold">Nenhum campeonato aberto.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Crie o campeonato do mês atual para começar.
        </p>
        <Button className="mt-4" onClick={criarCampeonato} disabled={creating}>
          <Plus className="mr-1 h-4 w-4" /> Criar campeonato deste mês
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-muted-foreground">
        Mês ativo: <span className="font-semibold text-foreground">{formatMes(camp.mes)}</span>
      </p>
      <Tabs defaultValue="times" className="mt-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="times">Times</TabsTrigger>
          <TabsTrigger value="draft">Draft</TabsTrigger>
          <TabsTrigger value="partidas">Partidas</TabsTrigger>
          <TabsTrigger value="sumula">Súmula</TabsTrigger>
          <TabsTrigger value="encerrar">Encerrar</TabsTrigger>
        </TabsList>
        <TabsContent value="times" className="mt-6">
          <TimesManager campeonatoId={camp.id} />
        </TabsContent>
        <TabsContent value="draft" className="mt-6">
          <DraftBoard campeonatoId={camp.id} />
        </TabsContent>
        <TabsContent value="partidas" className="mt-6">
          <PartidasManager campeonatoId={camp.id} />
        </TabsContent>
        <TabsContent value="sumula" className="mt-6">
          <SumulaTab campeonatoId={camp.id} />
        </TabsContent>
        <TabsContent value="encerrar" className="mt-6">
          <EncerrarTab campeonatoId={camp.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TimesManager({ campeonatoId }: { campeonatoId: string }) {
  const qc = useQueryClient();
  const { data: times = [] } = useTimes(campeonatoId);
  const { data: jogadores = [] } = useJogadores();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#FFD166");
  const [adding, setAdding] = useState(false);

  async function adicionar() {
    if (!nome.trim()) return;
    if (times.length >= 4) {
      toast.error("Máximo de 4 times por mês.");
      return;
    }
    setAdding(true);
    try {
      const { error } = await supabase
        .from("times")
        .insert({ campeonato_id: campeonatoId, nome: nome.trim(), cor });
      if (error) throw error;
      setNome("");
      qc.invalidateQueries({ queryKey: ["times", campeonatoId] });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error(`Erro: ${msg}`);
    } finally {
      setAdding(false);
    }
  }

  async function atualizar(id: string, patch: Partial<Time>) {
    const { error } = await supabase.from("times").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["times", campeonatoId] });
  }

  async function remover(id: string) {
    if (!confirm("Remover este time?")) return;
    const { error } = await supabase.from("times").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["times", campeonatoId] });
  }

  async function uploadEscudo(timeId: string, file: File) {
    const path = `${campeonatoId}/${timeId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("escudos").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("escudos").getPublicUrl(path);
    await atualizar(timeId, { escudo_url: data.publicUrl } as Partial<Time>);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl glass p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[160px]">
          <Label>Nome do time</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Os Imortais" />
        </div>
        <div>
          <Label>Cor</Label>
          <Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-16 p-1" />
        </div>
        <Button onClick={adicionar} disabled={adding || times.length >= 4}>
          <Plus className="mr-1 h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {times.map((t) => (
          <div key={t.id} className="rounded-2xl glass p-4 space-y-3" style={{ borderTop: `4px solid ${t.cor ?? "#FFD166"}` }}>
            <div className="flex items-start gap-3">
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-white/10 overflow-hidden">
                {t.escudo_url ? (
                  <img src={t.escudo_url} alt={t.nome} className="h-full w-full object-cover" />
                ) : (
                  <Trophy className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-2">
                <Input
                  defaultValue={t.nome}
                  onBlur={(e) => e.target.value !== t.nome && atualizar(t.id, { nome: e.target.value })}
                />
                <div className="flex gap-2 items-center">
                  <Input
                    type="color"
                    defaultValue={t.cor ?? "#FFD166"}
                    onBlur={(e) => atualizar(t.id, { cor: e.target.value })}
                    className="h-8 w-12 p-1"
                  />
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && uploadEscudo(t.id, e.target.files[0])}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <button
                onClick={() => remover(t.id)}
                className="text-destructive hover:text-destructive/80"
                aria-label="Remover"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div>
              <Label className="text-xs">Capitão</Label>
              <Select
                value={t.capitao_id ?? ""}
                onValueChange={(v) => atualizar(t.id, { capitao_id: v || null } as Partial<Time>)}
              >
                <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                <SelectContent>
                  {jogadores.map((j) => (
                    <SelectItem key={j.id} value={j.id}>{j.apelido}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              {t.pontos} pts · {t.vitorias}V {t.empates}E {t.derrotas}D · SG {t.gols_pro - t.gols_contra}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartidasManager({ campeonatoId }: { campeonatoId: string }) {
  const qc = useQueryClient();
  const { data: times = [] } = useTimes(campeonatoId);
  const { data: partidas = [] } = usePartidas(campeonatoId);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [data, setData] = useState("");

  async function criar() {
    if (!a || !b || a === b) {
      toast.error("Selecione dois times diferentes.");
      return;
    }
    const { error } = await supabase.from("partidas").insert({
      campeonato_id: campeonatoId,
      time_a_id: a,
      time_b_id: b,
      data: data || null,
    });
    if (error) toast.error(error.message);
    else {
      setA(""); setB(""); setData("");
      qc.invalidateQueries({ queryKey: ["partidas", campeonatoId] });
    }
  }

  async function lancar(p: Partida, gols_a: number, gols_b: number) {
    const { error } = await supabase.from("partidas")
      .update({ gols_a, gols_b, status: "finalizada" })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["partidas", campeonatoId] });
  }

  async function remover(id: string) {
    if (!confirm("Excluir partida?")) return;
    await supabase.from("partidas").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["partidas", campeonatoId] });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl glass p-4 grid gap-3 md:grid-cols-4 items-end">
        <div>
          <Label>Time A</Label>
          <Select value={a} onValueChange={setA}>
            <SelectTrigger><SelectValue placeholder="Time A" /></SelectTrigger>
            <SelectContent>
              {times.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Time B</Label>
          <Select value={b} onValueChange={setB}>
            <SelectTrigger><SelectValue placeholder="Time B" /></SelectTrigger>
            <SelectContent>
              {times.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Data/hora</Label>
          <Input type="datetime-local" value={data} onChange={(e) => setData(e.target.value)} />
        </div>
        <Button onClick={criar}><Plus className="mr-1 h-4 w-4" /> Agendar</Button>
      </div>

      <div className="space-y-3">
        {partidas.map((p) => {
          const tA = times.find((t) => t.id === p.time_a_id);
          const tB = times.find((t) => t.id === p.time_b_id);
          return (
            <div key={p.id} className="rounded-2xl glass p-4 flex flex-wrap items-center gap-3">
              <span className="font-semibold flex-1 min-w-[120px]">{tA?.nome ?? "?"}</span>
              <Input
                type="number"
                defaultValue={p.gols_a}
                min={0}
                className="h-9 w-16 text-center"
                onBlur={(e) => {
                  const g = Number(e.target.value) || 0;
                  if (g !== p.gols_a) lancar(p, g, p.gols_b);
                }}
              />
              <span className="text-muted-foreground">×</span>
              <Input
                type="number"
                defaultValue={p.gols_b}
                min={0}
                className="h-9 w-16 text-center"
                onBlur={(e) => {
                  const g = Number(e.target.value) || 0;
                  if (g !== p.gols_b) lancar(p, p.gols_a, g);
                }}
              />
              <span className="font-semibold flex-1 min-w-[120px] text-right">{tB?.nome ?? "?"}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${p.status === "finalizada" ? "bg-accent/20 text-accent" : "bg-white/10"}`}>
                {p.status}
              </span>
              <button
                onClick={() => remover(p.id)}
                className="text-destructive hover:text-destructive/80"
                aria-label="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        {partidas.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma partida ainda.</p>
        )}
      </div>
    </div>
  );
}

function SumulaTab({ campeonatoId }: { campeonatoId: string }) {
  const { data: times = [] } = useTimes(campeonatoId);
  const { data: partidas = [] } = usePartidas(campeonatoId);
  const [selectedId, setSelectedId] = useState<string>("");
  const partida = partidas.find((p) => p.id === selectedId);
  const label = (p: Partida) =>
    `${times.find((t) => t.id === p.time_a_id)?.nome ?? "?"} × ${times.find((t) => t.id === p.time_b_id)?.nome ?? "?"} ${p.data ? `(${new Date(p.data).toLocaleDateString("pt-BR")})` : ""}`;

  return (
    <div className="space-y-4">
      <div>
        <Label>Partida</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger><SelectValue placeholder="Selecione uma partida" /></SelectTrigger>
          <SelectContent>
            {partidas.map((p) => (
              <SelectItem key={p.id} value={p.id}>{label(p)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {partida && <SumulaForm partida={partida} />}
    </div>
  );
}

function EncerrarTab({ campeonatoId }: { campeonatoId: string }) {
  const qc = useQueryClient();
  const { data: times = [] } = useTimes(campeonatoId);
  const [busy, setBusy] = useState(false);

  const ordenados = [...times];
  const campeao = ordenados[0];
  const pagador = ordenados[ordenados.length - 1];

  async function encerrar() {
    if (!confirm("Encerrar o campeonato deste mês? O campeão segue para o próximo mês e os outros 3 times serão desmontados.")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("encerrar_campeonato", { _camp_id: campeonatoId });
      if (error) throw error;
      toast.success("Mês encerrado e próximo campeonato criado!");
      qc.invalidateQueries();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "erro";
      toast.error(`Erro: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl glass p-6">
        <h3 className="text-lg font-bold">Previsão</h3>
        <p className="mt-2 text-sm">
          Campeão: <span className="font-bold text-accent">{campeao?.nome ?? "—"}</span>
        </p>
        <p className="text-sm">
          Pagador de cerveja: <span className="font-bold text-amber-400">{pagador?.nome ?? "—"}</span>
        </p>
      </div>
      <Button variant="destructive" onClick={encerrar} disabled={busy}>
        {busy ? "Encerrando…" : "Encerrar mês"}
      </Button>
    </div>
  );
}