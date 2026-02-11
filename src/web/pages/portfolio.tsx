import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const productions = [
  {
    id: 1,
    title: "The Chosen",
    type: "Television Series",
    subtitle: "Seasons 1 & 2",
    description: "Oversaw the localization process exclusively for Seasons 1 and 2 of the most-translated TV series in history. A groundbreaking series about the life of Jesus, dubbed into 100+ languages and subtitled in 600 languages through the Come and See Foundation.",
    image: "/the-chosen-s1-s2.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2022-2023"
  },
  {
    id: 2,
    title: "Tuttle Twins",
    type: "Television Series",
    subtitle: "Multi-Season",
    description: "Educational animated series following adventurous twins on quests through time. Oversaw multilingual localization for educational streaming platform reaching worldwide audiences.",
    image: "/tuttle-twins.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2021-Present"
  },
  {
    id: 3,
    title: "The Wingfeather Saga",
    type: "Television Series",
    subtitle: "Seasons 1-3",
    description: "Animated fantasy series chronicling the adventures and transformations of the Igiby family. Managed comprehensive multilingual localization for international streaming distribution.",
    image: "/wingfeather-saga.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2022-2025"
  },
  {
    id: 4,
    title: "The Wayfinders",
    type: "Television Series",
    subtitle: "Streaming",
    description: "Adventure-driven series on Angel Studios. Oversaw multilingual dubbing and localization for global streaming audience.",
    image: "/the-wayfinders.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024-2025"
  },
  // Jungle Beat removed - no localization involvement
  {
    id: 5,
    title: "Homestead: The Series",
    type: "Television Series",
    subtitle: "Streaming",
    description: "Post-apocalyptic survival series. Oversaw comprehensive multilingual localization for global streaming distribution.",
    image: "/homestead-series.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024-2025"
  },
  {
    id: 6,
    title: "Sound of Freedom",
    type: "Theatrical Film",
    subtitle: "2023",
    description: "Critically acclaimed film about modern slavery. Oversaw multilingual localization to reach international audiences with this powerful story of freedom and justice.",
    image: "/sound-of-freedom-2023.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2023"
  },
  {
    id: 7,
    title: "The Shift",
    type: "Theatrical Film",
    subtitle: "2023",
    description: "Sci-fi thriller exploring alternate realities and human choice. Managed comprehensive multilingual dubbing and localization for worldwide distribution.",
    image: "/the-shift-2023.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2023"
  },
  {
    id: 8,
    title: "After Death",
    type: "Documentary",
    subtitle: "2023",
    description: "Compelling documentary exploring end-of-life experiences. Oversaw localization to multiple languages for global impact and audience engagement.",
    image: "/after-death-2023.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2023"
  },
  {
    id: 9,
    title: "His Only Son",
    type: "Theatrical Film",
    subtitle: "2023",
    description: "Angel Studios' first theatrical release. Oversaw the localization process in all available languages, ensuring premium dubbing quality for international audiences.",
    image: "/his-only-son.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2023"
  },
  {
    id: 10,
    title: "Cabrini",
    type: "Theatrical Film",
    subtitle: "2024",
    description: "Epic biographical drama about Mother Cabrini. Directed comprehensive multilingual localization for global theatrical release across international markets.",
    image: "/cabrini-2024.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024"
  },
  {
    id: 11,
    title: "SIGHT",
    type: "Theatrical Film",
    subtitle: "2024",
    description: "Touching drama about love and connection. Oversaw professional localization into multiple languages to ensure emotional authenticity across cultures.",
    image: "/sight-2024.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024"
  },
  {
    id: 12,
    title: "Sound of Hope: The Story of Possum Trot",
    type: "Theatrical Film",
    subtitle: "2024",
    description: "Uplifting story of redemption and family. Managed multilingual dubbing and localization for international theatrical distribution.",
    image: "/sound-of-hope-2024.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024"
  },
  {
    id: 13,
    title: "Homestead",
    type: "Theatrical Film",
    subtitle: "2024",
    description: "Post-apocalyptic thriller exploring survival and humanity. Oversaw localization oversight for Angel Studios' theatrical slate, reaching audiences worldwide.",
    image: "/homestead-2024.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024"
  },
  {
    id: 14,
    title: "Brave the Dark",
    type: "Theatrical Film",
    subtitle: "2024",
    description: "Sci-fi thriller about courage and hope. Directed multilingual localization for premium theatrical experience across global markets.",
    image: "/brave-the-dark-2024.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2024"
  },
  {
    id: 15,
    title: "The King of Kings",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Epic biblical drama bringing the life and ministry of Jesus to audiences worldwide. Directed comprehensive multilingual localization oversight for global theatrical release.",
    image: "/king-of-kings-english.jpg",  // Fixed: English poster
    role: "Head of Languages - Localization Oversight",
    year: "2025"
  },
  {
    id: 16,
    title: "DAVID",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Cinematic retelling of the biblical story of David. Oversaw localization process across multiple languages for international theatrical distribution through Angel Studios.",
    image: "/david-2025.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2025"
  },
  {
    id: 18,
    title: "The Last Rodeo",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Contemporary western drama starring Neal McDonough. Managed multilingual localization to deliver authentic cultural experience across international audiences.",
    image: "/the-last-rodeo-2025-new.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2025"
  },
  {
    id: 19,
    title: "Rule Breakers",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Inspiring sports drama. Oversaw comprehensive multilingual dubbing and localization for global theatrical distribution.",
    image: "/rule-breakers-2025.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2025"
  },
  {
    id: 20,
    title: "Truth & Treason",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Historical thriller exploring pivotal moments. Directed multilingual localization for international audiences with cultural precision.",
    image: "/truth-treason-2025.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2025"
  },
];

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
            Localization & Dubbing
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            Featured <span className="text-[#d4a843]">Work</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl">
            Global Head of Languages at Angel Studios. Overseeing comprehensive localization, dubbing, and multilingual production across 20+ theatrical, streaming, and television productions—reaching audiences in 100+ languages worldwide.
          </p>
        </div>
      </div>
    </section>
  );
}

