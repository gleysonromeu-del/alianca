import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { ShoppingBag, ShoppingCart, X, Plus, Minus, Check, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number | null;
  foto_url: string | null;
  categoria: string;
  disponivel: boolean;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
  tamanho: string;
}

const TAMANHOS = ["PP", "P", "M", "G", "GG", "XG"];

export function AliancaStore() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [showCarrinho, setShowCarrinho] = useState(false);
  const [pedidoEnviado, setPedidoEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [obs, setObs] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("todos");
  const [modalProduto, setModalProduto] = useState<Produto | null>(null);
  const [tamanhoSel, setTamanhoSel] = useState("M");

  useEffect(() => {
    fetchProdutos();
  }, []);

  async function fetchProdutos() {
    setLoading(true);
    const { data } = await supabase
      .from("store_produtos")
      .select("*")
      .eq("disponivel", true)
      .order("categoria")
      .order("nome");
    setProdutos(data ?? []);
    setLoading(false);
  }

  const categorias = ["todos", ...Array.from(new Set(produtos.map((p) => p.categoria)))];
  const produtosFiltrados = categoriaAtiva === "todos" ? produtos : produtos.filter((p) => p.categoria === categoriaAtiva);

  function addCarrinho(produto: Produto, tamanho: string) {
    setCarrinho((prev) => {
      const existe = prev.find((i) => i.produto.id === produto.id && i.tamanho === tamanho);
      if (existe) return prev.map((i) => i.produto.id === produto.id && i.tamanho === tamanho ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { produto, quantidade: 1, tamanho }];
    });
    setModalProduto(null);
  }

  function removeCarrinho(id: string, tamanho: string) {
    setCarrinho((prev) => prev.filter((i) => !(i.produto.id === id && i.tamanho === tamanho)));
  }

  function updateQtd(id: string, tamanho: string, delta: number) {
    setCarrinho((prev) =>
      prev.map((i) => {
        if (i.produto.id === id && i.tamanho === tamanho) {
          const nova = i.quantidade + delta;
          return nova < 1 ? i : { ...i, quantidade: nova };
        }
        return i;
      })
    );
  }

  const totalItens = carrinho.reduce((s, i) => s + i.quantidade, 0);
  const totalPreco = carrinho.reduce((s, i) => s + (i.produto.preco ?? 0) * i.quantidade, 0);

  async function enviarPedido() {
    if (!user || carrinho.length === 0) return;
    setEnviando(true);
    try {
      const itens = carrinho.map((i) => ({
        produto_id: i.produto.id,
        produto_nome: i.produto.nome,
        quantidade: i.quantidade,
        tamanho: i.tamanho,
        preco_unit: i.produto.preco,
      }));
      const { error } = await supabase.from("store_pedidos").insert({
        user_id: user.id,
        itens,
        observacoes: obs.trim() || null,
        total: totalPreco,
        status: "pendente",
      });
      if (error) throw error;
      setPedidoEnviado(true);
      setCarrinho([]);
      setObs("");
    } catch (e) {
      console.error(e);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="py-20 px-6" id="store">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-accent">Loja Oficial</p>
            <h2 className="text-3xl font-black md:text-4xl">Aliança <span className="text-gradient-gold">Store</span></h2>
            <p className="mt-2 text-sm text-muted-foreground">Uniformes, camisas comemorativas, agasalhos e muito mais.</p>
          </div>
          {totalItens > 0 && (
            <button
              onClick={() => setShowCarrinho(true)}
              className="relative flex items-center gap-2 rounded-2xl bg-accent px-5 py-2.5 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition"
            >
              <ShoppingCart className="h-4 w-4" />
              Carrinho
              <span className="absolute -top-2 -right-2 grid h-5 w-5 place-items-center rounded-full bg-red-500 text-xs font-black text-white">
                {totalItens}
              </span>
            </button>
          )}
        </div>

        {/* Categorias */}
        {categorias.length > 1 && (
          <div className="mb-6 flex gap-2 flex-wrap">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoriaAtiva(cat)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
                  categoriaAtiva === cat
                    ? "bg-accent text-accent-foreground"
                    : "border border-white/10 text-muted-foreground hover:bg-white/5"
                }`}
              >
                {cat === "todos" ? "Todos" : cat}
              </button>
            ))}
          </div>
        )}

        {/* Produtos */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="rounded-3xl glass py-16 text-center">
            <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {produtosFiltrados.map((p) => (
              <div
                key={p.id}
                className="group rounded-2xl glass overflow-hidden cursor-pointer transition hover:border-accent/30"
                onClick={() => { setModalProduto(p); setTamanhoSel("M"); }}
              >
                <div className="aspect-square overflow-hidden bg-white/5">
                  {p.foto_url ? (
                    <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{p.categoria}</p>
                  <p className="mt-1 font-bold leading-tight">{p.nome}</p>
                  {p.preco ? (
                    <p className="mt-1 text-lg font-black text-accent">R$ {p.preco.toFixed(2)}</p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Consultar</p>
                  )}
                  <button className="mt-3 w-full rounded-xl bg-accent/15 py-2 text-xs font-bold text-accent hover:bg-accent/25 transition">
                    Adicionar ao pedido
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal produto */}
      {modalProduto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setModalProduto(null); }}
        >
          <div className="w-full max-w-md rounded-3xl glass p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{modalProduto.categoria}</p>
                <h3 className="text-xl font-black">{modalProduto.nome}</h3>
                {modalProduto.preco && <p className="text-2xl font-black text-accent mt-1">R$ {modalProduto.preco.toFixed(2)}</p>}
              </div>
              <button onClick={() => setModalProduto(null)} className="rounded-xl p-2 hover:bg-white/10 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            {modalProduto.foto_url && (
              <div className="mb-4 aspect-square overflow-hidden rounded-2xl bg-white/5">
                <img src={modalProduto.foto_url} alt={modalProduto.nome} className="h-full w-full object-cover" />
              </div>
            )}
            {modalProduto.descricao && (
              <p className="mb-4 text-sm text-muted-foreground">{modalProduto.descricao}</p>
            )}
            {/* Tamanho */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tamanho</p>
              <div className="flex gap-2 flex-wrap">
                {TAMANHOS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTamanhoSel(t)}
                    className={`h-9 w-12 rounded-lg text-sm font-bold transition ${
                      tamanhoSel === t ? "bg-accent text-accent-foreground" : "border border-white/10 hover:bg-white/5"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {!user ? (
              <Link
                to="/login"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground"
              >
                <Lock className="h-4 w-4" /> Entre para fazer pedido
              </Link>
            ) : (
              <button
                onClick={() => addCarrinho(modalProduto, tamanhoSel)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition"
              >
                <ShoppingCart className="h-4 w-4" /> Adicionar ao carrinho
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modal carrinho */}
      {showCarrinho && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setShowCarrinho(false); }}
        >
          <div className="w-full max-w-lg rounded-3xl glass p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black">Seu Pedido</h3>
              <button onClick={() => setShowCarrinho(false)} className="rounded-xl p-2 hover:bg-white/10 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {pedidoEnviado ? (
              <div className="flex flex-col items-center gap-4 py-10 text-center">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-green-500/15">
                  <Check className="h-8 w-8 text-green-400" />
                </div>
                <p className="text-lg font-bold">Pedido enviado!</p>
                <p className="text-sm text-muted-foreground">A diretoria receberá seu pedido e entrará em contato.</p>
                <button
                  onClick={() => { setPedidoEnviado(false); setShowCarrinho(false); }}
                  className="mt-2 rounded-full border border-white/10 px-6 py-2 text-sm font-medium hover:bg-white/5 transition"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                {carrinho.length === 0 ? (
                  <p className="py-10 text-center text-muted-foreground">Nenhum item no carrinho.</p>
                ) : (
                  <div className="space-y-3 mb-5">
                    {carrinho.map((item) => (
                      <div key={`${item.produto.id}-${item.tamanho}`} className="flex items-center gap-3 rounded-2xl border border-white/8 p-3">
                        {item.produto.foto_url && (
                          <img src={item.produto.foto_url} alt={item.produto.nome} className="h-14 w-14 rounded-xl object-cover" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{item.produto.nome}</p>
                          <p className="text-xs text-muted-foreground">Tamanho: {item.tamanho}</p>
                          {item.produto.preco && (
                            <p className="text-sm font-bold text-accent">R$ {(item.produto.preco * item.quantidade).toFixed(2)}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQtd(item.produto.id, item.tamanho, -1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 hover:bg-white/10 transition">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{item.quantidade}</span>
                          <button onClick={() => updateQtd(item.produto.id, item.tamanho, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white/5 hover:bg-white/10 transition">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeCarrinho(item.produto.id, item.tamanho)} className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {carrinho.length > 0 && (
                  <>
                    {totalPreco > 0 && (
                      <div className="mb-4 flex justify-between rounded-2xl bg-white/5 px-4 py-3 font-bold">
                        <span>Total estimado</span>
                        <span className="text-accent">R$ {totalPreco.toFixed(2)}</span>
                      </div>
                    )}
                    <textarea
                      value={obs}
                      onChange={(e) => setObs(e.target.value)}
                      placeholder="Observações (ex: cor preferida, prazo, etc.)"
                      rows={3}
                      className="mb-4 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none focus:border-accent/50 resize-none"
                    />
                    {!user ? (
                      <Link
                        to="/login"
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground"
                      >
                        <Lock className="h-4 w-4" /> Entre para finalizar o pedido
                      </Link>
                    ) : (
                      <button
                        onClick={enviarPedido}
                        disabled={enviando}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3 text-sm font-bold text-accent-foreground hover:bg-accent/80 transition disabled:opacity-50"
                      >
                        <ShoppingCart className="h-4 w-4" />
                        {enviando ? "Enviando..." : "Confirmar Pedido"}
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
