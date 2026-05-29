import { useEffect, useState } from "react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";

type Momento = {
  id: string;
  tipo: "foto" | "video" | "texto";
  midia_url: string | null;
  legenda: string | null;
  autor_nome: string | null;
  criado_em: string;
};

export function MomentosCarousel() {
  const [items, setItems] = useState<Momento[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("momentos")
        .select("id, tipo, midia_url, legenda, autor_nome, criado_em")
        .eq("aprovado", true)
        .order("criado_em", { ascending: false })
        .limit(20);
      setItems((data as Momento[]) ?? []);
    })();
  }, []);

  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center mb-10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Momentos Aliança
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            <span className="text-gradient-gold">Resenha</span>, gols e bastidores
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">
            Fotos, vídeos e mensagens enviadas pelos próprios jogadores.
          </p>
        </motion.div>

        {items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Ainda não temos momentos publicados. Faça login na área do jogador e compartilhe o primeiro!
          </p>
        ) : (
          <Carousel
            opts={{ loop: true, align: "start" }}
            plugins={[Autoplay({ delay: 5000, stopOnInteraction: true })]}
            className="mx-auto max-w-5xl"
          >
            <CarouselContent className="items-start">
              {items.map((m) => (
                <CarouselItem key={m.id} className="md:basis-1/2 lg:basis-1/2">
                  <div className="rounded-3xl overflow-hidden glass shadow-[var(--shadow-elegant)] flex flex-col">

                    {/* ── Mídia: sem aspect-ratio fixo, imagem mostra altura natural ── */}
                    {m.tipo === "foto" && m.midia_url && (
                      <img
                        src={m.midia_url}
                        alt={m.legenda ?? "Momento Aliança"}
                        className="w-full object-contain max-h-[480px] bg-black/30"
                        loading="lazy"
                      />
                    )}

                    {m.tipo === "video" && m.midia_url && (
                      <video
                        src={m.midia_url}
                        controls
                        playsInline
                        className="w-full max-h-[480px] bg-black"
                      />
                    )}

                    {m.tipo === "texto" && (
                      <div className="p-8 text-center min-h-[200px] flex flex-col items-center justify-center bg-black/20">
                        <Quote className="mx-auto h-10 w-10 text-accent mb-3" />
                        <p className="text-lg font-medium text-foreground italic">"{m.legenda}"</p>
                      </div>
                    )}

                    {/* ── Rodapé ── */}
                    {m.tipo !== "texto" && m.legenda && (
                      <p className="px-5 pt-4 text-sm text-foreground">{m.legenda}</p>
                    )}
                    <div className="px-5 py-4 mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <span>{m.autor_nome ?? "Jogador Aliança"}</span>
                      <span>{new Date(m.criado_em).toLocaleDateString("pt-BR")}</span>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex" />
            <CarouselNext className="hidden md:flex" />
          </Carousel>
        )}
      </div>
    </section>
  );
}
