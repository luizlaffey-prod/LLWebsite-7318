import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Mic, Globe, Languages, Subtitles, Quote, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

function Hero() {
  const { t } = useTranslation();
  
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0a0a0a] to-[#0d1628]" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#d4a843]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#0047ab]/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(212, 168, 67, 0.15) 1px, transparent 0)`,
          backgroundSize: '48px 48px'
        }} />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-4xl">
          {/* Overline */}
          <div className="animate-fade-in-up mb-6">
            <span className="inline-block px-4 py-2 bg-[#d4a843]/10 border border-[#d4a843]/30 rounded-full text-[#d4a843] text-sm font-medium uppercase tracking-widest">
              {t("home.badge")}
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.95] mb-8 animate-fade-in-delay-1">
            <span className="text-white">{t("home.hero.title1")} </span>
            <span className="text-[#d4a843]">{t("home.hero.stories")}</span>
            <br />
            <span className="text-white">{t("home.hero.title2")} </span>
            <span className="text-[#0047ab]">{t("home.hero.voice")}</span>
          </h1>

          {/* Subheadline */}
          <p className="font-body text-lg md:text-xl text-white/70 max-w-2xl mb-10 leading-relaxed animate-fade-in-delay-2">
            {t("home.subtitle")}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-delay-3">
            <Link
              href="/services"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
            >
              {t("home.cta.services")}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/portfolio"
              className="group inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
            >
              {t("home.cta.work")}
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-[#d4a843] rounded-full" />
        </div>
      </div>
    </section>
  );
}