function ProductionGallery() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Clean poster grid - responsive 3-5 columns */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
          {productions.map((prod, idx) => (
            <div
              key={prod.id}
              className="group relative"
              style={{
                animation: `fade-in-up 0.6s ease-out forwards`,
                animationDelay: `${idx * 0.05}s`,
                opacity: 0
              }}
            >
              {/* Poster Container */}
              <div className="relative overflow-hidden rounded-lg shadow-2xl shadow-black/50 border border-white/5 hover:border-[#d4a843]/30 transition-all duration-500">
                {/* Poster Image */}
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="w-full h-auto object-cover aspect-[3/4] group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Info on Hover */}
                <div className="absolute inset-0 flex flex-col justify-end p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="space-y-1.5">
                    <p className="text-[#d4a843] text-xs uppercase tracking-widest font-bold">
                      {prod.role}
                    </p>
                    <p className="text-white/80 text-xs line-clamp-2">
                      {prod.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Info Below Poster */}
              <div className="mt-2">
                <h3 className="font-heading text-sm text-white group-hover:text-[#d4a843] transition-colors line-clamp-2">
                  {prod.title}
                </h3>
                <p className="text-[#d4a843] text-xs uppercase tracking-wider font-medium mt-0.5">
                  {prod.type}
                </p>
                {prod.subtitle && (
                  <p className="text-white/50 text-xs mt-0.5">
                    {prod.subtitle}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS for animation */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <div className="group">
            <h3 className="font-heading text-4xl md:text-5xl text-[#d4a843] mb-2">20+</h3>
            <p className="font-body text-white/70">Productions Overseen</p>
            <p className="text-white/50 text-sm mt-2">Films & Series</p>
          </div>
          
          <div className="group">
            <h3 className="font-heading text-4xl md:text-5xl text-[#d4a843] mb-2">6+</h3>
            <p className="font-body text-white/70">Television Series</p>
            <p className="text-white/50 text-sm mt-2">Multi-Season</p>
          </div>
          
          <div className="group">
            <h3 className="font-heading text-4xl md:text-5xl text-[#d4a843] mb-2">100+</h3>
            <p className="font-body text-white/70">Languages Supported</p>
            <p className="text-white/50 text-sm mt-2">Global Distribution</p>
          </div>
          
          <div className="group">
            <h3 className="font-heading text-4xl md:text-5xl text-[#d4a843] mb-2">Worldwide</h3>
            <p className="font-body text-white/70">Audience Reach</p>
            <p className="text-white/50 text-sm mt-2">Cultural Precision</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0d1628] to-[#0a0a0a]" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Ready to Bring Your <span className="text-[#d4a843]">Vision</span> to <span className="text-[#0047ab]">Life?</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          From concept to global distribution, we handle premium dubbing, localization, and multilingual production across all languages and platforms — with the expertise of a global production leader.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            Get in Touch
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            Explore Services
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Portfolio() {
  return (
    <Layout>
      <HeroSection />
      <ProductionGallery />
      <StatsSection />
      <CTASection />
    </Layout>
  );
}
