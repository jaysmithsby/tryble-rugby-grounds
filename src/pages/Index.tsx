import Hero from "@/components/Hero";
import JerseyMarquee from "@/components/JerseyMarquee";
import HowItWorks from "@/components/HowItWorks";
import Features from "@/components/Features";
import AppPreview from "@/components/AppPreview";
import Safety from "@/components/Safety";
import SocialProof from "@/components/SocialProof";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      <JerseyMarquee />
      <HowItWorks />
      <Features />
      <AppPreview />
      <Safety />
      <SocialProof />
      <Footer />
    </div>
  );
};

export default Index;
