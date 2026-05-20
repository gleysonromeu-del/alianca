import { motion } from "framer-motion";
import { Calendar, Trophy, Users, HeartHandshake } from "lucide-react";

const stats = [
  { icon: Calendar, value: "2004", label: "Ano de fundação" },
  { icon: Users, value: "+500", label: "Atletas formados" },
  { icon: Trophy, value: "27", label: "Títulos conquistados" },
  { icon: HeartHandshake, value: "+12", label: "Projetos sociais ativos" },
];

export function ImpactStats() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Nosso impacto
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">
            Mais de duas décadas <span className="text-gradient-gold">construindo história</span>
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group rounded-3xl glass p-6 shadow-[var(--shadow-elegant)] transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/10 md:p-8"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent transition-colors group-hover:bg-accent/25">
                <s.icon className="h-6 w-6" />
              </div>
              <p className="mt-6 text-4xl font-black tracking-tight text-foreground md:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-sm text-muted-foreground md:text-base">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
