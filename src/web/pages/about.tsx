import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Target, Heart, Sparkles, Users, Award, Globe } from "lucide-react";

const missionPillars = [
  {
    icon: Target,
    title: "Precision",
    description: "Every word, every tone, every nuance matters. We deliver nothing less than perfect.",
  },
  {
    icon: Heart,
    title: "Passion",
    description: "We love what we do. That passion translates into exceptional work for every project.",
  },
  {
    icon: Globe,
    title: "Connection",
    description: "Breaking language barriers to connect stories with audiences worldwide.",
  },
  {
    icon: Sparkles,
    title: "Creativity",
    description: "Innovation in audio production, pushing boundaries while honoring tradition.",
  },
];

const stats = [
  { value: "20+", label: "Years Experience" },
  { value: "50+", label: "Languages" },
  { value: "500+", label: "Projects Completed" },
  { value: "100%", label: "Client Satisfaction" },
];

function HeroSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/3 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
            About Us
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            At the Intersection of{" "}
            <span className="text-[#d4a843]">Storytelling</span>,{" "}
            <span className="text-[#0047ab]">Sound</span>, &{" "}
            <span className="text-[#d4a843]">Culture</span>
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2">
            Luiz Laffey Productions is a creative production company bringing voices 
            to life across borders. We believe that great audio production serves the 
            story—and when done right, it becomes invisible, allowing the narrative 
            to shine.
          </p>
        </div>
      </div>
    </section>
  );
}

function StorySection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <div>
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              Our Story
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-8">
              Founded on <span className="text-[#d4a843]">Decades</span> of Experience
            </h2>
            <div className="space-y-6 font-body text-white/70 leading-relaxed">
              <p>
                Luiz Laffey Productions was founded by Luiz Laffey, a creative professional 
                with over 20 years of experience in voice acting, dubbing, radio broadcasting, 
                and music curation.
              </p>
              <p>
                What began as a passion for storytelling through sound has evolved into a 
                full-service creative production company. Today, Luiz serves as Head of 
                Languages at Angel Studios, bringing his expertise to major productions 
                while continuing to lead his own creative ventures.
              </p>
              <p>
                Our team combines technical excellence with artistic sensibility, ensuring 
                every project we touch maintains the highest standards of quality while 
                preserving the emotional essence of the original work.
              </p>
            </div>
          </div>

          {/* Right - Stats Grid */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[#111111] border border-white/5 rounded-xl p-8 text-center hover:border-[#d4a843]/30 transition-all duration-500"
              >
                <div className="font-heading text-5xl md:text-6xl text-[#d4a843] mb-2">
                  {stat.value}
                </div>
                <div className="font-body text-sm text-white/60 uppercase tracking-wider">
                  {stat.label}
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
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/50 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Our Mission
          </span>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl text-white mb-6">
            What <span className="text-[#d4a843]">Drives</span> Us
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            Our mission pillars guide every decision, every project, and every relationship.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {missionPillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="group relative bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-6 group-hover:bg-[#d4a843]/20 transition-colors">
                <pillar.icon className="text-[#d4a843]" size={28} />
              </div>
              <h3 className="font-heading text-2xl text-white mb-3 group-hover:text-[#d4a843] transition-colors">
                {pillar.title}
              </h3>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhilosophySection() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Our Philosophy
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-8">
            "Good Production is <span className="text-[#d4a843]">Invisible</span>"
          </h2>
          <p className="font-body text-lg text-white/70 leading-relaxed mb-8">
            The best audio production doesn't draw attention to itself. It serves the story, 
            enhances the emotion, and creates an experience so seamless that audiences forget 
            they're hearing a translation, a dub, or a voice-over. When our work is at its best, 
            it's invisible—and the story takes center stage.
          </p>
          <p className="font-body text-white/60 leading-relaxed">
            This philosophy guides every project we undertake. We don't just translate words; 
            we translate intent, emotion, and cultural nuance. We don't just record voices; 
            we capture performances that resonate with audiences across the globe.
          </p>
        </div>
      </div>
    </section>
  );
}

function TeamSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1117]/30 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              Our Team
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-8">
              <span className="text-[#d4a843]">Experts</span> in Every Language
            </h2>
            <div className="space-y-6 font-body text-white/70 leading-relaxed">
              <p>
                Our team brings together voice actors, translators, audio engineers, 
                and creative directors from around the world. Each member is a specialist 
                in their craft, united by a shared commitment to excellence.
              </p>
              <p>
                From native speakers who understand cultural subtleties to technical 
                experts who ensure pristine audio quality, our collaborative approach 
                delivers results that exceed expectations.
              </p>
            </div>
            
            {/* Team Features */}
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d4a843]/10 flex items-center justify-center">
                  <Users className="text-[#d4a843]" size={20} />
                </div>
                <span className="font-body text-white/80">Global Network</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#d4a843]/10 flex items-center justify-center">
                  <Award className="text-[#d4a843]" size={20} />
                </div>
                <span className="font-body text-white/80">SAG-AFTRA Certified</span>
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
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0d1628] to-[#0a0a0a]" />
      
      <div className="relative max-w-4xl mx-auto px-6 text-center">
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Let's Work <span className="text-[#d4a843]">Together</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          Ready to bring your story to global audiences? We'd love to hear about 
          your project and discuss how we can help.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            Contact Us
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/services"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            Our Services
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
