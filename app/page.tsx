import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import Footer from "@/components/Footer";
import { getClients, getDesigns, getVideos } from "@/lib/projects";
import { getSiteSettings } from "@/lib/site-settings-read";

const About = dynamic(() => import("@/components/About"));
const Services = dynamic(() => import("@/components/Services"));
const VideoShowcase = dynamic(() => import("@/components/VideoShowcase"));
const Clients = dynamic(() => import("@/components/Clients"));
const Testimonials = dynamic(() => import("@/components/Testimonials"));
const Contact = dynamic(() => import("@/components/Contact"));

/** Cache homepage; admin mutations call revalidatePath("/"). */
export const revalidate = 300;

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
