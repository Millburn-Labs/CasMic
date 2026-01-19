import Navigation from "./components/Navigation";
import Hero from "./components/Hero";
import Features from "./components/Features";
import ReputationLevels from "./components/ReputationLevels";
import CTA from "./components/CTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Navigation />
      <Hero />
      <Features />
      <ReputationLevels />
      <CTA />
      <Footer />
    </div>
  );
}
