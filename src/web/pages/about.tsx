import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Target, Heart, Sparkles, Users, Award, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

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
            {t("about.overline")}
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            {t("about.hero.title1")}{" "}
            <span className="text-[#d4a843]">{t("about.hero.storytelling")}</span>,{" "}
            <span className="text-[#0047ab]">{t("about.hero.sound")}</span>, &{" "}
            <span className="text-[#d4a843]">{t("about.hero.culture")}</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2">
            {t("about.subtitle")}
          </p>
        </div>
      </div>
    </section>
  );
}

function StorySection() {
  const { t } = useTranslation();

  const stats = [
    { value: "20+", labelKey: "about.stats.years" },
    { value: "50+", labelKey: "about.stats.languages" },
    { value: "500+", labelKey: "about.stats.projects" },
    { value: "100%", labelKey: "about.stats.satisfaction" },
  ];

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              {t("about.story.overline")}
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-8">
              {t("about.story.title")} <span className="text-[#d4a843]">{t("about.story.titleHighlight")}</span> {t("about.story.titleEnd")}
            </h2>
            <div className="space-y-6 font-body text-white/70 leading-relaxed">
              <p>{t("about.story.p1")}</p>
              <p>{t("about.story.p2")}</p>
              <p>{t("about.story.p3")}</p>
            </div>
          </div>

          {/* Right - Stats Grid */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.labelKey}
                className="bg-[#111111] border border-white/5 rounded-xl p-8 text-center hover:border-[#d4a843]/30 transition-all duration-500"
              >
                <div className="font-heading text-5xl md:text-6xl text-[#d4a843] mb-2">
                  {stat.value}
                </div>
                <div className="font-body text-sm text-white/60 uppercase tracking-wider">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionSection() {
  const { t } = useTranslation();

  const missionPillars = [
    {
      icon: Target,
      titleKey: "about.mission.precision.title",
      descriptionKey: "about.mission.precision.description",
    },
    {
      icon: Heart,
      titleKey: "about.mission.passion.title",
      descriptionKey: "about.mission.passion.description",
    },
    {
      icon: Globe,
      titleKey: "about.mission.connection.title",
      descriptionKey: "about.mission.connection.description",
    },
    {
      icon: Sparkles,
      titleKey: "about.mission.creativity.title",
      descriptionKey: "about.mission.creativity.description",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/50 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("about.mission.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6">
            {t("about.mission.title")} <span className="text-[#d4a843]">{t("about.mission.titleHighlight")}</span> {t("about.mission.titleEnd")}
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            {t("about.mission.subtitle")}
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {missionPillars.map((pillar, index) => (
            <div
              key={pillar.titleKey}
              className="group relative bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-6 group-hover:bg-[#d4a843]/20 transition-colors">
                <pillar.icon className="text-[#d4a843]" size={28} />
              </div>
              <h3 className="font-heading text-2xl text-white mb-3 group-hover:text-[#d4a843] transition-colors">
                {t(pillar.titleKey)}
              </h3>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                {t(pillar.descriptionKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("about.philosophy.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-8">
            "{t("about.philosophy.title")} <span className="text-[#d4a843]">{t("about.philosophy.titleHighlight")}</span>"
          </h2>
          <p className="font-body text-lg text-white/70 leading-relaxed mb-8">
            {t("about.philosophy.p1")}
          </p>
          <p className="font-body text-white/60 leading-relaxed">
            {t("about.philosophy.p2")}
          </p>
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              {t("about.team.overline")}
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-8">
              {t("about.team.title1")}<span className="text-[#d4a843]">{t("about.team.titleHighlight")}</span> {t("about.team.title2")}
            </h2>
            <div className="space-y-6 font-body text-white/70 leading-relaxed">
              <p>{t("about.team.p1")}</p>
              <p>{t("about.team.p2")}</p>
            </div>
            
            {/* Team Features */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d4a843]/10 flex items-center justify-center">
                  <Users className="text-[#d4a843]" size={20} />
                </div>
                <span className="font-body text-white/80">{t("about.team.globalNetwork")}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d4a843]/10 flex items-center justify-center">
                  <Award className="text-[#d4a843]" size={20} />
                </div>
                <span className="font-body text-white/80">{t("about.team.sagAftra")}</span>
              </div>
            </div>
          </div>

          {/* Right - Visual */}
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-[#d4a843]/10 via-[#1a1a1a] to-[#0047ab]/10 border border-white/5 flex items-center justify-center">
              <div className="text-center">
                <div className="font-heading text-8xl text-[#d4a843]/20 mb-4">LLP</div>
                <div className="font-body text-white/40 uppercase tracking-widest text-sm">
                  Excellence in Every Project
                </div>
              </div>
            </div>
            {/* Decorative */}
            <div className="absolute -top-4 -right-4 w-24 h-24 border border-[#d4a843]/20 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 border border-[#0047ab]/20 rounded-full" />
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
          {t("about.cta.title")} <span className="text-[#d4a843]">{t("about.cta.titleHighlight")}</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          {t("about.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            {t("about.cta.contact")}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            {t("about.cta.services")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function About() {
  return (
    <Layout>
      <HeroSection />
      <StorySection />
      <MissionSection />
      <PhilosophySection />
      <TeamSection />
      <CTASection />
    </Layout>
  );
}
