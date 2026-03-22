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
        <LatestContent />
        <FeaturesSection />
        <GlitchMarquee />
      </main>
      <Footer />
    </div>
  );
}
