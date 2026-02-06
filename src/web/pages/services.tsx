import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Mic, Film, Languages, Subtitles, CheckCircle, Play } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ServiceData {
  id: string;
  icon: typeof Mic;
  titleKey: string;
  subtitleKey: string;
  descriptionKey: string;
  featuresPrefix: string;
  featureKeys: string[];
  highlightKey: string;
}

const services: ServiceData[] = [
  {
    id: "voiceover",
    icon: Mic,
    titleKey: "services.voiceover.title",
    subtitleKey: "services.voiceover.subtitle",
    descriptionKey: "services.voiceover.description",
    featuresPrefix: "services.voiceover.features",
    featureKeys: ["commercial", "documentary", "elearning", "corporate", "ivr", "audiobook"],
    highlightKey: "services.voiceover.highlight",
  },
  {
    id: "dubbing",
    icon: Film,
    titleKey: "services.dubbing.title",
    subtitleKey: "services.dubbing.subtitle",
    descriptionKey: "services.dubbing.description",
    featuresPrefix: "services.dubbing.features",
    featureKeys: ["film", "tv", "animation", "games", "streaming", "character"],
    highlightKey: "services.dubbing.highlight",
  },
  {
    id: "translation",
    icon: Languages,
    titleKey: "services.translation.title",
    subtitleKey: "services.translation.subtitle",
    descriptionKey: "services.translation.description",
    featuresPrefix: "services.translation.features",
    featureKeys: ["script", "cultural", "dialogue", "marketing", "technical", "qa"],
    highlightKey: "services.translation.highlight",
  },
  {
    id: "subtitling",
    icon: Subtitles,
    titleKey: "services.subtitling.title",
    subtitleKey: "services.subtitling.subtitle",
    descriptionKey: "services.subtitling.description",
    featuresPrefix: "services.subtitling.features",
    featureKeys: ["sdh", "multilingual", "timed", "translation", "timing", "formatting"],
    highlightKey: "services.subtitling.highlight",
  },
];

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute top-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
            {t("services.overline")}
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            {t("services.hero.title1")} <span className="text-[#d4a843]">{t("services.hero.audio")}</span>{" "}
            {t("services.hero.title2")} <span className="text-[#0047ab]">{t("services.hero.services")}</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl">
            {t("services.subtitle")}
          </p>
        </div>
      </div>
    </section>
  );
}

function ServiceDetail({ service, index }: { service: ServiceData; index: number }) {
  const { t } = useTranslation();
  const isEven = index % 2 === 0;
  const Icon = service.icon;
  
  return (
    <section id={service.id} className="py-20 relative">
      {index > 0 && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
      
      <div className="max-w-7xl mx-auto px-6">
        <div className={`grid lg:grid-cols-2 gap-12 items-center ${isEven ? '' : 'lg:flex-row-reverse'}`}>
          {/* Content */}
          <div className={isEven ? '' : 'lg:order-2'}>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
                <Icon className="text-[#d4a843]" size={28} />
              </div>
              <div>
                <h2 className="font-heading text-3xl md:text-4xl text-white">
                  {t(service.titleKey)}
                </h2>
                <p className="font-body text-[#d4a843] text-sm">{t(service.subtitleKey)}</p>
              </div>
            </div>

            <p className="font-body text-white/70 leading-relaxed mb-8 text-lg">
              {t(service.descriptionKey)}
            </p>

            {/* Features */}
            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {service.featureKeys.map((featureKey) => (
                <div key={featureKey} className="flex items-start gap-3">
                  <CheckCircle className="text-[#d4a843] shrink-0 mt-0.5" size={18} />
                  <span className="font-body text-white/80 text-sm">
                    {t(`${service.featuresPrefix}.${featureKey}`)}
                  </span>
                </div>
              ))}
            </div>

            {/* Highlight */}
            <div className="bg-[#d4a843]/10 border border-[#d4a843]/20 rounded-lg p-4 mb-8">
              <p className="font-body text-[#d4a843] text-sm font-medium">
                {t(service.highlightKey)}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-4">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574]"
              >
                <Play size={16} />
                {t("services.cta.portfolio")}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
              >
                {t("services.cta.quote")}
              </Link>
            </div>
          </div>

          {/* Visual */}
          <div className={isEven ? 'lg:order-2' : ''}>
            <div className="relative aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#1a1a1a] via-[#111111] to-[#0a0a0a] border border-white/5 overflow-hidden">
              {/* Decorative content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="text-[#d4a843]/10" size={160} />
              </div>
              
              {/* Grid overlay */}
              <div className="absolute inset-0 opacity-20" style={{
                backgroundImage: `linear-gradient(rgba(212, 168, 67, 0.1) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(212, 168, 67, 0.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px'
              }} />

              {/* Accent elements */}
              <div className="absolute top-4 right-4 w-20 h-20 border border-[#d4a843]/30 rounded-full" />
              <div className="absolute bottom-4 left-4 w-16 h-16 bg-[#d4a843]/10 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AIVideoAdsTeaser() {
  const { t } = useTranslation();

  return (
    <section className="py-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-br from-[#0047ab]/20 via-[#111111] to-[#d4a843]/10 border border-white/10 rounded-2xl p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-xl">
              <span className="inline-block px-3 py-1 bg-[#0047ab]/30 text-[#0047ab] text-xs font-medium uppercase tracking-wider rounded mb-4">
                {t("services.aiVideoAds.badge")}
              </span>
              <h3 className="font-heading text-3xl md:text-4xl text-white mb-4">
                {t("services.aiVideoAds.title")} <span className="text-[#d4a843]">{t("services.aiVideoAds.titleHighlight")}</span>
              </h3>
              <p className="font-body text-white/70">
                {t("services.aiVideoAds.description")}
              </p>
            </div>
            <Link
              href="/services/ai-video-ads"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] shrink-0"
            >
              {t("services.aiVideoAds.cta")}
              <ArrowRight size={16} />
            </Link>
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
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(212, 168, 67, 0.1) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          {t("services.ctaSection.title")} <span className="text-[#d4a843]">{t("services.ctaSection.titleHighlight")}</span> {t("services.ctaSection.titleEnd")}
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          {t("services.ctaSection.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            {t("services.ctaSection.quote")}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            {t("services.ctaSection.portfolio")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Services() {
  return (
    <Layout>
      <HeroSection />
      {services.map((service, index) => (
        <ServiceDetail key={service.id} service={service} index={index} />
      ))}
      <AIVideoAdsTeaser />
      <CTASection />
    </Layout>
  );
}
