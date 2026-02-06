import { Layout } from "../../components/shared";
import { Link } from "wouter";
import { ArrowRight, Play, Pause, Lock, Music, Clock, Download } from "lucide-react";
import { useState, useRef } from "react";

const hosts = [
  {
    name: "Luiz Laffey",
    role: "Host, Curator & Storyteller",
    description: "With over 40 years of DJ experience, Luiz brings unparalleled depth to every musical selection. His storytelling transforms each episode into a journey through sound and memory.",
    image: null,
  },
  {
    name: "Alexis Hart",
    role: "Co-Host, Storyteller & Connector",
    description: "Alexis brings spontaneous, curious energy to every show. Her natural ability to connect with listeners and draw out stories makes each episode feel like a conversation with friends.",
    image: null,
  },
];

const freeSamples = [
  { id: 1, title: "Episode Preview: Disco Nights", duration: "3:45", type: "sample" },
  { id: 2, title: "Funk Groove Session", duration: "4:12", type: "sample" },
  { id: 3, title: "Soulful House Mix", duration: "5:30", type: "sample" },
  { id: 4, title: "Nu-Disco Journey", duration: "4:58", type: "sample" },
  { id: 5, title: "Classic Soul Selections", duration: "3:22", type: "sample" },
  { id: 6, title: "Full Episode: Summer Memories", duration: "58:30", type: "full" },
];

const memberEpisodes = [
  { id: 1, title: "Episode 45: Midnight Disco", duration: "60:00", locked: true },
  { id: 2, title: "Episode 44: Funky Sunrise", duration: "60:00", locked: true },
  { id: 3, title: "Episode 43: Soulful Afternoons", duration: "60:00", locked: true },
  { id: 4, title: "Episode 42: House Party", duration: "60:00", locked: true },
];

interface AudioPlayerProps {
  title: string;
  duration: string;
  type: string;
}

function AudioPlayer({ title, duration, type }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div className="flex items-center gap-4 bg-[#111111] border border-white/5 rounded-lg p-4 hover:border-[#d4a843]/30 transition-all duration-300">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-12 h-12 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0 hover:bg-[#e8c574] transition-colors"
      >
        {isPlaying ? (
          <Pause className="text-[#0a0a0a]" size={20} />
        ) : (
          <Play className="text-[#0a0a0a] ml-1" size={20} />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <h4 className="font-body text-white font-medium truncate">{title}</h4>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Clock size={14} />
          <span>{duration}</span>
          {type === "full" && (
            <span className="px-2 py-0.5 bg-[#d4a843]/20 text-[#d4a843] text-xs rounded">
              Full Episode
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background with gold theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#12100a] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <Link href="/originals" className="inline-flex items-center gap-2 text-[#d4a843] text-sm mb-6 hover:gap-3 transition-all">
              <ArrowRight size={14} className="rotate-180" /> Back to Originals
            </Link>
            
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              Music • Storytelling • Soul
            </span>
            
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.05]">
              Luiz Laffey's{" "}
              <span className="text-[#d4a843]">Collection</span>
            </h1>
            
            <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed mb-8">
              More than a radio show — it's a musical journey. Disco, funk, soulful house, 
              nu-disco with storytelling that connects the music to the moment. Each episode 
              is a carefully curated experience.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/plans"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
              >
                Subscribe Now
                <ArrowRight size={18} />
              </Link>
              <a
                href="#samples"
                className="inline-flex items-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
              >
                Free Samples
              </a>
            </div>
          </div>

          {/* Visual - Show Artwork */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#d4a843]/30 via-[#1a1a1a] to-[#0a0a0a] border border-[#d4a843]/30 overflow-hidden image-enhance">
              {/* Neon-style decorative element */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Music className="text-[#d4a843]" size={120} strokeWidth={1} />
                  <div className="absolute inset-0 blur-xl">
                    <Music className="text-[#d4a843]" size={120} strokeWidth={1} />
                  </div>
                </div>
              </div>
              
              {/* Rings */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d4a843]/20"
                  style={{
                    width: `${60 + i * 25}%`,
                    height: `${60 + i * 25}%`,
                  }}
                />
              ))}
            </div>
            
            {/* Gold glow */}
            <div className="absolute -inset-4 bg-[#d4a843]/10 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HostsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Your Hosts
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Meet the <span className="text-[#d4a843]">Curators</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {hosts.map((host) => (
            <div
              key={host.name}
              className="bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500"
            >
              {/* Host Image Placeholder */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#d4a843]/20 to-[#1a1a1a] mx-auto mb-6 flex items-center justify-center image-enhance">
                <span className="font-heading text-4xl text-[#d4a843]/50">
                  {host.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              
              <h3 className="font-heading text-2xl text-white text-center mb-2">
                {host.name}
              </h3>
              <p className="text-[#d4a843] text-sm text-center mb-4">{host.role}</p>
              <p className="font-body text-white/60 text-sm text-center leading-relaxed">
                {host.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SamplesSection() {
  return (
    <section id="samples" className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Listen Now
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Free <span className="text-[#d4a843]">Samples</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            Preview what awaits in our full library. These samples showcase the 
            style and quality of Luiz Laffey's Collection.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {freeSamples.map((sample) => (
            <AudioPlayer
              key={sample.id}
              title={sample.title}
              duration={sample.duration}
              type={sample.type}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function MemberLibraryPreview() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Members Only
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Full <span className="text-[#d4a843]">Library</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            Access our complete archive of episodes with a subscription. 
            New episodes added weekly.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-12">
          {memberEpisodes.map((episode) => (
            <div
              key={episode.id}
              className="flex items-center gap-4 bg-[#111111]/50 border border-white/5 rounded-lg p-4 opacity-60"
            >
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Lock className="text-white/50" size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-body text-white/70 font-medium truncate">{episode.title}</h4>
                <div className="flex items-center gap-2 text-white/40 text-sm">
                  <Clock size={14} />
                  <span>{episode.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/plans"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            Unlock Full Access
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#12100a] to-[#0a0a0a]" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Start Your <span className="text-[#d4a843]">Journey</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          Subscribe today and discover why listeners worldwide have made 
          Luiz Laffey's Collection their go-to musical experience.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            View Plans
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function LuizLaffeysCollection() {
  return (
    <Layout>
      <HeroSection />
      <HostsSection />
      <SamplesSection />
      <MemberLibraryPreview />
      <CTASection />
    </Layout>
  );
}
