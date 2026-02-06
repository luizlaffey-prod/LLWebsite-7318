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
    title: "His Only Son",
    type: "Theatrical Film",
    subtitle: "2023",
    description: "Angel Studios' first theatrical release. Oversaw the localization process in all available languages, ensuring premium dubbing quality for international audiences.",
    image: "/his-only-son.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2023"
  },
  {
    id: 3,
    title: "The King of Kings",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Epic biblical drama bringing the life and ministry of Jesus to audiences worldwide. Directed comprehensive multilingual localization oversight for global theatrical release.",
    image: "/king-of-kings.jpg",
    role: "Head of Languages - Localization Oversight",
    year: "2025"
  },
  {
    id: 4,
    title: "DAVID",
    type: "Theatrical Film",
    subtitle: "2025",
    description: "Cinematic retelling of the biblical story of David. Oversaw localization process across multiple languages for international theatrical distribution through Angel Studios.",
    image: "/david-2025.jpg",
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
            Localization oversight for Angel Studios' theatrical slate, reaching audiences worldwide. As Global Head of Languages, directing multilingual dubbing and localization for premium content.
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
        {/* Clean poster grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {productions.map((prod, idx) => (
            <div
              key={prod.id}
              className="group relative"
              style={{
                animation: `fade-in-up 0.6s ease-out forwards`,
                animationDelay: `${idx * 0.1}s`,
                opacity: 0
              }}
            >
              {/* Poster Container */}
              <div className="relative overflow-hidden rounded-2xl shadow-2xl shadow-black/50 border border-white/5 hover:border-[#d4a843]/30 transition-all duration-500">
                {/* Poster Image */}
                <img
                  src={prod.image}
                  alt={prod.title}
                  className="w-full h-auto object-cover aspect-[3/4] group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Info on Hover */}
                <div className="absolute inset-0 flex flex-col justify-end p-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="space-y-3">
                    <div>
                      <p className="text-[#d4a843] text-xs uppercase tracking-widest font-bold mb-1">
                        {prod.role}
                      </p>
                      <p className="text-white/80 text-sm">
                        {prod.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Below Poster */}
              <div className="mt-4">
                <h3 className="font-heading text-xl text-white group-hover:text-[#d4a843] transition-colors">
                  {prod.title}
                </h3>
                <p className="text-[#d4a843] text-sm uppercase tracking-wider font-medium mt-1">
                  {prod.type}
                </p>
                {prod.subtitle && (
                  <p className="text-white/50 text-sm mt-1">
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
          From concept to distribution, we handle premium dubbing, localization, and multilingual production across all languages and platforms.
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
      <CTASection />
    </Layout>
  );
}
