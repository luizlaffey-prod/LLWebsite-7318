import { Layout } from "../components/shared";
import { Link } from "wouter";
import { useState } from "react";
import { 
  Radio, Download, Play, Pause, Clock, Calendar, 
  TrendingUp, User, Settings, LogOut, ChevronRight,
  Music, Zap
} from "lucide-react";

const programs = [
  {
    id: "luiz-laffeys-collection",
    name: "Luiz Laffey's Collection",
    icon: Music,
    color: "#d4a843",
    latestEpisode: "Episode 46: Summer Nights",
    releaseDate: "Jan 15, 2025",
  },
  {
    id: "zero-point-zero",
    name: "Zero Point Zero",
    icon: Zap,
    color: "#e67e22",
    latestEpisode: "Episode 79: Stellar Path",
    releaseDate: "Jan 14, 2025",
  },
];

const recentEpisodes = [
  { id: 1, program: "Luiz Laffey's Collection", title: "Episode 46: Summer Nights", duration: "60:00", date: "Jan 15, 2025" },
  { id: 2, program: "Zero Point Zero", title: "Episode 79: Stellar Path", duration: "60:00", date: "Jan 14, 2025" },
  { id: 3, program: "Luiz Laffey's Collection", title: "Episode 45: Midnight Disco", duration: "60:00", date: "Jan 8, 2025" },
  { id: 4, program: "Zero Point Zero", title: "Episode 78: Event Horizon", duration: "60:00", date: "Jan 7, 2025" },
];

const stats = [
  { label: "Episodes Downloaded", value: "24", icon: Download },
  { label: "Hours Listened", value: "36", icon: Clock },
  { label: "Days Active", value: "45", icon: Calendar },
];

function Dashboard() {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <Layout>
      <section className="relative py-12 min-h-[calc(100vh-80px)]">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0a0a0a]" />

        <div className="relative max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-4">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl text-white mb-2">
                Welcome back, <span className="text-[#d4a843]">Member</span>
              </h1>
              <p className="font-body text-white/60">
                Access your programs and downloads below.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-3 bg-white/5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <Settings size={20} />
              </button>
              <button className="p-3 bg-white/5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                <User size={20} />
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Programs */}
              <div>
                <h2 className="font-heading text-2xl text-white mb-6">Your Programs</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {programs.map((program) => (
                    <Link
                      key={program.id}
                      href={`/originals/${program.id}`}
                      className="group bg-[#111111] border border-white/5 rounded-xl p-6 hover:border-[#d4a843]/30 transition-all duration-300"
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${program.color}20` }}
                        >
                          <program.icon style={{ color: program.color }} size={28} />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading text-lg text-white group-hover:text-[#d4a843] transition-colors truncate">
                            {program.name}
                          </h3>
                          <p className="font-body text-white/50 text-sm truncate">
                            {program.latestEpisode}
                          </p>
                          <p className="font-body text-white/30 text-xs mt-1">
                            Released {program.releaseDate}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Recent Episodes */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-2xl text-white">Recent Episodes</h2>
                  <button className="font-body text-[#d4a843] text-sm hover:text-[#e8c574] flex items-center gap-1">
                    View All <ChevronRight size={16} />
                  </button>
                </div>
                <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
                  {recentEpisodes.map((episode, index) => (
                    <div
                      key={episode.id}
                      className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                        index !== recentEpisodes.length - 1 ? "border-b border-white/5" : ""
                      }`}
                    >
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-10 h-10 rounded-full bg-[#d4a843] flex items-center justify-center shrink-0 hover:bg-[#e8c574] transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="text-[#0a0a0a]" size={16} />
                        ) : (
                          <Play className="text-[#0a0a0a] ml-0.5" size={16} />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-body text-white font-medium truncate">
                          {episode.title}
                        </h4>
                        <p className="font-body text-white/50 text-sm">{episode.program}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-4 text-white/40 text-sm">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {episode.duration}
                        </span>
                        <span>{episode.date}</span>
                      </div>
                      <button className="p-2 text-white/40 hover:text-[#d4a843] transition-colors">
                        <Download size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Stats */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <h3 className="font-heading text-xl text-white mb-6">Your Stats</h3>
                <div className="space-y-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
                        <stat.icon className="text-[#d4a843]" size={18} />
                      </div>
                      <div>
                        <div className="font-heading text-2xl text-white">{stat.value}</div>
                        <div className="font-body text-white/50 text-sm">{stat.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subscription Info */}
              <div className="bg-gradient-to-br from-[#d4a843]/20 via-[#111111] to-[#111111] border border-[#d4a843]/20 rounded-xl p-6">
                <h3 className="font-heading text-xl text-white mb-2">Annual Broadcaster</h3>
                <p className="font-body text-white/60 text-sm mb-4">
                  Your subscription renews on March 15, 2025
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-[#d4a843] rounded-full" />
                  </div>
                  <span className="font-body text-white/50 text-xs">9 months left</span>
                </div>
                <Link
                  href="/plans"
                  className="block mt-4 text-center py-2 border border-[#d4a843] text-[#d4a843] font-medium text-sm rounded-lg hover:bg-[#d4a843]/10 transition-colors"
                >
                  Manage Subscription
                </Link>
              </div>

              {/* Promotional Materials */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <h3 className="font-heading text-xl text-white mb-4">Promo Materials</h3>
                <p className="font-body text-white/60 text-sm mb-4">
                  Download station-branded promotional content.
                </p>
                <div className="space-y-2">
                  <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="font-body text-white text-sm">Station IDs</span>
                    <Download className="text-white/50" size={16} />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="font-body text-white text-sm">Promo Spots</span>
                    <Download className="text-white/50" size={16} />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <span className="font-body text-white text-sm">Social Graphics</span>
                    <Download className="text-white/50" size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default Dashboard;
