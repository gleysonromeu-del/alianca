import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cake } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Aniversariante = {
  id: string;
  nome_completo: string;
  apelido: string | null;
  data_nascimento: string;
  numero_camisa: number | null;
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function Aniversariantes() {
  const [list, setList] = useState<Aniversariante[]>([]);
  const mesAtual = new Date().getMonth();

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("jogadores")
        .select("id, nome_completo, apelido, data_nascimento, numero_camisa")
        .not("data_nascimento", "is", null);
      const todos = (data ?? []) as Aniversariante[];
      const doMes = todos
        .filter((j) => {
          const d = new Date(j.data_nascimento);
          return d.getUTCMonth() === mesAtual;
        })
        .sort((a, b) => {
          const da = new Date(a.data_nascimento).getUTCDate();
          const db = new Date(b.data_nascimento).getUTCDate();
          return da - db;
        });
      setList(doMes);
    })();
  }, [mesAtual]);

  return (
    <section className="relative py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Aniversariantes
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            <span className="text-gradient-gold">{MESES[mesAtual]}</span> é de comemorar
          </h2>
          <p className="mt-3 text-sm md:text-base text-muted-foreground">
            Parabéns aos jogadores que celebram mais um ano de vida este mês.
          </p>
        </motion.div>

        {list.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Nenhum aniversariante neste mês.
          </p>
        ) : (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {list.map((j, i) => {
              const d = new Date(j.data_nascimento);
              const dia = String(d.getUTCDate()).padStart(2, "0");
              return (
                <motion.div
                  key={j.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="flex items-center gap-4 rounded-2xl glass p-5 shadow-[var(--shadow-elegant)]"
                >
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-accent/15 text-accent">
                    <Cake className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">
                      {j.nome_completo}{" "}
                      {j.numero_camisa ? (
                        <span className="text-accent">#{j.numero_camisa}</span>
                      ) : null}
                    </p>
                    {j.apelido && (
                      <p className="text-xs text-muted-foreground truncate">"{j.apelido}"</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-foreground leading-none">{dia}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                      {MESES[mesAtual].slice(0, 3)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
