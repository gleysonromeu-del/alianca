import { Facebook, Instagram, Youtube, Mail, MapPin } from "lucide-react";
import escudo from "@/assets/escudo.png";

const quick = [
  { label: "O Aliança", href: "#sobre" },
  { label: "Projetos sociais", href: "#social" },
  { label: "Esportes", href: "#esportes" },
  { label: "Notícias", href: "#noticias" },
  { label: "Contato", href: "#contato" },
];

export function Footer() {
  return (
    <footer id="contato" className="relative mt-12 border-t border-white/10 bg-background/60">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-3 md:px-8">
        <div>
          <div className="flex items-center">
            <img
              src={escudo}
              alt="Escudo do Aliança do Campo Grande Esporte Clube"
              className="h-20 w-20 object-contain"
            />
          </div>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Uma paixão. Um coração. Uma história. Mais que um clube — uma família construída
            no Campo Grande desde 2004.
          </p>
          <div className="mt-6 flex gap-3">
            {[Instagram, Facebook, Youtube].map((Icon, i) => (
              <a
                key={i}
                href="#"
                className="grid h-10 w-10 place-items-center rounded-xl glass text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Rede social"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">
            Links rápidos
          </p>
          <ul className="mt-5 space-y-3">
            {quick.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-sm text-foreground/80 transition-colors hover:text-accent"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Contato</p>
          <ul className="mt-5 space-y-3 text-sm text-foreground/80">
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 text-accent" />
              Campo do Estrela — Rua Álvaro Afonso, 400 — Vila Gea, São Paulo
            </li>
            <li className="flex items-start gap-3">
              <Mail className="mt-0.5 h-4 w-4 text-accent" />
              contato@aliancacg.com.br
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground md:flex-row md:px-8">
          <p>© {new Date().getFullYear()} Aliança do Campo Grande. Todos os direitos reservados.</p>
          <p>Feito com paixão pela torcida.</p>
        </div>
      </div>
    </footer>
  );
}
