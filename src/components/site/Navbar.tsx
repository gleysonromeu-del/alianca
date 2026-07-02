import { useEffect, useState } from "react";
import { Menu, MessageCircle, Users, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import escudo from "@/assets/escudo.png";
import { useAuth } from "@/hooks/use-auth";

const links = [
  { label: "Home", href: "#home" },
  { label: "O Aliança", href: "#sobre" },
  { label: "Social", href: "#social" },
  { label: "Contato", href: "#contato" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const playersTo = user ? "/jogadores" : "/login";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "backdrop-blur-xl bg-background/60 border-b border-white/10"
          : "backdrop-blur-md bg-background/20"
      }`}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        {/* Logo */}
        <a href="#home" className="flex items-center group">
          <img
            src={escudo}
            alt="Escudo do Aliança do Campo Grande Esporte Clube"
            className="h-16 w-16 md:h-20 md:w-20 object-contain transition-transform group-hover:scale-105"
          />
        </a>

        {/* Center menu */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full glass px-2 py-1.5">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-foreground/80 transition-all hover:bg-white/10 hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            to={playersTo}
            className="inline-flex items-center gap-2 rounded-full glass px-3 py-2 sm:px-4 sm:py-2.5 text-sm font-semibold text-foreground transition-transform hover:scale-105"
          >
            <Users className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">{user ? "Área do Jogador" : "Jogadores"}</span>
          </Link>
          <a
            href="https://wa.me/5500000000000"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-2 rounded-full bg-whatsapp px-5 py-2.5 text-sm font-semibold text-whatsapp-foreground shadow-[0_8px_24px_-8px_oklch(0.66_0.17_148/0.6)] transition-transform hover:scale-105"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            className="lg:hidden grid h-10 w-10 place-items-center rounded-xl glass text-foreground"
            aria-label="Abrir menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden border-t border-white/10 bg-background/90 backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl flex-col px-5 py-4">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-4 py-3 text-base font-medium text-foreground/90 hover:bg-white/5"
                >
                  {l.label}
                </a>
              ))}
              <Link
                to={playersTo}
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl glass px-5 py-3 text-sm font-semibold text-foreground"
              >
                <Users className="h-4 w-4" /> {user ? "Área do Jogador" : "Entrar (Jogadores)"}
              </Link>
              <Link
                to="/cadastro"
                onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-foreground"
              >
                Cadastrar-se
              </Link>
              <a
                href="https://wa.me/5500000000000"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-whatsapp px-5 py-3 text-sm font-semibold text-whatsapp-foreground"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
