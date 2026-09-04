import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/site/HomePage";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Aliança do Campo Grande — Uma paixão. Um coração. Uma história." },
      {
        name: "description",
        content:
          "Site oficial do Aliança do Campo Grande. Clube esportivo fundado em 2004, com tradição, formação de atletas e projetos sociais.",
      },
      { property: "og:title", content: "Aliança do Campo Grande" },
      {
        property: "og:description",
        content: "Uma paixão. Um coração. Uma história. Conheça o clube e seus projetos.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.aliancacgec2004.com.br/" }],
  }),
});
