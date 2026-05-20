import { motion } from "framer-motion";
import { ArrowUpRight, BookOpen, Dumbbell, HandHeart } from "lucide-react";

const projects = [
  {
    icon: Dumbbell,
    title: "Escolinha de Futebol",
    desc: "Aulas gratuitas para crianças e adolescentes da comunidade, com foco em formação humana e técnica.",
    tag: "Esporte",
  },
  {
    icon: BookOpen,
    title: "Reforço Escolar",
    desc: "Apoio educacional para os atletas das categorias de base, garantindo desempenho dentro e fora de campo.",
    tag: "Educação",
  },
  {
    icon: HandHeart,
    title: "Aliança Solidário",
    desc: "Campanhas de arrecadação de alimentos, agasalhos e brinquedos em parceria com a torcida.",
    tag: "Comunidade",
  },
];

export function SocialProjects() {
  return (
    <section id="social" className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
              Projetos sociais
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
              O esporte que <span className="text-gradient-gold">transforma vidas</span>
            </h2>
          </motion.div>
          <p className="max-w-md text-muted-foreground">
            Iniciativas que levam educação, oportunidade e cidadania para o coração do
            Campo Grande.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p, i) => (
            <motion.a
              key={p.title}
              href="#"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group relative flex flex-col rounded-3xl glass p-7 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/10"
            >
              <div className="flex items-center justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent">
                  <p.icon className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                  {p.tag}
                </span>
              </div>
              <h3 className="mt-6 text-xl font-bold text-foreground">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-accent">
                Saiba mais
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}
