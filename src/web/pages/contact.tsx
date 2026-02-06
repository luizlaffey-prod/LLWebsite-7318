import { Layout } from "../components/shared";
import { Mail, Send, MessageSquare } from "lucide-react";
import { useState } from "react";

function HeroSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
            Get In Touch
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            Let's <span className="text-[#d4a843]">Start</span> a{" "}
            <span className="text-[#0047ab]">Conversation</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl">
            Have a project in mind? Questions about our services? We'd love to 
            hear from you. Reach out and let's discuss how we can work together.
          </p>
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
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
              Send Us a <span className="text-[#d4a843]">Message</span>
            </h2>

            {submitted ? (
              <div className="bg-[#d4a843]/10 border border-[#d4a843]/30 rounded-xl p-8 text-center">
                <MessageSquare className="w-12 h-12 text-[#d4a843] mx-auto mb-4" />
                <h3 className="font-heading text-2xl text-white mb-2">Thank You!</h3>
                <p className="font-body text-white/70">
                  We've received your message and will get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block font-body text-white/80 text-sm mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block font-body text-white/80 text-sm mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                    placeholder="john@example.com"
                  />
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block font-body text-white/80 text-sm mb-2">
                    Your Message
                  </label>
                  <textarea
                    id="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-[#111111] border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors resize-none"
                    placeholder="Tell us about your project..."
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
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
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
              Contact <span className="text-[#d4a843]">Information</span>
            </h2>

            <div className="space-y-8">
              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center shrink-0">
                  <Mail className="text-[#d4a843]" size={24} />
                </div>
                <div>
                  <h3 className="font-heading text-xl text-white mb-2">Email Us</h3>
                  <a
                    href="mailto:contact@luizlaffeyproductions.com"
                    className="font-body text-[#d4a843] hover:text-[#e8c574] transition-colors"
                  >
                    contact@luizlaffeyproductions.com
                  </a>
                  <p className="font-body text-white/50 text-sm mt-1">
                    We typically respond within 24 hours
                  </p>
                </div>
              </div>

              {/* Response Time Note */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <h4 className="font-heading text-lg text-white mb-3">What to Include</h4>
                <ul className="font-body text-white/60 text-sm space-y-2">
                  <li>• Brief description of your project</li>
                  <li>• Timeline and deadlines if applicable</li>
                  <li>• Languages or services needed</li>
                  <li>• Any specific requirements or questions</li>
                </ul>
              </div>

              {/* Services Quick Links */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <h4 className="font-heading text-lg text-white mb-3">Looking For...</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    Dubbing Services
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    Voice-Over
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    Translation
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    Radio Licensing
                  </span>
                  <span className="px-3 py-1.5 bg-white/5 text-white/70 text-sm rounded-full">
                    Subtitling
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
