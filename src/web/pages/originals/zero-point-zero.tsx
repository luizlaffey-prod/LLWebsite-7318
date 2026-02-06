import { Layout } from "../../components/shared";
import { Link } from "wouter";
import { ArrowRight, Play, Pause, Lock, Zap, Clock } from "lucide-react";
import { useState } from "react";

const hosts = [
  {
    name: "Paulinho Ribeiro",
    role: "Host & Creator",
    description: "A career in electronic music since 1987, Paulinho brings decades of expertise and passion for sonic exploration to every episode.",
    image: null,
  },
  {
    name: "Tony Caldeira",
    role: "DJ & Producer",
    description: "Fitness entrepreneur and radio enthusiast since 1990, Tony combines energy and musical knowledge to create unforgettable moments.",
    image: null,
  },
  {
    name: "Nilton Rabello",
    role: "DJ & Vinyl Curator",
    description: "With over 1,500 vinyl records and a base in Philadelphia, Nilton brings rare gems and deep cuts to the sonic journey.",
    image: null,
  },
  {
    name: "Caio Eduardo",
    role: "Technical Support",
    description: "The technical backbone of Zero Point Zero, ensuring every episode sounds pristine and professional.",
    image: null,
  },
];

const freeSamples = [
  { id: 1, title: "Cosmic Journey Intro", duration: "4:20", type: "sample" },
  { id: 2, title: "Deep Space Grooves", duration: "5:15", type: "sample" },
  { id: 3, title: "90s Electronic Revival", duration: "4:48", type: "sample" },
  { id: 4, title: "Ambient Techno Session", duration: "6:02", type: "sample" },
  { id: 5, title: "Progressive House Mix", duration: "5:30", type: "sample" },
  { id: 6, title: "Full Episode: Orbital Drift", duration: "60:00", type: "full" },
];

const memberEpisodes = [
  { id: 1, title: "Episode 78: Event Horizon", duration: "60:00", locked: true },
  { id: 2, title: "Episode 77: Solar Winds", duration: "60:00", locked: true },
  { id: 3, title: "Episode 76: Nebula Dance", duration: "60:00", locked: true },
  { id: 4, title: "Episode 75: Gravity Well", duration: "60:00", locked: true },
];

interface AudioPlayerProps {
  title: string;
  duration: string;
  type: string;
}

function AudioPlayer({ title, duration, type }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  return (
    <div className="flex items-center gap-4 bg-[#111111] border border-white/5 rounded-lg p-4 hover:border-[#e67e22]/30 transition-all duration-300">
      <button
        onClick={() => setIsPlaying(!isPlaying)}
        className="w-12 h-12 rounded-full bg-[#e67e22] flex items-center justify-center shrink-0 hover:bg-[#f39c12] transition-colors"
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
            <span className="px-2 py-0.5 bg-[#e67e22]/20 text-[#e67e22] text-xs rounded">
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
      {/* Background with orange/cosmic theme */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0f0906] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#e67e22]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#e67e22]/5 rounded-full blur-3xl" />
      
      {/* Stars background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.2,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div>
            <Link href="/originals" className="inline-flex items-center gap-2 text-[#e67e22] text-sm mb-6 hover:gap-3 transition-all">
              <ArrowRight size={14} className="rotate-180" /> Back to Originals
            </Link>
            
            <span className="text-[#e67e22] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              Electronic • Cosmic • Journey
            </span>
            
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.05]">
              Zero Point{" "}
              <span className="text-[#e67e22]">Zero</span>
            </h1>
            
            <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed mb-8">
              A 60-minute cosmic journey through electronic music since the 1990s. 
              Deep grooves, ethereal soundscapes, and timeless beats that transcend 
              the ordinary and transport you to another dimension.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/plans"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[#e67e22] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#f39c12] hover:shadow-xl hover:shadow-[#e67e22]/25"
              >
                Subscribe Now
                <ArrowRight size={18} />
              </Link>
              <a
                href="#samples"
                className="inline-flex items-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#e67e22] hover:text-[#e67e22]"
              >
                Free Samples
              </a>
            </div>
          </div>

          {/* Visual - Show Artwork */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#e67e22]/30 via-[#1a1a1a] to-[#0a0a0a] border border-[#e67e22]/30 overflow-hidden image-enhance">
              {/* Cosmic decorative element */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Zap className="text-[#e67e22]" size={120} strokeWidth={1} />
                  <div className="absolute inset-0 blur-xl">
                    <Zap className="text-[#e67e22]" size={120} strokeWidth={1} />
                  </div>
                </div>
              </div>
              
              {/* Orbital rings */}
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e67e22]/20"
                  style={{
                    width: `${60 + i * 25}%`,
                    height: `${60 + i * 25}%`,
                    transform: `translate(-50%, -50%) rotate(${i * 15}deg)`,
                  }}
                />
              ))}
              
              {/* Cosmic particles */}
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-[#e67e22]/60 rounded-full"
                  style={{
                    top: `${Math.random() * 100}%`,
                    left: `${Math.random() * 100}%`,
                  }}
                />
              ))}
            </div>
            
            {/* Orange glow */}
            <div className="absolute -inset-4 bg-[#e67e22]/10 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HostsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e67e22]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#e67e22] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            The Crew
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Meet the <span className="text-[#e67e22]">Team</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {hosts.map((host) => (
            <div
              key={host.name}
              className="bg-[#111111] border border-white/5 rounded-xl p-6 hover:border-[#e67e22]/30 transition-all duration-500"
            >
              {/* Host Image Placeholder */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#e67e22]/20 to-[#1a1a1a] mx-auto mb-4 flex items-center justify-center image-enhance">
                <span className="font-heading text-2xl text-[#e67e22]/50">
                  {host.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              
              <h3 className="font-heading text-xl text-white text-center mb-1">
                {host.name}
              </h3>
              <p className="text-[#e67e22] text-xs text-center mb-3 uppercase tracking-wider">{host.role}</p>
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
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0f0906]/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#e67e22] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Listen Now
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Free <span className="text-[#e67e22]">Samples</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            Experience the cosmic journey before committing. These samples give you 
            a taste of what Zero Point Zero offers.
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
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e67e22]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#e67e22] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Members Only
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Full <span className="text-[#e67e22]">Archive</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            Unlock our complete library of cosmic journeys. New episodes added weekly.
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
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#e67e22] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#f39c12] hover:shadow-xl hover:shadow-[#e67e22]/25"
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
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0f0906] to-[#0a0a0a]" />
      
      {/* Cosmic background */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-[#e67e22]/40 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Begin Your <span className="text-[#e67e22]">Cosmic Journey</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          Subscribe today and explore the electronic music universe with 
          Zero Point Zero. New sonic adventures await every week.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#e67e22] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#f39c12] hover:shadow-xl hover:shadow-[#e67e22]/25"
          >
            View Plans
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#e67e22] hover:text-[#e67e22]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ZeroPointZero() {
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
