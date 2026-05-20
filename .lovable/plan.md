# Site Aliança do Campo Grande

Site institucional premium, moderno e responsivo, com a imagem enviada (torcida + escudo + fogos) usada como **marca d'água de fundo** em todo o site, sob um overlay azul escuro para garantir legibilidade.

## Paleta e tokens (src/styles.css)
- Azul escuro predominante: `--primary` (~oklch(0.22 0.09 260))
- Azul profundo de fundo: `--background` (~oklch(0.14 0.06 260))
- Amarelo dourado destaque: `--accent` (~oklch(0.82 0.17 85))
- Branco / cinza claro: `--foreground`, `--muted`
- Verde WhatsApp como token utilitário `--whatsapp`
- Gradientes e sombras premium (`--shadow-elegant`, `--gradient-hero`)
- Bordas arredondadas grandes (`--radius: 1.25rem`)

## Estrutura de arquivos
- `src/routes/index.tsx` — monta a home (substitui o placeholder)
- `src/routes/__root.tsx` — head SEO (title, description, og)
- `src/components/site/Navbar.tsx`
- `src/components/site/Hero.tsx`
- `src/components/site/ImpactStats.tsx`
- `src/components/site/About.tsx`
- `src/components/site/SocialProjects.tsx`
- `src/components/site/Footer.tsx`
- `src/components/site/WatermarkBackground.tsx` (fixed, z-[-1], opacity ~0.08, blur leve)
- `src/assets/torcida.jpg` (cópia da imagem enviada)

## Seções
1. **Navbar fixa** — fundo `backdrop-blur` + transparência, logo "AC" dourado à esquerda, menu central (Home, O Aliança, Social, Esportes, Notícias, Contato), botão WhatsApp verde à direita com ícone Lucide. Mobile: menu hambúrguer (Sheet).
2. **Hero fullscreen** — imagem da torcida ao fundo (mais opaca aqui), overlay escuro em gradiente, título gigante "Uma paixão. Uma história." com "paixão" e "história" em dourado, subtítulo institucional, CTAs "Conheça o clube" (dourado) e "Projetos sociais" (outline). Parallax leve no scroll + fade/slide com Framer Motion.
3. **Impacto** — 4 cards (Fundado em 2004, Atletas, Títulos, Projetos sociais) com números grandes, ícones Lucide minimalistas, sombra suave, hover scale.
4. **Institucional (O Aliança)** — imagem grande arredondada à esquerda, texto à direita, badges (Tradição, Comunidade, Formação), CTA dourado.
5. **Projetos sociais** — grid responsivo de 3 cards modernos com imagem, título, descrição e link.
6. **Footer premium** — logo, redes sociais (Instagram, Facebook, YouTube), links rápidos, copyright.

## Marca d'água global
Componente `WatermarkBackground` renderizado uma vez no layout, posição `fixed inset-0`, `background-image` da torcida com `opacity-[0.07]`, leve `blur-sm`, sobreposto por gradiente azul escuro. Garante o efeito em todas as seções sem prejudicar contraste.

## Detalhes técnicos
- Dependências: instalar `framer-motion` (Lucide já presente).
- Animações: variants reutilizáveis (fadeUp, stagger).
- Glassmorphism leve nos cards de impacto e na navbar (`bg-white/5 backdrop-blur border border-white/10`).
- Acessibilidade: alt texts, contraste AA garantido pelo overlay.
- SEO: title, meta description, og:title/description/image apontando para a imagem da torcida.
- Responsivo mobile-first; breakpoints `md` e `lg` para grids e tipografia.

## Fora de escopo (a confirmar depois)
- Páginas internas (O Aliança, Social, Esportes, Notícias, Contato) — nesta primeira entrega serão âncoras na home; posso criar rotas dedicadas em seguida se quiser.
- Backend / formulários reais.
