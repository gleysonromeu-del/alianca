import { motion } from "framer-motion";
import { useEnquetesPublicas, useResultadosEnquete, agruparPorRodada, CATEGORIA_LABEL } from "@/hooks/use-enquetes";

function PlacarRodada({ enqueteId, opcoes, imagemUrl }: { enqueteId: string; opcoes: { id: string; texto: string }[]; imagemUrl: string | null }) {
  const { data: totais } = useResultadosEnquete(enqueteId);
  const soma = Object.values(totais ?? {}).reduce((a: number, b) => a + (b as number), 0);

  return (
    <div>
      {imagemUrl && <img src={imagemUrl} alt="" className="mb-3 w-full rounded-2xl border border-white/10 object-contain" />}
      <div className="grid gap-3 sm:grid-cols-2">
        {opcoes.map((op) => {
          const votos = totais?.[op.id] ?? 0;
          const pct = soma > 0 ? Math.round((votos / soma) * 100) : 0;
          return (
            <div key={op.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold">{op.texto}</p>
              <div className="mt-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{votos} voto(s) · {pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardEnquete({ enquete }: { enquete: any }) {
  const rodadas = agruparPorRodada(enquete.opcoes, enquete.imagensPorRodada);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl border border-white/10 bg-white/3 p-6"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
          {CATEGORIA_LABEL[enquete.categoria as keyof typeof CATEGORIA_LABEL]}
        </span>
        {enquete.status === "encerrada" && (
          <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase text-muted-foreground">
            Encerrada
          </span>
        )}
      </div>
      <h3 className="text-xl font-black">{enquete.titulo}</h3>
      {enquete.descricao && <p className="mt-1 text-sm text-muted-foreground">{enquete.descricao}</p>}

      <div className="mt-5 space-y-5">
        {rodadas.map((r) => (
          <div key={r.rodada}>
            {rodadas.length > 1 && (
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">Rodada {r.rodada + 1}</p>
            )}
            <PlacarRodada enqueteId={enquete.id} opcoes={r.opcoes} imagemUrl={r.imagemUrl} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function EnquetesSection() {
  const { data: enquetes, isLoading } = useEnquetesPublicas();

  if (isLoading || !enquetes?.length) return null;

  return (
    <section id="enquetes" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-5xl px-6 md:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Participe</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Enquetes do <span className="text-gradient-gold">Aliança</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            Ajude a decidir os rumos do clube: uniformes, festas, eleições e ações sociais.
            Jogadores logados e aprovados votam pelo pop-up ao abrir o site.
          </p>
        </div>

        <div className="space-y-6">
          {enquetes.map((e) => (
            <CardEnquete key={e.id} enquete={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
