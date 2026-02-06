import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Check, Radio, Download, Sparkles, Clock, Shield, HelpCircle } from "lucide-react";
import { useState } from "react";

const plans = [
  {
    id: "standard",
    name: "Standard",
    price: "$9.99",
    period: "/month",
    description: "Full access to our radio programming library with generic promotional materials.",
    features: [
      "Access to all episodes",
      "Both radio shows included",
      "Weekly new episodes",
      "High-quality audio files",
      "Generic promo materials",
      "Download & broadcast rights",
    ],
    cta: "Subscribe Monthly",
    popular: false,
  },
  {
    id: "annual",
    name: "Annual Broadcaster",
    price: "$99",
    period: "/year",
    description: "Best value for radio stations. Custom promotional materials tailored to your brand.",
    features: [
      "Everything in Standard",
      "Custom promo materials",
      "Station-branded content",
      "Priority support",
      "Early episode access",
      "2 months free (vs monthly)",
    ],
    cta: "Subscribe Annually",
    popular: true,
  },
];

const benefits = [
  {
    icon: Radio,
    title: "No Production Costs",
    description: "Skip the expense of creating original content. Our shows are ready to air.",
  },
  {
    icon: Clock,
    title: "Consistent Delivery",
    description: "New episodes delivered on schedule, every week. Build your programming around our reliability.",
  },
  {
    icon: Sparkles,
    title: "Professional Content",
    description: "High-quality production from experienced hosts. Content your listeners will love.",
  },
  {
    icon: Download,
    title: "Easy Integration",
    description: "Download, schedule, and broadcast. That simple. Compatible with any broadcast system.",
  },
];

const faqs = [
  {
    question: "How do I access the episodes?",
    answer: "After subscribing, you'll receive login credentials to our member dashboard. From there, you can download episodes directly and access promotional materials.",
  },
  {
    question: "Can I use the content on multiple stations?",
    answer: "Each subscription covers a single broadcast license. For multi-station operations, please contact us for custom enterprise pricing.",
  },
  {
    question: "What formats are the episodes available in?",
    answer: "Episodes are provided in broadcast-ready WAV and high-quality MP3 formats, suitable for any broadcast system.",
  },
  {
    question: "How often are new episodes released?",
    answer: "New episodes for both shows are released weekly. Annual subscribers get early access 24 hours before standard release.",
  },
  {
    question: "What are custom promo materials?",
    answer: "Annual Broadcaster subscribers receive promotional spots and bumpers customized with their station's name and branding, professionally produced by our team.",
  },
  {
    question: "Is there a contract or can I cancel anytime?",
    answer: "Standard monthly plans can be cancelled anytime. Annual plans are billed yearly with no refunds for early cancellation.",
  },
];

function HeroSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
          Radio Station Licensing
        </span>
        <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.1] animate-fade-in-delay-1">
          Universal Radio{" "}
          <span className="text-[#d4a843]">Subscription</span>{" "}
          Offer
        </h1>
        <p className="font-body text-lg md:text-xl text-white/70 max-w-3xl mx-auto animate-fade-in-delay-2">
          Premium radio programming. Licensed. Ready to air. Subscribe, download 
          your first episode, and put it on air this week.
        </p>
      </div>
    </section>
  );
}

function PricingSection() {
  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-[#111111] border rounded-2xl p-8 transition-all duration-500 ${
                plan.popular
                  ? "border-[#d4a843]/50 shadow-xl shadow-[#d4a843]/10"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1.5 bg-[#d4a843] text-[#0a0a0a] text-xs font-bold uppercase tracking-wider rounded-full">
                    Best Value
                  </span>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="font-heading text-2xl text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="font-heading text-5xl text-[#d4a843]">{plan.price}</span>
                  <span className="font-body text-white/50">{plan.period}</span>
                </div>
                <p className="font-body text-white/60 text-sm mt-4">{plan.description}</p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="text-[#d4a843] shrink-0 mt-0.5" size={18} />
                    <span className="font-body text-white/80 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="/login"
                className={`block w-full text-center py-4 font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 ${
                  plan.popular
                    ? "bg-[#d4a843] text-[#0a0a0a] hover:bg-[#e8c574]"
                    : "border border-[#d4a843] text-[#d4a843] hover:bg-[#d4a843]/10"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Why Subscribe
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Broadcaster <span className="text-[#d4a843]">Benefits</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="bg-[#111111] border border-white/5 rounded-xl p-6 hover:border-[#d4a843]/30 transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-4">
                <benefit.icon className="text-[#d4a843]" size={24} />
              </div>
              <h3 className="font-heading text-xl text-white mb-2">{benefit.title}</h3>
              <p className="font-body text-white/60 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-3xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Questions
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Frequently <span className="text-[#d4a843]">Asked</span>
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
                <span className="font-heading text-lg text-white pr-4">{faq.question}</span>
                <HelpCircle
                  className={`text-[#d4a843] shrink-0 transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                  size={20}
                />
              </button>
              {openIndex === index && (
                <div className="px-6 pb-6">
                  <p className="font-body text-white/70 leading-relaxed">{faq.answer}</p>
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
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0d1628] to-[#0a0a0a]" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <Shield className="w-16 h-16 text-[#d4a843] mx-auto mb-6" />
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Ready to <span className="text-[#d4a843]">Elevate</span> Your Programming?
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          Subscribe, download your first episode, and put it on air this week. 
          Join radio stations worldwide who trust our content.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            Get Started
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            Contact Sales
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
