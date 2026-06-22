import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Services from "@/components/Services";
import Portfolio from "@/components/Portfolio";
import VideoShowcase from "@/components/VideoShowcase";
import Clients from "@/components/Clients";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { getClients, getDesigns, getVideos } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site-settings-read";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [designs, videos, clients, settings] = await Promise.all([
    getDesigns(),
    getVideos(),
    getClients(),
    getSiteSettings(),
  ]);

  return (
    <main className="overflow-x-hidden bg-black">
      <Navbar />
      <Hero heroImage={settings.heroImage} heroAlt={settings.heroAlt} />
      <About />
      <Services />
      <Portfolio
        designs={designs}
        rows={settings.portfolioRows}
        repeat={settings.portfolioRepeat}
        scrollDuration={settings.portfolioScrollDuration}
      />
      <VideoShowcase
        videos={videos}
        repeat={settings.videoRepeat}
        scrollDuration={settings.videoScrollDuration}
      />
      <Clients
        clients={clients}
        rows={settings.clientRows}
        repeat={settings.clientRepeat}
        scrollDuration={settings.clientScrollDuration}
      />
      <Testimonials />
      <Contact />
      <Footer />
    </main>
  );
}
