import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import torcida from "@/assets/torcida.jpg";

export function Hero() {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 120]);
  const opacity = useTransform(scrollY, [0, 500], [1, 0.4]);

  return (
    <section id="home" className="relative isolate min-h-screen w-full overflow-hidden">
      {/* SVG filter for real cloth/flag ripple */}
      <svg className="absolute h-0 w-0" aria-hidden>
        <filter id="flag-ripple">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.018" numOctaves="2" seed="3" result="noise">
            <animate attributeName="baseFrequency" dur="22s" values="0.008 0.016;0.010 0.020;0.008 0.016" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" dur="18s" values="10;18;10" repeatCount="indefinite" />
          </feDisplacementMap>
        </filter>
      </svg>

      {/* Parallax background */}
      <motion.div style={{ y }} className="absolute inset-0 -z-10 overflow-hidden">
        <img
          src={torcida}
          alt="Torcida do Aliança do Campo Grande celebrando no estádio"
          className="h-full w-full object-cover flag-wave"
          style={{ filter: "url(#flag-ripple)" }}
        />
      </motion.div>
      <div className="absolute inset-0 -z-10 bg-[var(--gradient-hero)]" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-background/80 via-background/40 to-transparent" />

      <motion.div
        style={{ opacity }}
        className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-6 pt-32 pb-24 md:px-8"
      >
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="inline-flex w-fit items-center gap-2 rounded-full glass px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-accent"
        >
          <Heart className="h-3.5 w-3.5 fill-accent" />
          Desde 2004
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mt-6 max-w-4xl text-5xl font-black leading-[1.02] tracking-tight text-foreground sm:text-6xl md:text-7xl lg:text-[5.5rem]"
        >
          Uma <span className="text-gradient-gold">paixão</span>.<br />
          Um coração.<br />
          Uma <span className="text-gradient-gold">história</span>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-8 max-w-2xl text-lg leading-relaxed text-foreground/80 md:text-xl"
        >
          O Aliança do Campo Grande nasceu da união e amizade de vários amigos e da paixão pelo esporte.
          Mais que um clube — uma família que constrói tradição, formação e oportunidades
          dentro e fora dos gramados.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <a
            href="#sobre"
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-accent/80 px-7 py-3.5 text-sm font-bold text-accent-foreground shadow-[var(--shadow-gold)] transition-transform hover:scale-105"
          >
            Conheça o clube
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </a>
          <a
            href="#social"
            className="inline-flex items-center gap-2 rounded-full border border-white/20 glass px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-white/10"
          >
            Projetos sociais
          </a>
        </motion.div>
      </motion.div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
