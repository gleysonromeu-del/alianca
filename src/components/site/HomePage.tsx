import { Navbar } from "@/components/site/Navbar";
import { Hero } from "@/components/site/Hero";
import { CampeonatoMensalSection } from "@/components/site/CampeonatoMensalSection";
import { About } from "@/components/site/About";
import { SocialProjects } from "@/components/site/SocialProjects";
import { EnquetesSection } from "@/components/site/EnquetesSection";
import { EnqueteVotacaoModal } from "@/components/site/EnqueteVotacaoModal";
import { Footer } from "@/components/site/Footer";
import { WatermarkBackground } from "@/components/site/WatermarkBackground";
import { Aniversariantes } from "@/components/site/Aniversariantes";
import { MomentosCarousel } from "@/components/site/MomentosCarousel";
import { AliancaStore } from "@/components/site/AliancaStore";
import { CaixaSugestoes } from "@/components/site/CaixaSugestoes";

export function HomePage() {
  return (
    <div className="relative min-h-screen">
      <WatermarkBackground />
      <EnqueteVotacaoModal />
      <Navbar />
      <main>
        <Hero />
        <CampeonatoMensalSection />
        <About />
        <SocialProjects />
        <EnquetesSection />
        <MomentosCarousel />
        <AliancaStore />
        <CaixaSugestoes />
        <Aniversariantes />
      </main>
      <Footer />
    </div>
  );
}
