import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Play, Film, Mic, Subtitles, Languages } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

const portfolioItems = [
  {
    id: 1,
    category: "dubbing",
    title: "Feature Film Dubbing",
    client: "Major Streaming Platform",
    description: "Complete multilingual dubbing for a feature-length drama, delivered in 8 languages.",
    languages: ["Portuguese", "Spanish", "French", "German", "Italian", "Japanese", "Korean", "Mandarin"],
    icon: Film,
  },
  {
    id: 2,
    category: "dubbing",
    title: "Animation Series",
    client: "Children's Network",
    description: "Character voice matching and dubbing for a 26-episode animated series.",
    languages: ["Portuguese", "Spanish"],
    icon: Film,
  },
  {
    id: 3,
    category: "voiceover",
    title: "Commercial Campaign",
    client: "Fortune 500 Brand",
    description: "Multi-market commercial voice-over campaign with regional adaptations.",
    languages: ["English", "Spanish", "Portuguese"],
    icon: Mic,
  },
  {
    id: 4,
    category: "voiceover",
    title: "Documentary Narration",
    client: "Documentary Studio",
    description: "Compelling narration for a nature documentary series.",
    languages: ["English"],
    icon: Mic,
  },
  {
    id: 5,
    category: "voiceover",
    title: "E-Learning Platform",
    client: "EdTech Company",
    description: "Professional voice-over for 100+ educational modules.",
    languages: ["English", "Spanish"],
    icon: Mic,
  },
  {
    id: 6,
    category: "subtitling",
    title: "Streaming Content",
    client: "Entertainment Platform",
    description: "SDH and multilingual subtitling for original streaming content.",
    languages: ["English", "Spanish", "Portuguese", "French"],
    icon: Subtitles,
  },
  {
    id: 7,
    category: "subtitling",
    title: "Film Festival Entry",
    client: "Independent Studio",
    description: "Timed subtitles and closed captioning for international film festival.",
    languages: ["English", "French"],
    icon: Subtitles,
  },
  {
    id: 8,
    category: "translation",
    title: "Script Localization",
    client: "Television Network",
    description: "Cultural adaptation and dialogue rewriting for Latin American market.",
    languages: ["Spanish (LATAM)", "Portuguese (BR)"],
    icon: Languages,
  },
  {
    id: 9,
    category: "translation",
    title: "Marketing Campaign",
    client: "Global Brand",
    description: "Full localization of marketing materials for 12 international markets.",
    languages: ["Multiple"],
    icon: Languages,
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
            {t("portfolio.overline")}
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            {t("portfolio.hero.title1")} <span className="text-[#d4a843]">{t("portfolio.hero.titleHighlight")}</span> {t("portfolio.hero.title2")}{" "}
            <span className="text-[#0047ab]">{t("portfolio.hero.volumes")}</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl">
            {t("portfolio.subtitle")}
          </p>
        </div>
      </div>
    </section>
  );
}

function PortfolioGrid() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { id: "all", labelKey: "portfolio.categories.all" },
    { id: "dubbing", labelKey: "portfolio.categories.dubbing" },
    { id: "voiceover", labelKey: "portfolio.categories.voiceover" },
    { id: "subtitling", labelKey: "portfolio.categories.subtitling" },
    { id: "translation", labelKey: "portfolio.categories.translation" },
  ];

  const filteredItems = activeCategory === "all" 
    ? portfolioItems 
    : portfolioItems.filter(item => item.category === activeCategory);

  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-3 mb-12 justify-center">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-full font-body text-sm uppercase tracking-wider transition-all duration-300 ${
                activeCategory === cat.id
                  ? "bg-[#d4a843] text-[#0a0a0a]"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {t(cat.labelKey)}
            </button>
          ))}
        </div>

        {/* Portfolio Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-[#111111] border border-white/5 rounded-xl overflow-hidden hover:border-[#d4a843]/30 transition-all duration-500"
            >
              {/* Preview Area */}
              <div className="aspect-video bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] relative flex items-center justify-center">
                <item.icon className="text-[#d4a843]/20 group-hover:text-[#d4a843]/30 transition-colors" size={64} />
                
                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-16 h-16 rounded-full bg-[#d4a843] flex items-center justify-center shadow-xl shadow-[#d4a843]/25">
                    <Play className="text-[#0a0a0a] ml-1" size={24} fill="currentColor" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-[#d4a843]/10 text-[#d4a843] text-xs uppercase tracking-wider rounded">
                    {t(`portfolio.categories.${item.category}`)}
                  </span>
                </div>
                
                <h3 className="font-heading text-xl text-white mb-2 group-hover:text-[#d4a843] transition-colors">
                  {item.title}
                </h3>
                
                <p className="font-body text-white/50 text-sm mb-3">{item.client}</p>
                
                <p className="font-body text-white/70 text-sm mb-4 line-clamp-2">
                  {item.description}
                </p>

                {/* Languages */}
                <div className="flex flex-wrap gap-1">
                  {item.languages.slice(0, 3).map((lang) => (
                    <span key={lang} className="px-2 py-0.5 bg-white/5 text-white/50 text-xs rounded">
                      {lang}
                    </span>
                  ))}
                  {item.languages.length > 3 && (
                    <span className="px-2 py-0.5 bg-white/5 text-white/50 text-xs rounded">
                      +{item.languages.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ClientsSection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6 text-center">
        <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
          {t("portfolio.clients.overline")}
        </span>
        <h2 className="font-heading text-3xl md:text-4xl text-white mb-12">
          {t("portfolio.clients.title")} <span className="text-[#d4a843]">{t("portfolio.clients.titleHighlight")}</span>
        </h2>

        {/* Client Logos Placeholder */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white/5 rounded-lg flex items-center justify-center"
            >
              <span className="font-body text-white/30 text-sm">Client {i + 1}</span>
            </div>
          ))}
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
          {t("portfolio.cta.title")} <span className="text-[#d4a843]">{t("portfolio.cta.titleHighlight")}</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          {t("portfolio.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            {t("portfolio.cta.start")}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            {t("portfolio.cta.services")}
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
      <PortfolioGrid />
      <ClientsSection />
      <CTASection />
    </Layout>
  );
}
