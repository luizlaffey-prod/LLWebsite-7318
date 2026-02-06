import { Layout } from "../../components/shared";
import { Link } from "wouter";
import { useState } from "react";
import { ArrowRight, Film, Clock, DollarSign, Sparkles, Target, Check, Mail } from "lucide-react";

const differentiators = [
  "Creative direction from experienced producers, not just prompts",
  "Human oversight at every stage of production",
  "Brand consistency and storytelling expertise",
  "Fast turnaround without compromising quality",
  "Fraction of traditional production costs",
];

const problems = [
  {
    icon: DollarSign,
    title: "High Costs",
    description: "Traditional video production requires crews, equipment, locations—costs that exclude many businesses.",
  },
  {
    icon: Clock,
    title: "Slow Timelines",
    description: "Weeks or months from concept to delivery. Markets move faster than production schedules.",
  },
  {
    icon: Target,
    title: "Scaling Challenges",
    description: "Creating variations for different markets or campaigns multiplies time and cost.",
  },
];

function HeroSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1628] to-[#0a0a0a]" />
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#0047ab]/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(0, 71, 171, 0.15) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0, 71, 171, 0.15) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <Link href="/services" className="inline-flex items-center gap-2 text-[#d4a843] text-sm mb-6 hover:gap-3 transition-all">
            <ArrowRight size={14} className="rotate-180" /> Back to Services
          </Link>

          {/* Coming Soon Badge */}
          <div className="inline-block px-4 py-2 bg-[#0047ab]/20 border border-[#0047ab]/30 rounded-full text-[#0047ab] text-sm font-medium uppercase tracking-widest mb-6 animate-fade-in">
            Coming Soon
          </div>

          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-6 leading-[1.05] animate-fade-in-delay-1">
            Cinematic Advertising{" "}
            <span className="text-[#0047ab]">Video</span>{" "}
            Production Powered by{" "}
            <span className="text-[#d4a843]">AI</span>
          </h1>

          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl mb-8">
            High-impact video advertising at accessible costs. We're a production studio 
            that uses AI as our engine—combining cutting-edge technology with creative 
            direction from experienced producers.
          </p>

          <a
            href="#early-access"
            className="inline-flex items-center gap-3 px-8 py-4 bg-[#0047ab] text-white font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#1a5dc9] hover:shadow-xl hover:shadow-[#0047ab]/25 animate-fade-in-delay-3"
          >
            Get Early Access
            <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0047ab]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#0047ab] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            The Problem
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Traditional Video is <span className="text-[#0047ab]">Broken</span>
          </h2>
          <p className="font-body text-white/60 max-w-2xl mx-auto">
            For too long, high-quality video advertising has been out of reach for most businesses.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem) => (
            <div
              key={problem.title}
              className="bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#0047ab]/30 transition-all duration-500"
            >
              <div className="w-14 h-14 rounded-lg bg-[#0047ab]/10 flex items-center justify-center mb-6">
                <problem.icon className="text-[#0047ab]" size={28} />
              </div>
              <h3 className="font-heading text-2xl text-white mb-3">{problem.title}</h3>
              <p className="font-body text-white/60 leading-relaxed">
                {problem.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0d1628]/30 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              The Solution
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
              AI as a <span className="text-[#d4a843]">Production Engine</span>
            </h2>
            <p className="font-body text-lg text-white/70 leading-relaxed mb-8">
              We're not a software platform. We're a production studio that leverages AI 
              to create cinematic advertising videos faster and more affordably than 
              traditional methods—without sacrificing quality or creative vision.
            </p>
            <p className="font-body text-white/60 leading-relaxed">
              Our experienced producers guide every project. AI handles the heavy lifting; 
              humans provide the creative direction, brand understanding, and storytelling 
              expertise that makes video truly effective.
            </p>
          </div>

          {/* Visual placeholder */}
          <div className="relative aspect-video rounded-2xl bg-gradient-to-br from-[#0047ab]/20 via-[#111111] to-[#d4a843]/10 border border-white/10 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="text-[#0047ab]/30" size={120} />
            </div>
            
            {/* Animated elements */}
            <div className="absolute top-4 left-4 px-3 py-1.5 bg-[#d4a843]/20 rounded text-[#d4a843] text-xs font-medium">
              AI-Powered
            </div>
            <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-[#0047ab]/20 rounded text-[#0047ab] text-xs font-medium">
              Human-Directed
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DifferentiatorsSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
              What Sets Us Apart
            </span>
            <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
              A <span className="text-[#d4a843]">Different</span> Approach
            </h2>
          </div>

          <div className="space-y-4">
            {differentiators.map((item, index) => (
              <div
                key={index}
                className="flex items-start gap-4 bg-[#111111] border border-white/5 rounded-lg p-5 hover:border-[#d4a843]/30 transition-all duration-300"
              >
                <div className="w-8 h-8 rounded-full bg-[#d4a843]/10 flex items-center justify-center shrink-0">
                  <Check className="text-[#d4a843]" size={16} />
                </div>
                <p className="font-body text-white/80 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function EarlyAccessSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setEmail("");
  };

  return (
    <section id="early-access" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0d1628] to-[#0a0a0a]" />
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(0, 71, 171, 0.15) 1px, transparent 0)`,
        backgroundSize: '32px 32px'
      }} />
      
      <div className="relative max-w-2xl mx-auto px-6 text-center">
        <Sparkles className="w-12 h-12 text-[#0047ab] mx-auto mb-6" />
        <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
          Be <span className="text-[#0047ab]">First</span> in Line
        </h2>
        <p className="font-body text-lg text-white/70 mb-10">
          Sign up to receive early access when we launch. Be among the first to 
          experience a new era in video advertising production.
        </p>

        {submitted ? (
          <div className="bg-[#0047ab]/20 border border-[#0047ab]/30 rounded-xl p-8">
            <Mail className="w-12 h-12 text-[#0047ab] mx-auto mb-4" />
            <h3 className="font-heading text-2xl text-white mb-2">You're on the list!</h3>
            <p className="font-body text-white/70">
              We'll notify you as soon as AI Video Ads launches.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#0047ab] focus:outline-none transition-colors"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-[#0047ab] text-white font-semibold text-sm uppercase tracking-wider rounded-lg transition-all duration-300 hover:bg-[#1a5dc9] shrink-0"
            >
              Notify Me
            </button>
          </form>
        )}

        <p className="font-body text-white/40 text-sm mt-6">
          We respect your privacy. No spam, ever.
        </p>
      </div>
    </section>
  );
}

export default function AIVideoAds() {
  return (
    <Layout>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <DifferentiatorsSection />
      <EarlyAccessSection />
    </Layout>
  );
}