function ServicesPreview() {
  const { t } = useTranslation();

  const services = [
    {
      icon: Mic,
      titleKey: "home.services.dubbing.title",
      descriptionKey: "home.services.dubbing.description",
    },
    {
      icon: Globe,
      titleKey: "home.services.voiceover.title",
      descriptionKey: "home.services.voiceover.description",
    },
    {
      icon: Languages,
      titleKey: "home.services.translation.title",
      descriptionKey: "home.services.translation.description",
    },
    {
      icon: Subtitles,
      titleKey: "home.services.subtitling.title",
      descriptionKey: "home.services.subtitling.description",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117] to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("home.services.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6">
            {t("home.services.title")} <span className="text-[#d4a843]">{t("home.services.titleHighlight")}</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            {t("home.services.subtitle")}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => (
            <div
              key={service.titleKey}
              className="group relative bg-[#111111] border border-white/5 rounded-xl p-8 transition-all duration-500 hover:border-[#d4a843]/30 hover:bg-[#111111]/80"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-6 group-hover:bg-[#d4a843]/20 transition-colors">
                <service.icon className="text-[#d4a843]" size={28} />
              </div>

              {/* Content */}
              <h3 className="font-heading text-2xl text-white mb-3 group-hover:text-[#d4a843] transition-colors">
                {t(service.titleKey)}
              </h3>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                {t(service.descriptionKey)}
              </p>

              {/* Hover Accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#d4a843] to-[#0047ab] opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 text-[#d4a843] font-medium hover:text-[#e8c574] transition-colors group"
          >
            {t("home.services.viewAll")}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function OriginalsTeaser() {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0a0a0a]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("home.originals.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6">
            {t("home.originals.title")} <span className="text-[#d4a843]">{t("home.originals.titleHighlight")}</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            {t("home.originals.subtitle")}
          </p>
        </div>

        {/* Shows Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Luiz Laffey's Collection */}
          <Link href="/originals/luiz-laffeys-collection" className="group">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#d4a843]/20 via-[#1a1a1a] to-[#0a0a0a] border border-[#d4a843]/20 transition-all duration-500 group-hover:border-[#d4a843]/50 group-hover:shadow-2xl group-hover:shadow-[#d4a843]/10">
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <span className="text-[#d4a843] text-xs uppercase tracking-widest mb-2">
                  {t("home.originals.collection.tag")}
                </span>
                <h3 className="font-heading text-3xl md:text-4xl text-white mb-3 group-hover:text-[#d4a843] transition-colors">
                  {t("home.originals.collection.title")}
                </h3>
                <p className="font-body text-white/60 text-sm line-clamp-2">
                  {t("home.originals.collection.description")}
                </p>
                <div className="flex items-center gap-2 mt-4 text-[#d4a843] font-medium text-sm group-hover:gap-3 transition-all">
                  {t("home.originals.collection.cta")} <ArrowRight size={16} />
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-20 h-20 border border-[#d4a843]/30 rounded-full" />
              <div className="absolute top-8 right-8 w-12 h-12 bg-[#d4a843]/20 rounded-full" />
            </div>
          </Link>

          {/* Zero Point Zero */}
          <Link href="/originals/zero-point-zero" className="group">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#e67e22]/20 via-[#1a1a1a] to-[#0a0a0a] border border-[#e67e22]/20 transition-all duration-500 group-hover:border-[#e67e22]/50 group-hover:shadow-2xl group-hover:shadow-[#e67e22]/10">
              {/* Content Overlay */}
              <div className="absolute inset-0 flex flex-col justify-end p-8">
                <span className="text-[#e67e22] text-xs uppercase tracking-widest mb-2">
                  {t("home.originals.zero.tag")}
                </span>
                <h3 className="font-heading text-3xl md:text-4xl text-white mb-3 group-hover:text-[#e67e22] transition-colors">
                  {t("home.originals.zero.title")}
                </h3>
                <p className="font-body text-white/60 text-sm line-clamp-2">
                  {t("home.originals.zero.description")}
                </p>
                <div className="flex items-center gap-2 mt-4 text-[#e67e22] font-medium text-sm group-hover:gap-3 transition-all">
                  {t("home.originals.zero.cta")} <ArrowRight size={16} />
                </div>
              </div>
              
              {/* Decorative Elements */}
              <div className="absolute top-4 right-4 w-20 h-20 border border-[#e67e22]/30 rounded-full" />
              <div className="absolute top-8 right-8 w-12 h-12 bg-[#e67e22]/20 rounded-full" />
            </div>
          </Link>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/originals"
            className="inline-flex items-center gap-2 text-[#d4a843] font-medium hover:text-[#e8c574] transition-colors group"
          >
            {t("home.originals.viewAll")}
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  const { t } = useTranslation();

  const testimonials = [
    {
      quoteKey: "home.testimonials.quote1",
      authorKey: "home.testimonials.author1",
      companyKey: "home.testimonials.company1",
      rating: 5,
    },
    {
      quoteKey: "home.testimonials.quote2",
      authorKey: "home.testimonials.author2",
      companyKey: "home.testimonials.company2",
      rating: 5,
    },
    {
      quoteKey: "home.testimonials.quote3",
      authorKey: "home.testimonials.author3",
      companyKey: "home.testimonials.company3",
      rating: 5,
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1117] via-[#0a0a0a] to-[#0a0a0a]" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("home.testimonials.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6">
            {t("home.testimonials.title")} <span className="text-[#d4a843]">{t("home.testimonials.titleHighlight")}</span>
          </h2>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500"
            >
              {/* Quote Icon */}
              <Quote className="text-[#d4a843]/30 mb-4" size={36} />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="text-[#d4a843] fill-[#d4a843]" size={16} />
                ))}
              </div>

              {/* Quote */}
              <p className="font-body text-white/80 leading-relaxed mb-6 italic">
                "{t(testimonial.quoteKey)}"
              </p>

              {/* Author */}
              <div className="border-t border-white/10 pt-4">
                <div className="font-heading text-white">{t(testimonial.authorKey)}</div>
                <div className="font-body text-white/50 text-sm">{t(testimonial.companyKey)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactCTA() {
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
          {t("home.contact.title")} <span className="text-[#d4a843]">{t("home.contact.titleHighlight")}</span>?
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          {t("home.contact.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            {t("home.contact.cta")}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            {t("home.contact.services")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout>
      <Hero />
      <ServicesPreview />
      <OriginalsTeaser />
      <Testimonials />
      <ContactCTA />
    </Layout>
  );
}
