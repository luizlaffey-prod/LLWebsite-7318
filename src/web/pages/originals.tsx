import { Layout } from "../components/shared";
import { Link } from "wouter";
import { ArrowRight, Radio, Music, Waves } from "lucide-react";

const shows = [
  {
    id: "luiz-laffeys-collection",
    title: "Luiz Laffey's Collection",
    subtitle: "Music • Storytelling • Soul",
    description: "More than a radio show — it's a musical journey. Disco, funk, soulful house, nu-disco with storytelling that connects the music to the moment.",
    href: "/originals/luiz-laffeys-collection",
    accentColor: "#d4a843",
    gradient: "from-[#d4a843]/20 via-[#1a1a1a] to-[#0a0a0a]",
    borderColor: "border-[#d4a843]/20",
    hoverBorder: "hover:border-[#d4a843]/50",
    shadowColor: "shadow-[#d4a843]/10",
  },
  {
    id: "zero-point-zero",
    title: "Zero Point Zero",
    subtitle: "Electronic • Cosmic • Journey",
    description: "A 60-minute cosmic journey through electronic music since the 1990s. Deep grooves, ethereal soundscapes, and timeless beats.",
    href: "/originals/zero-point-zero",
    accentColor: "#e67e22",
    gradient: "from-[#e67e22]/20 via-[#1a1a1a] to-[#0a0a0a]",
    borderColor: "border-[#e67e22]/20",
    hoverBorder: "hover:border-[#e67e22]/50",
    shadowColor: "shadow-[#e67e22]/10",
  },
];

function HeroSection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#e67e22]/5 rounded-full blur-3xl" />
      
      {/* Sound wave pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 1200 400" preserveAspectRatio="none">
          {Array.from({ length: 50 }).map((_, i) => (
            <line
              key={i}
              x1={i * 24 + 12}
              y1={200 - Math.sin(i * 0.3) * (50 + i * 2)}
              x2={i * 24 + 12}
              y2={200 + Math.sin(i * 0.3) * (50 + i * 2)}
              stroke="#d4a843"
              strokeWidth="2"
              strokeLinecap="round"
            />
          ))}
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="max-w-4xl">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block animate-fade-in">
            Original Content
          </span>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl text-white mb-8 leading-[1.1] animate-fade-in-delay-1">
            <span className="text-[#d4a843]">Radio</span> Programs{" "}
            <span className="text-[#e67e22]">Original</span> Content
          </h1>
          <p className="font-body text-lg md:text-xl text-white/70 leading-relaxed animate-fade-in-delay-2 max-w-3xl">
            Original radio programming that blends music, storytelling, and cultural exploration. 
            Crafted by passionate hosts, delivered to stations worldwide.
          </p>
        </div>
      </div>
    </section>
  );
}

function ShowsGrid() {
  return (
    <section className="py-16 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-8">
          {shows.map((show) => (
            <Link key={show.id} href={show.href} className="group">
              <div className={`relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br ${show.gradient} border ${show.borderColor} transition-all duration-500 ${show.hoverBorder} group-hover:shadow-2xl group-hover:${show.shadowColor}`}>
                {/* Decorative Sound Waves */}
                <div className="absolute inset-0 opacity-30">
                  <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                    {Array.from({ length: 20 }).map((_, i) => (
                      <circle
                        key={i}
                        cx={200}
                        cy={150}
                        r={30 + i * 12}
                        fill="none"
                        stroke={show.accentColor}
                        strokeWidth="1"
                        opacity={1 - i * 0.05}
                      />
                    ))}
                  </svg>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-8">
                  <span style={{ color: show.accentColor }} className="text-xs uppercase tracking-widest mb-2">
                    {show.subtitle}
                  </span>
                  <h3 className="font-heading text-3xl md:text-4xl text-white mb-3 group-hover:transition-colors" style={{ '--hover-color': show.accentColor } as React.CSSProperties}>
                    {show.title}
                  </h3>
                  <p className="font-body text-white/60 text-sm line-clamp-3 mb-4">
                    {show.description}
                  </p>
                  <div className="flex items-center gap-2 font-medium text-sm group-hover:gap-3 transition-all" style={{ color: show.accentColor }}>
                    Explore Show <ArrowRight size={16} />
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-4 right-4 w-20 h-20 border rounded-full opacity-30" style={{ borderColor: show.accentColor }} />
                <div className="absolute top-8 right-8 w-12 h-12 rounded-full opacity-20" style={{ backgroundColor: show.accentColor }} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#d4a843]/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
            Why Choose Our Shows
          </span>
          <h2 className="font-heading text-4xl md:text-5xl text-white mb-6">
            Premium <span className="text-[#d4a843]">Radio</span> Programming
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500">
            <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-6">
              <Radio className="text-[#d4a843]" size={28} />
            </div>
            <h3 className="font-heading text-2xl text-white mb-3">Ready to Air</h3>
            <p className="font-body text-white/60 text-sm leading-relaxed">
              Professionally produced episodes ready for broadcast. Just download and play.
            </p>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500">
            <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-6">
              <Music className="text-[#d4a843]" size={28} />
            </div>
            <h3 className="font-heading text-2xl text-white mb-3">Curated Content</h3>
            <p className="font-body text-white/60 text-sm leading-relaxed">
              Expertly selected music and storytelling from hosts with decades of experience.
            </p>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-xl p-8 hover:border-[#d4a843]/30 transition-all duration-500">
            <div className="w-14 h-14 rounded-lg bg-[#d4a843]/10 flex items-center justify-center mb-6">
              <Waves className="text-[#d4a843]" size={28} />
            </div>
            <h3 className="font-heading text-2xl text-white mb-3">Consistent Delivery</h3>
            <p className="font-body text-white/60 text-sm leading-relaxed">
              New episodes delivered on schedule. Build your programming around our reliability.
            </p>
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
          License Our <span className="text-[#d4a843]">Shows</span>
        </h2>
        <p className="font-body text-lg text-white/70 mb-10 max-w-2xl mx-auto">
          Radio stations worldwide trust our programming. Join them and bring 
          premium content to your listeners.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-xl hover:shadow-[#d4a843]/25"
          >
            View Plans
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border border-white/20 text-white font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function Originals() {
  return (
    <Layout>
      <HeroSection />
      <ShowsGrid />
      <FeaturesSection />
      <CTASection />
    </Layout>
  );
}
