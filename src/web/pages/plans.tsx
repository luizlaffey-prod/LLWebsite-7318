import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Check, Radio, Download, Sparkles, Clock, Shield, HelpCircle } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
          {t("plans.overline")}
        </span>
        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.1] animate-fade-in-delay-1">
          {t("plans.hero.title1")}{" "}
          <span className="text-[#d4a843]">{t("plans.hero.titleHighlight")}</span>
        </h1>
        <p className="font-body text-lg md:text-xl text-white/70 max-w-3xl mx-auto animate-fade-in-delay-2">
          {t("plans.subtitle")}
        </p>
      </div>
    </section>
  );
}

function PricingSection() {
  const { t } = useTranslation();

  const plans = [
    {
      id: "monthly",
      nameKey: "plans.pricing.monthly.name",
      priceKey: "plans.pricing.monthly.price",
      periodKey: "plans.pricing.monthly.period",
      descriptionKey: "plans.pricing.monthly.description",
      featuresPrefix: "plans.pricing.monthly.features",
      featureKeys: ["perProgram", "weekly", "download", "promo", "cancel"],
      ctaKey: "plans.pricing.monthly.cta",
      popular: false,
    },
    {
      id: "annual",
      nameKey: "plans.pricing.annual.name",
      priceKey: "plans.pricing.annual.price",
      periodKey: "plans.pricing.annual.period",
      descriptionKey: "plans.pricing.annual.description",
      badgeKey: "plans.pricing.annual.badge",
      featuresPrefix: "plans.pricing.annual.features",
      featureKeys: ["perProgram", "weekly", "fullYear", "promo", "support"],
      ctaKey: "plans.pricing.annual.cta",
      popular: true,
    },
    {
      id: "dual",
      nameKey: "plans.pricing.dual.name",
      priceKey: "plans.pricing.dual.price",
      periodKey: "plans.pricing.dual.period",
      descriptionKey: "plans.pricing.dual.description",
      badgeKey: "plans.pricing.dual.badge",
      featuresPrefix: "plans.pricing.dual.features",
      featureKeys: ["bothPrograms", "preferential", "strategic", "allBenefits", "priority"],
      ctaKey: "plans.pricing.dual.cta",
      popular: false,
      isDual: true
    },
  ];

  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#111111] border rounded-2xl p-8 transition-all duration-500 flex flex-col ${
                plan.popular
                  ? "border-[#d4a843]/50 shadow-xl shadow-[#d4a843]/10"
                  : "border-white/5 hover:border-white/10"
              } ${plan.isDual ? "md:border-[#0047ab]/30" : ""}`}
            >
              {/* Badge */}
              {plan.badgeKey && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <span className={`px-4 py-1.5 text-[#0a0a0a] text-xs font-bold uppercase tracking-wider rounded-full ${
                    plan.isDual ? "bg-[#0047ab] text-white" : "bg-[#d4a843]"
                  }`}>
                    {t(plan.badgeKey)}
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="font-heading text-2xl text-white mb-2">{t(plan.nameKey)}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`font-heading text-5xl ${plan.isDual ? "text-[#0047ab]" : "text-[#d4a843]"}`}>{t(plan.priceKey)}</span>
                  <span className="font-body text-white/50">{t(plan.periodKey)}</span>
                </div>
                <p className="font-body text-white/60 text-sm mt-4">{t(plan.descriptionKey)}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-1">
                {plan.featureKeys.map((featureKey) => (
                  <li key={featureKey} className="flex items-start gap-3">
                    <Check className={`${plan.isDual ? "text-[#0047ab]" : "text-[#d4a843]"} shrink-0 mt-0.5`} size={18} />
                    <span className="font-body text-white/80 text-sm">
                      {t(`${plan.featuresPrefix}.${featureKey}`)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/login"
                className={`block w-full text-center py-4 font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 ${
                  plan.popular
                    ? "bg-[#d4a843] text-[#0a0a0a] hover:bg-[#e8c574]"
                    : plan.isDual
                    ? "bg-[#0047ab] text-white hover:bg-[#005ce6]"
                    : "border border-[#d4a843] text-[#d4a843] hover:bg-[#d4a843]/10"
                }`}
              >
                {t(plan.ctaKey)}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const { t } = useTranslation();

  const benefits = [
    {
      icon: Radio,
      titleKey: "plans.benefits.noCosts.title",
      descriptionKey: "plans.benefits.noCosts.description",
    },
    {
      icon: Clock,
      titleKey: "plans.benefits.consistent.title",
      descriptionKey: "plans.benefits.consistent.description",
    },
    {
      icon: Sparkles,
      titleKey: "plans.benefits.professional.title",
      descriptionKey: "plans.benefits.professional.description",
    },
    {
      icon: Download,
      titleKey: "plans.benefits.easy.title",
      descriptionKey: "plans.benefits.easy.description",
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("plans.benefits.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            {t("plans.benefits.title")} <span className="text-[#d4a843]">{t("plans.benefits.titleHighlight")}</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.titleKey}
              className="bg-[#111111] border border-white/5 rounded-xl p-6 hover:border-[#d4a843]/30 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-4">
                <benefit.icon className="text-[#d4a843]" size={24} />
              </div>
              <h3 className="font-heading text-xl text-white mb-2">{t(benefit.titleKey)}</h3>
              <p className="font-body text-white/60 text-sm leading-relaxed">
                {t(benefit.descriptionKey)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { questionKey: "plans.faq.q1.question", answerKey: "plans.faq.q1.answer" },
    { questionKey: "plans.faq.q2.question", answerKey: "plans.faq.q2.answer" },
    { questionKey: "plans.faq.q3.question", answerKey: "plans.faq.q3.answer" },
    { questionKey: "plans.faq.q4.question", answerKey: "plans.faq.q4.answer" },
    { questionKey: "plans.faq.q5.question", answerKey: "plans.faq.q5.answer" },
    { questionKey: "plans.faq.q6.question", answerKey: "plans.faq.q6.answer" },
  ];

  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            {t("plans.faq.overline")}
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            {t("plans.faq.title")} <span className="text-[#d4a843]">{t("plans.faq.titleHighlight")}</span>
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 text-left"
              >
                <span className="font-heading text-lg text-white pr-4">{t(faq.questionKey)}</span>
                <HelpCircle
                  className={`text-[#d4a843] shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  size={20}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="font-body text-white/70 leading-relaxed">{t(faq.answerKey)}</p>
                </div>
              )}
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
        <Shield className="w-16 h-16 text-[#d4a843] mx-auto mb-6" />
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          {t("plans.cta.title")} <span className="text-[#d4a843]">{t("plans.cta.titleHighlight")}</span> {t("plans.cta.titleEnd")}
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          {t("plans.cta.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            {t("plans.cta.getStarted")}
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            {t("plans.cta.contactSales")}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Plans() {
  return (
    <Layout>
      <HeroSection />
      <PricingSection />
      <BenefitsSection />
      <FAQSection />
      <CTASection />
    </Layout>
  );
}
