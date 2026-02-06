import { Layout } from "../../components/shared";
import { Link } from "wouter";
import { ArrowRight, Play, Pause, Lock, Clock } from "lucide-react";
import { useState, useRef } from "react";

const hosts = [
  {
    name: "Luiz Laffey",
    role: "Host, Curator & Storyteller",
    description: "With over 40 years of DJ experience, Luiz brings unparalleled depth to every musical selection. His storytelling transforms each episode into a journey through sound and memory.",
    image: "/b4f4b29f-52b6-4321-8139-6e847492f0da.png",
  },
  {
    name: "Alexis Hart",
    role: "Co-Host, Storyteller & Connector",
    description: "Alexis brings spontaneous, curious energy to every show. Her natural ability to connect with listeners and draw out stories makes each episode feel like a conversation with friends.",
    image: "/9b9dbfab-e36f-4db6-952c-888bcd40048b.png",
  },
];

const freeSamples = [
  { 
    id: 1, 
    title: "Episode Sample 1: Soulful Vibes", 
    duration: "3:15", 
    size: "1.3MB",
    url: "/c9dd9cef-0a41-4279-a114-b14a016183e2.mp3",
    type: "sample" 
  },
  { 
    id: 2, 
    title: "Disco Mix Preview", 
    duration: "4:45", 
    size: "4.3MB",
    url: "/98666497-b9b7-449f-ba06-3cb8d2329ce2.mp3",
    type: "sample" 
  },
  { 
    id: 3, 
    title: "Funk Heritage Selection", 
    duration: "5:20", 
    size: "3.5MB",
    url: "/9e2c402f-eb6f-436e-bd8d-77a9576e7e67.mp3",
    type: "sample" 
  },
  { 
    id: 4, 
    title: "Nu-Disco Experience", 
    duration: "4:10", 
    size: "2.0MB",
    url: "/7ab57cc7-73f1-4fdb-b245-1392e6d36681.mp3",
    type: "sample" 
  },
  { 
    id: 5, 
    title: "Soulful House Journey", 
    duration: "3:55", 
    size: "3.2MB",
    url: "/f29e60ac-f1ae-476e-832c-642635baca1c.mp3",
    type: "sample" 
  }
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
  url: string;
  size: string;
}

function AudioPlayer({ title, duration, type, url, size }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        // Pause all other audio elements first
        const allAudios = document.querySelectorAll('audio');
        allAudios.forEach(audio => {
          if (audio !== audioRef.current) {
            audio.pause();
          }
        });
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-4 bg-[#111111] border border-white/5 rounded-lg p-4 hover:border-[#d4a843]/30 transition-all duration-300 group">
      <audio 
        ref={audioRef} 
        src={url} 
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0 hover:bg-[#e8c574] transition-all duration-300 group-hover:scale-105"
      >
        {isPlaying ? (
          <Pause className="text-[#0a0a0a]" size={20} fill="currentColor" />
        ) : (
          <Play className="text-[#0a0a0a] ml-1" size={20} fill="currentColor" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <h4 className="font-body text-white font-medium truncate group-hover:text-[#d4a843] transition-colors">{title}</h4>
        <div className="flex items-center gap-3 text-white/50 text-sm mt-1">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-[#d4a843]/60" />
            <span>{duration}</span>
          </div>
          <span className="text-white/20">•</span>
          <span className="text-white/40">{size}</span>
          {type === "full" && (
            <span className="px-2 py-0.5 bg-[#d4a843]/20 text-[#d4a843] text-[10px] uppercase tracking-wider rounded font-bold">
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

          {/* Visual - Show Artwork with Neon Card */}
          <div className="relative">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden">
              <img 
                src="/2f7da195-88b8-4d89-83c8-d010b07ac8e4.png"
                alt="Luiz Laffey's Collection - Neon Card"
                className="w-full h-full object-cover object-center"
                style={{ filter: 'brightness(1.12) contrast(1.15) saturate(1.2)' }}
              />
            </div>
            
            {/* Gold glow effect */}
            <div className="absolute -inset-4 bg-[#d4a843]/15 rounded-3xl blur-2xl -z-10" />
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
              {/* Host Image */}
              <div className="w-40 h-40 rounded-full mx-auto mb-6 overflow-hidden border-2 border-[#d4a843]/30">
                <img 
                  src={host.image}
                  alt={host.name}
                  className="w-full h-full object-cover object-top"
                  style={{ filter: 'brightness(1.12) contrast(1.15) saturate(1.2)' }}
                />
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
              url={sample.url}
              size={sample.size}
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
            Get Broadcast License
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
