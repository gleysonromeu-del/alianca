import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { CampeonatoMensalSection } from "@/components/site/CampeonatoMensalSection";
import { About } from "@/components/site/About";
import { SocialProjects } from "@/components/site/SocialProjects";
import { Footer } from "@/components/site/Footer";
import { WatermarkBackground } from "@/components/site/WatermarkBackground";
import { Aniversariantes } from "@/components/site/Aniversariantes";
import { MomentosCarousel } from "@/components/site/MomentosCarousel";
import { AliancaStore } from "@/components/site/AliancaStore";
import { CaixaSugestoes } from "@/components/site/CaixaSugestoes";
import { CampanhaAgasalhoModal } from "@/components/site/CampanhaAgasalhoModal";

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
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    // pequeno atraso para garantir que as seções (imagens, dados) já renderizaram
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen">
      <WatermarkBackground />
      <CampanhaAgasalhoModal />
      <Navbar />
      <main>
        <Hero />
        <CampeonatoMensalSection />
        <About />
        <SocialProjects />
        <MomentosCarousel />
        <AliancaStore />
        <CaixaSugestoes />
        <Aniversariantes />
      </main>
      <Footer />
    </div>
  );
}
