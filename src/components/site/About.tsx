import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Sparkles, Users2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import torcida from "@/assets/torcida.jpg";

const badges = [
  { icon: ShieldCheck, label: "Tradição" },
  { icon: Users2, label: "Comunidade" },
  { icon: Sparkles, label: "Formação" },
];

export function About() {
  return (
    <section id="sobre" className="relative py-24 md:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:px-8 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-[2rem] shadow-[var(--shadow-elegant)] ring-1 ring-white/10">
            <img
              src={torcida}
              alt="Torcida do Aliança em dia de jogo"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            O Aliança
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Um clube construído por <span className="text-gradient-gold">amigos</span>, para
            amigos
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground md:text-lg">
            Tudo começou em 2004, quando um grupo de amigos do Campo Grande decidiu
            transformar a amizade que nasceu nas peladas de fim de semana em algo maior.
            Da vontade de jogar juntos, de comemorar juntos e de estar juntos surgiu o
            Aliança — um time fundado pela palavra, pelo abraço e pela lealdade entre amigos.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            Com o passar dos anos, novos amigos chegaram, filhos cresceram dentro do clube,
            esposas, pais e vizinhos viraram torcida. O que era um grupo de amigos virou a
            <span className="text-foreground font-semibold"> Família Aliança</span>: gente
            que se ajuda dentro e fora das quatro linhas, que celebra cada vitória como
            conquista de todos e que carrega o escudo no peito como símbolo de união.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            Mais que um clube, o Aliança é a prova de que amizade verdadeira constrói
            história — e a nossa está só começando.
          </p>


          <div className="mt-8 flex flex-wrap gap-3">
            {badges.map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium text-foreground"
              >
                <b.icon className="h-4 w-4 text-accent" />
                {b.label}
              </span>
            ))}
          </div>

          <Link
            to="/inscricoes"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold text-accent-foreground shadow-[var(--shadow-gold)] transition-transform hover:scale-105"
          >
            Faça parte do Aliança
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
