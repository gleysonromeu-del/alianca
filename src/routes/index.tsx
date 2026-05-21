import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { CampeonatoMensalSection } from "@/components/site/CampeonatoMensalSection";
import { About } from "@/components/site/About";
import { SocialProjects } from "@/components/site/SocialProjects";
import { Footer } from "@/components/site/Footer";
import { WatermarkBackground } from "@/components/site/WatermarkBackground";
import { Aniversariantes } from "@/components/site/Aniversariantes";
import { MomentosCarousel } from "@/components/site/MomentosCarousel";
import AdminCampeonato from "@/pages/admin/AdminCampeonato";
export const Route = createFileRoute("/")({
  component: Index,
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
  }),
});

function Index() {
  return (
    <div className="relative min-h-screen">
      <WatermarkBackground />
      <Navbar />
      <main>
        <Hero />
        <CampeonatoMensalSection />
        <About />
        <SocialProjects />
        <MomentosCarousel />
        <Aniversariantes />
      </main>
      <Footer />
    </div>
  );
}
