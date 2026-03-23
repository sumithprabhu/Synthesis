import { Navbar } from '@/components/navbar';
import { HeroSection } from '@/components/hero-section';
import { LatestContent } from '@/components/latest-content';
import { FeaturesSection } from '@/components/features-section';
import { GlitchMarquee } from '@/components/glitch-marquee';
import { Footer } from '@/components/footer';

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <div id="articles"><LatestContent /></div>
        <div id="features"><FeaturesSection /></div>
        <GlitchMarquee />
      </main>
      <Footer />
    </div>
  );
}
