import { Layout } from "../components/shared";
import { Mail, Send, MessageSquare } from "lucide-react";
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

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
            {t("contact.overline")}
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            {t("contact.hero.title1")} <span className="text-[#d4a843]">{t("contact.hero.titleHighlight")}</span> {t("contact.hero.title2")}{" "}
            <span className="text-[#0047ab]">{t("contact.hero.conversation")}</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl">
            {t("contact.subtitle")}
          </p>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    setSubmitted(true);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Form */}
          <div>
            <h2 className="font-heading text-3xl md:text-4xl text-white mb-8">
              {t("contact.form.title")} <span className="text-[#d4a843]">{t("contact.form.titleHighlight")}</span>
            </h2>

            {submitted ? (
              <div className="bg-[#d4a843]/10 border border-[#d4a843]/30 rounded-xl p-8 text-center">
                <MessageSquare className="w-12 h-12 text-[#d4a843] mx-auto mb-4" />
                <h3 className="font-heading text-2xl text-white mb-2">{t("contact.form.success.title")}</h3>
                <p className="font-body text-white/70">
                  {t("contact.form.success.message")}
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block font-body text-white/80 text-sm mb-2">
                    {t("contact.form.name")}
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                    placeholder={t("contact.form.namePlaceholder")}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block font-body text-white/80 text-sm mb-2">
                    {t("contact.form.email")}
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                    placeholder={t("contact.form.emailPlaceholder")}
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block font-body text-white/80 text-sm mb-2">
                    {t("contact.form.message")}
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors resize-none"
                    placeholder={t("contact.form.messagePlaceholder")}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-[#0a0a0a]/30 border-t-[#0a0a0a] rounded-full animate-spin" />
                      {t("contact.form.sending")}
                    </>
                  ) : (
                    <>
                      {t("contact.form.submit")}
                      <Send size={18} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="font-heading text-3xl md:text-4xl text-white mb-8">
              {t("contact.info.title")} <span className="text-[#d4a843]">{t("contact.info.titleHighlight")}</span>
            </h2>

            <div className="space-y-8">
              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center shrink-0">
                  <Mail className="text-[#d4a843]" size={24} />
                </div>
                <div>
                  <h3 className="font-heading text-xl text-white mb-2">{t("contact.info.emailTitle")}</h3>
                  <a
                    href="mailto:contact@luizlaffeyproductions.com"
                    className="font-body text-[#d4a843] hover:text-[#e8c574] transition-colors"
                  >
                    {t("contact.info.emailAddress")}
                  </a>
                  <p className="font-body text-white/50 text-sm mt-1">
                    {t("contact.info.response")}
                  </p>
                </div>
              </div>

              {/* Response Time Note */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <h4 className="font-heading text-lg text-white mb-3">{t("contact.info.include.title")}</h4>
                <ul className="font-body text-white/60 text-sm space-y-2">
                  <li>• {t("contact.info.include.item1")}</li>
                  <li>• {t("contact.info.include.item2")}</li>
                  <li>• {t("contact.info.include.item3")}</li>
                  <li>• {t("contact.info.include.item4")}</li>
                </ul>
              </div>

              {/* Services Quick Links */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <h4 className="font-heading text-lg text-white mb-3">{t("contact.info.lookingFor.title")}</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    {t("contact.info.lookingFor.dubbing")}
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    {t("contact.info.lookingFor.voiceover")}
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    {t("contact.info.lookingFor.translation")}
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    {t("contact.info.lookingFor.licensing")}
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    {t("contact.info.lookingFor.subtitling")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Contact() {
  return (
    <Layout>
      <HeroSection />
      <ContactForm />
    </Layout>
  );
}
