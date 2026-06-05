import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Upload, ShoppingBag, Eye, EyeOff, Package } from "lucide-react";
import { toast } from "sonner";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  foto_url: string | null;
  categoria: string;
  disponivel: boolean;
}

interface Pedido {
  id: string;
  user_id: string;
  itens: Array<{ produto_nome: string; quantidade: number; tamanho: string; preco_unit: number | null }>;
  observacoes: string | null;
  total: number | null;
  status: string;
  created_at: string;
}

const CATEGORIAS = ["Camisa", "Uniforme", "Agasalho", "Bolsa", "Acessório", "Comemorativo", "Outro"];

export function AdminStore() {
  const [aba, setAba] = useState<"produtos" | "pedidos">("produtos");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    nome: "", descricao: "", preco: "", categoria: "Camisa", disponivel: true, foto_url: "",
  });

  useEffect(() => { fetchProdutos(); fetchPedidos(); }, []);

  async function fetchProdutos() {
    setLoading(true);
    const { data } = await supabase.from("store_produtos").select("*").order("categoria").order("nome");
    setProdutos(data ?? []);
    setLoading(false);
  }

  async function fetchPedidos() {
    const { data } = await supabase.from("store_pedidos").select("*").order("created_at", { ascending: false });
    setPedidos((data ?? []) as Pedido[]);
  }

  async function uploadFoto(file: File): Promise<string | null> {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `store/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("store-fotos").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) { toast.error("Erro ao enviar foto"); return null; }
    const { data } = supabase.storage.from("store-fotos").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadFoto(file);
    if (url) setForm((f) => ({ ...f, foto_url: url }));
  }

  async function salvarProduto() {
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      preco: form.preco ? parseFloat(form.preco) : null,
      categoria: form.categoria,
      disponivel: form.disponivel,
      foto_url: form.foto_url || null,
    };
    const { error } = await supabase.from("store_produtos").insert(payload);
    if (error) return toast.error(`Erro: ${error.message}`);
    toast.success("Produto adicionado!");
    setForm({ nome: "", descricao: "", preco: "", categoria: "Camisa", disponivel: true, foto_url: "" });
    setShowForm(false);
    fetchProdutos();
  }

  async function toggleDisponivel(id: string, val: boolean) {
    await supabase.from("store_produtos").update({ disponivel: val }).eq("id", id);
    setProdutos((prev) => prev.map((p) => p.id === id ? { ...p, disponivel: val } : p));
  }

  async function excluirProduto(id: string) {
    if (!confirm("Excluir produto?")) return;
    await supabase.from("store_produtos").delete().eq("id", id);
    setProdutos((prev) => prev.filter((p) => p.id !== id));
    toast.success("Produto removido");
  }

  async function atualizarStatusPedido(id: string, status: string) {
    await supabase.from("store_pedidos").update({ status }).eq("id", id);
    setPedidos((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  }

  const STATUS_CORES: Record<string, string> = {
    pendente: "text-amber-400 bg-amber-400/10",
    confirmado: "text-blue-400 bg-blue-400/10",
    producao: "text-purple-400 bg-purple-400/10",
    entregue: "text-green-400 bg-green-400/10",
    cancelado: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Aliança Store</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setAba("produtos")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${aba === "produtos" ? "bg-accent text-accent-foreground" : "border border-white/10 text-muted-foreground hover:bg-white/5"}`}
          >
            <ShoppingBag className="inline h-4 w-4 mr-1" />Produtos
          </button>
          <button
            onClick={() => setAba("pedidos")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${aba === "pedidos" ? "bg-accent text-accent-foreground" : "border border-white/10 text-muted-foreground hover:bg-white/5"}`}
          >
            <Package className="inline h-4 w-4 mr-1" />Pedidos
            {pedidos.filter((p) => p.status === "pendente").length > 0 && (
              <span className="ml-1.5 rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
                {pedidos.filter((p) => p.status === "pendente").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── ABA PRODUTOS ── */}
      {aba === "produtos" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition"
          >
            <Plus className="h-4 w-4" /> Adicionar Produto
          </button>

          {showForm && (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-5 space-y-4">
              <h3 className="font-bold">Novo Produto</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome *</label>
                  <input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50" placeholder="Ex: Camisa Titular 2025" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoria</label>
                  <select value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                    className="w-full rounded-xl border border-white/10 bg-[#0d1435] px-3 py-2 text-sm outline-none focus:border-accent/50">
                    {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preço (R$)</label>
                  <input value={form.preco} onChange={(e) => setForm((f) => ({ ...f, preco: e.target.value }))} type="number" min="0" step="0.01"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50" placeholder="0.00" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Disponível</label>
                  <div className="flex items-center gap-2 mt-2">
                    <div onClick={() => setForm((f) => ({ ...f, disponivel: !f.disponivel }))}
                      className={`relative h-5 w-9 rounded-full cursor-pointer transition ${form.disponivel ? "bg-accent" : "bg-white/10"}`}>
                      <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${form.disponivel ? "translate-x-4" : ""}`} />
                    </div>
                    <span className="text-sm text-muted-foreground">{form.disponivel ? "Sim" : "Não"}</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descrição</label>
                <textarea value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-accent/50 resize-none" placeholder="Descrição do produto..." />
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Foto do Produto</label>
                <div className="flex items-center gap-3">
                  {form.foto_url && (
                    <img src={form.foto_url} alt="preview" className="h-16 w-16 rounded-xl object-cover border border-white/10" />
                  )}
                  <button onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/5 transition disabled:opacity-50">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Enviando..." : "Enviar foto"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={salvarProduto} className="rounded-xl bg-accent px-5 py-2 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition">
                  Salvar Produto
                </button>
                <button onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-5 py-2 text-sm font-medium hover:bg-white/5 transition">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {[...Array(3)].map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />)}
            </div>
          ) : produtos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 py-12 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p>Nenhum produto cadastrado.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {produtos.map((p) => (
                <div key={p.id} className={`rounded-2xl border p-4 ${p.disponivel ? "border-white/10" : "border-white/5 opacity-60"}`}>
                  {p.foto_url && (
                    <div className="mb-3 aspect-video overflow-hidden rounded-xl bg-white/5">
                      <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground uppercase font-semibold">{p.categoria}</p>
                  <p className="font-bold mt-0.5">{p.nome}</p>
                  {p.preco && <p className="text-accent font-black">R$ {p.preco.toFixed(2)}</p>}
                  {p.descricao && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.descricao}</p>}
                  <div className="mt-3 flex items-center gap-2">
                    <button onClick={() => toggleDisponivel(p.id, !p.disponivel)}
                      className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${p.disponivel ? "bg-green-500/15 text-green-400" : "bg-white/5 text-muted-foreground"}`}>
                      {p.disponivel ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {p.disponivel ? "Visível" : "Oculto"}
                    </button>
                    <button onClick={() => excluirProduto(p.id)}
                      className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-red-400/40 hover:bg-red-500/10 hover:text-red-400 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ABA PEDIDOS ── */}
      {aba === "pedidos" && (
        <div className="space-y-3">
          {pedidos.length === 0 ? (
            <div className="rounded-2xl border border-white/10 py-12 text-center text-muted-foreground">
              <Package className="mx-auto mb-3 h-8 w-8 opacity-30" />
              <p>Nenhum pedido recebido ainda.</p>
            </div>
          ) : (
            pedidos.map((p) => (
              <div key={p.id} className="rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}</p>
                    <p className="font-semibold mt-0.5">Pedido #{p.id.slice(0, 8).toUpperCase()}</p>
                    {p.total && p.total > 0 && <p className="text-accent font-black">R$ {p.total.toFixed(2)}</p>}
                  </div>
                  <select
                    value={p.status}
                    onChange={(e) => atualizarStatusPedido(p.id, e.target.value)}
                    className={`rounded-xl border-0 px-3 py-1.5 text-xs font-bold outline-none cursor-pointer ${STATUS_CORES[p.status] ?? "text-muted-foreground bg-white/5"}`}
                  >
                    {["pendente", "confirmado", "producao", "entregue", "cancelado"].map((s) => (
                      <option key={s} value={s} className="bg-[#0d1435] text-white">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  {p.itens.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-xl bg-white/3 px-3 py-2 text-sm">
                      <span className="font-medium">{item.produto_nome}</span>
                      <span className="text-muted-foreground">Tam. {item.tamanho} × {item.quantidade}</span>
                    </div>
                  ))}
                </div>
                {p.observacoes && (
                  <p className="text-xs text-muted-foreground border-t border-white/8 pt-2">
                    <span className="font-semibold">Obs:</span> {p.observacoes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
