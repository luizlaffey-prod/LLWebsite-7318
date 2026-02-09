import { Layout } from "../../components/shared";
import { Link } from "wouter";
import { ArrowRight, Play, Pause, Lock, Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";
import { useSubscription } from "../../hooks/useSubscription";

const hosts = [
  {
    name: "Paulinho Ribeiro",
    role: "Host & Creator",
    description: "Paulinho began his career as a commercial announcer in 1987 and became an FM radio host the following year, a role he continues to this day. A music enthusiast, he worked as a professional DJ between 1987 and 1988 and, after years of research and study, became a composer and music producer, creating remixes, albums, and film soundtracks. Today, Paulinho hosts Zero Point Zero, a weekly journey through the world of electronic music and its many branches. On air since the 1990s, the show blends fresh tracks, exclusive interviews, and international contributions, establishing itself as a unique space connecting audiences with the global underground dance scene. With Paulinho Ribeiro's voice and charisma — Zero Point Zero is more than just a radio show: it's a space of discovery, emotion, and connection for everyone who truly lives music.",
    image: "/6ea770b1-15be-4c48-8ef5-52b329805968.jpg",
  },
  {
    name: "Tony Caldeira",
    role: "DJ & Producer",
    description: "Tony Caldeira is a fitness industry entrepreneur, a music lover, and a radio enthusiast. In 1990, invited by his friend Nilton Rabello, he co-produced Hot Dance for Manchete FM—a show tailored for the underground dance scene. Following the show's success, his entrepreneurial spirit led him to open Mega Rink in 1991, a roller skating venue in São Paulo's north side, always set to great music. His growing recognition in the radio scene opened doors to produce shows for several stations, including Adrenalina on Transamérica, Pool After Hours on Pool FM, Zero Point Zero on Nova FM, Night Sessions Late Edition on Energia 97, and today, he continues Zero Point Zero on Pool FM Web Radio. For over three decades, his work has been celebrated by both listeners and the radio industry.",
    image: "/96212d13-3911-42df-8679-1edc3485bdbe.jpeg",
  },
  {
    name: "Nilton Rabello",
    role: "DJ & Vinyl Curator",
    description: "Nilton Rabello is a very private guy—not much of a talker, but all about the music. His collection, made up entirely of vinyl, has already surpassed 1,500 records. A true lover of quality music, he began selling rare vinyl in the mid-80s. By the early 90s, he launched his own record import business, DISCOBOX, supplying nightclubs and FM radio stations. With his exceptional musical knowledge, Nilton was invited to produce specialized radio shows like Hot Dance on Manchete FM (1991), Pool After Hours on Pool FM (1995), and that same year, Zero Point Zero on Nova FM—an international collaboration with DJs from London's Kiss FM and New York's Victor Simonelli from Bassline Records. For nearly 11 years, he shared the DJ booth with longtime friend and musical partner Tony Caldeira on the Night Sessions show for Energia 97 FM. Originally from São Paulo, Nilton Rabello has lived in London and now resides in Philadelphia, shipping records to Brazil and around the globe through his online store.",
    image: "/8b032f74-e303-40c4-bf52-121fc4a63606.jpg",
  },
  {
    name: "Caio Eduardo",
    role: "Technical Support",
    description: "The technical backbone of Zero Point Zero, ensuring every episode sounds pristine and professional.",
    image: "/f70963f4-6c01-4eff-949d-92a18c14881c.jpeg",
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
      </div>
    </div>
  );
}

function HeroSection() {
  const { t } = useTranslation();
  
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
              {t("zero.overline")}
            </span>
            
            <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.05]">
              {t("zero.hero.title")}{" "}
              <span className="text-[#e67e22]">{t("zero.hero.titleHighlight")}</span>
            </h1>
            
            <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed mb-8">
              {t("zero.hero.subtitle")}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/plans"
                className="inline-flex items-center gap-3 px-8 py-4 bg-[#e67e22] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#f39c12] hover:shadow-xl hover:shadow-[#e67e22]/25"
              >
                {t("zero.hero.ctaSubscribe")}
                <ArrowRight size={18} />
              </Link>
              <a
                href="#samples"
                className="inline-flex items-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#e67e22] hover:text-[#e67e22]"
              >
                {t("zero.hero.ctaSamples")}
              </a>
            </div>
          </div>

          {/* Visual - Hero Artwork (Astronaut) */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-[#e67e22]/30 relative">
              <img 
                src="/bc51e756-947c-401e-974a-ad2113b8aa8b.jpg" 
                alt={t("zero.hero.titleHighlight")}
                className="w-full h-full object-cover image-enhance"
              />
              {/* Overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 via-transparent to-transparent" />
            </div>
            
            {/* Orange glow */}
            <div className="absolute -inset-4 bg-[#e67e22]/15 rounded-3xl blur-2xl -z-10" />
          </div>
        </div>
      </div>
    </section>
  );
}

function HostsSection() {
  const { t } = useTranslation();
  
  const hostsData = [
    {
      id: "paulinho",
      image: "/6ea770b1-15be-4c48-8ef5-52b329805968.jpg",
    },
    {
      id: "nilton",
      image: "/8b032f74-e303-40c4-bf52-121fc4a63606.jpg",
    },
    {
      id: "tony",
      image: "/96212d13-3911-42df-8679-1edc3485bdbe.jpeg",
    },
    {
      id: "caio",
      image: "/f70963f4-6c01-4eff-949d-92a18c14881c.jpeg",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#e67e22]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#e67e22] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("zero.hosts.title")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            {t("zero.hosts.title")} <span className="text-[#e67e22]">{t("zero.hosts.titleHighlight")}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {hostsData.map((host) => (
            <div
              key={host.id}
              className="bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#e67e22]/30 transition-all duration-500 group"
            >
              {/* Host Image */}
              <div className="w-80 h-80 rounded-full mx-auto mb-6 overflow-hidden border-2 border-[#e67e22]/30 group-hover:border-[#e67e22]/60 transition-all duration-500">
                <img 
                  src={host.image} 
                  alt={t(`zero.hosts.${host.id}.name`)}
                  className="w-full h-full object-cover image-enhance"
                />
              </div>
              
              <h3 className="font-heading text-2xl text-white text-center mb-2">
                {t(`zero.hosts.${host.id}.name`)}
              </h3>
              <p className="text-[#e67e22] text-xs text-center mb-4 uppercase tracking-wider">{t(`zero.hosts.${host.id}.role`)}</p>
              <p className="font-body text-white/60 text-sm text-center leading-relaxed">
                {t(`zero.hosts.${host.id}.description`)}
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
  const { user } = useAuth();
  const { hasAccess, loading } = useSubscription();

  // Always show the full page - no lock screen
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
