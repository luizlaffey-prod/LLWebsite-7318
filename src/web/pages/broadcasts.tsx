import { Layout } from "../components/shared";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import { 
  Radio, Download, Play, Pause, Clock, Calendar, 
  User, Settings, ChevronRight,
  Music, Zap, Shield, FileText, Star, Lock
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSubscription } from "../hooks/useSubscription";

const licensedPrograms = [
  {
    id: "luiz-laffeys-collection",
    name: "Luiz Laffey's Collection",
    icon: Music,
    color: "#d4a843",
    licenseType: "Annual",
    renewalDate: "Jan 15, 2026",
    status: "Active",
    latestEpisode: "Episode 46: Summer Nights",
    releaseDate: "Jan 15, 2025",
  },
  {
    id: "zero-point-zero",
    name: "Zero Point Zero",
    icon: Zap,
    color: "#e67e22",
    licenseType: "Monthly",
    renewalDate: "Feb 14, 2025",
    status: "Active",
    latestEpisode: "Episode 79: Stellar Path",
    releaseDate: "Jan 14, 2025",
  },
];

const archiveEpisodes = [
  { id: 1, program: "Luiz Laffey's Collection", title: "Episode 45: Midnight Disco", duration: "60:00", date: "Jan 8, 2025", size: "138MB" },
  { id: 2, program: "Zero Point Zero", title: "Episode 78: Event Horizon", duration: "60:00", date: "Jan 7, 2025", size: "142MB" },
  { id: 3, program: "Luiz Laffey's Collection", title: "Episode 44: Soulful Vibe", duration: "60:00", date: "Jan 1, 2025", size: "135MB" },
  { id: 4, program: "Zero Point Zero", title: "Episode 77: Nebula Drift", duration: "60:00", date: "Dec 31, 2024", size: "140MB" },
];

export default function Broadcasts() {
  const { t } = useTranslation();
  const { originals, loading } = useSubscription();
  const [isPlaying, setIsPlaying] = useState<number | null>(null);
  const [expandedArchive, setExpandedArchive] = useState(false);

  // Filter programs based on user's subscriptions
  const userPrograms = useMemo(() => {
    if (loading) return [];
    if (originals.length === 0) return [];
    
    return licensedPrograms.filter(program => 
      originals.some(o => 
        (o.slug === 'zero-point-zero' && program.id === 'zero-point-zero') ||
        (o.slug === 'luiz-laffey-collection' && program.id === 'luiz-laffeys-collection')
      )
    );
  }, [originals, loading]);

  return (
    <Layout>
      <section className="relative py-12 min-h-[calc(100vh-80px)]">
        {/* Background */}
        <div className="absolute inset-0 bg-[#0a0a0a]" />
        
        <div className="relative max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="font-heading text-3xl md:text-4xl text-white mb-2">
                Your <span className="text-[#d4a843]">Licensed Programs</span>
              </h1>
              <p className="font-body text-white/60">
                Professional radio content management and distribution.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm">
                <Settings size={18} />
                Station Settings
              </button>
              <div className="w-10 h-10 rounded-full bg-[#d4a843]/10 border border-[#d4a843]/30 flex items-center justify-center text-[#d4a843]">
                <User size={20} />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-10">
              {/* Program Cards */}
              <div className="grid md:grid-cols-2 gap-6">
                {loading ? (
                  <div className="text-white/60">Loading your subscriptions...</div>
                ) : userPrograms.length === 0 ? (
                  <div className="text-white/60 text-center py-8">
                    <p className="mb-4">You don't have any active subscriptions yet.</p>
                    <Link href="/plans" className="text-[#d4a843] hover:text-[#e8c574]">
                      Browse Plans
                    </Link>
                  </div>
                ) : (
                  userPrograms.map((program) => (
                  <div 
                    key={program.id}
                    className="bg-[#111111] border border-white/5 rounded-2xl p-6 hover:border-[#d4a843]/20 transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${program.color}15` }}
                      >
                        <program.icon style={{ color: program.color }} size={24} />
                      </div>
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        program.status === "Active" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      }`}>
                        {program.status}
                      </span>
                    </div>
                    
                    <h3 className="font-heading text-xl text-white mb-1">{program.name}</h3>
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-6 font-body">
                      <span>{program.licenseType} License</span>
                      <span>•</span>
                      <span>Renews {program.renewalDate}</span>
                    </div>

                    <div className="bg-white/5 rounded-xl p-4 mb-6">
                      <div className="text-[10px] uppercase tracking-widest text-[#d4a843] font-bold mb-2">Latest Episode</div>
                      <div className="font-body text-white text-sm mb-1">{program.latestEpisode}</div>
                      <div className="font-body text-white/40 text-[11px]">Released {program.releaseDate}</div>
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#d4a843] text-[#0a0a0a] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#e8c574] transition-colors">
                      <Download size={16} />
                      Download Broadcast File
                    </button>
                  </div>
                ))
                )}
              </div>

              {/* Episode Archive */}
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-heading text-2xl text-white">Episode Archive</h2>
                  <button 
                    onClick={() => setExpandedArchive(!expandedArchive)}
                    className="font-body text-[#d4a843] text-sm hover:text-[#e8c574] flex items-center gap-1"
                  >
                    {expandedArchive ? "Show Less" : "View All Archive"} <ChevronRight size={16} className={expandedArchive ? "rotate-90" : ""} />
                  </button>
                </div>
                <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden">
                  {archiveEpisodes.slice(0, expandedArchive ? undefined : 2).map((episode, index) => (
                    <div
                      key={episode.id}
                      className={`flex items-center gap-4 p-5 hover:bg-white/5 transition-colors ${
                        index !== (expandedArchive ? archiveEpisodes.length - 1 : 1) ? "border-b border-white/5" : ""
                      }`}
                    >
                      <button
                        onClick={() => setIsPlaying(isPlaying === episode.id ? null : episode.id)}
                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0 hover:bg-[#d4a843]/20 hover:border-[#d4a843]/30 text-white transition-all"
                      >
                        {isPlaying === episode.id ? (
                          <Pause size={16} />
                        ) : (
                          <Play size={16} className="ml-0.5" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-body text-white font-medium truncate text-sm">
                          {episode.title}
                        </h4>
                        <p className="font-body text-white/40 text-xs">{episode.program}</p>
                      </div>
                      <div className="hidden sm:flex items-center gap-6 text-white/30 text-xs font-body">
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} />
                          {episode.duration}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {episode.date}
                        </span>
                        <span className="text-white/20">{episode.size}</span>
                      </div>
                      <button className="p-2 text-white/40 hover:text-[#d4a843] transition-colors">
                        <Download size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* License Terms Summary */}
              <div className="bg-[#111111] border border-white/5 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="text-[#d4a843]" size={24} />
                  <h2 className="font-heading text-2xl text-white">Broadcast License Summary</h2>
                </div>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="font-heading text-white mb-3 flex items-center gap-2">
                      <FileText size={16} className="text-[#d4a843]" />
                      Permitted Usage
                    </h4>
                    <ul className="space-y-2 text-sm text-white/60 font-body">
                      <li>• Broadcast on station's primary frequencies</li>
                      <li>• Streaming on official station digital platforms</li>
                      <li>• Single-market broadcast rights</li>
                      <li>• Program-specific license coverage</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-heading text-white mb-3 flex items-center gap-2">
                      <Lock size={16} className="text-[#d4a843]" />
                      Restrictions
                    </h4>
                    <ul className="space-y-2 text-sm text-white/60 font-body">
                      <li>• No sublicensing or redistribution</li>
                      <li>• All IP remains with Luiz Laffey Productions</li>
                      <li>• No commercial resale of audio files</li>
                      <li>• License valid during active subscription only</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Promotional Assets */}
              <div className="bg-[#111111] border border-white/5 rounded-2xl p-6">
                <h3 className="font-heading text-xl text-white mb-6">Promotional Assets</h3>
                
                <div className="space-y-6">
                  {/* Generic Assets */}
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold mb-4">Generic Assets</div>
                    <div className="space-y-2">
                      <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <FileText className="text-white/40" size={16} />
                          <span className="font-body text-white text-xs">Standard Press Kit</span>
                        </div>
                        <Download className="text-white/20" size={14} />
                      </button>
                      <button className="w-full flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <Star className="text-white/40" size={16} />
                          <span className="font-body text-white text-xs">Show Logos (Vector)</span>
                        </div>
                        <Download className="text-white/20" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Station-Branded Assets (Annual Only) */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">Station Branded</div>
                      <span className="px-2 py-0.5 bg-[#d4a843] text-[#0a0a0a] text-[9px] font-bold rounded">PREMIUM</span>
                    </div>
                    
                    {/* Active for Luiz Laffey's Collection (Annual) */}
                    <div className="space-y-2 mb-4">
                      <div className="text-[9px] text-[#d4a843] font-bold uppercase mb-2">Luiz Laffey's Collection</div>
                      <button className="w-full flex items-center justify-between p-3 bg-[#d4a843]/5 border border-[#d4a843]/10 rounded-xl hover:bg-[#d4a843]/10 transition-colors">
                        <div className="flex items-center gap-3">
                          <Radio className="text-[#d4a843]" size={16} />
                          <span className="font-body text-white text-xs">Custom Station IDs</span>
                        </div>
                        <Download className="text-[#d4a843]/50" size={14} />
                      </button>
                    </div>

                    {/* Locked for Zero Point Zero (Monthly) */}
                    <div className="space-y-2">
                      <div className="text-[9px] text-white/20 font-bold uppercase mb-2">Zero Point Zero</div>
                      <div className="relative group cursor-not-allowed">
                        <div className="w-full flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                          <div className="flex items-center gap-3 opacity-20">
                            <Radio size={16} />
                            <span className="font-body text-xs">Custom Station IDs</span>
                          </div>
                          <Lock className="text-white/10" size={14} />
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#0a0a0a]/80 rounded-xl">
                          <span className="text-[10px] text-[#d4a843] font-bold">ANNUAL LICENSE REQUIRED</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Manage Licenses */}
              <div className="bg-gradient-to-br from-[#d4a843]/10 to-[#111111] border border-[#d4a843]/20 rounded-2xl p-6">
                <h3 className="font-heading text-xl text-white mb-4">Manage Licenses</h3>
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="text-white/60">Subscription Level</span>
                    <span className="text-white font-bold">Broadcaster Plus</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="text-white/60">Monthly Spend</span>
                    <span className="text-white font-bold">$29.00 USD</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-body">
                    <span className="text-white/60">Annual Spend</span>
                    <span className="text-white font-bold">$299.00 USD</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Link
                    href="/plans"
                    className="block w-full text-center py-3 bg-[#d4a843] text-[#0a0a0a] font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#e8c574] transition-colors"
                  >
                    Upgrade Licenses
                  </Link>
                  <button className="block w-full text-center py-3 border border-white/10 text-white/60 font-bold text-xs uppercase tracking-widest rounded-lg hover:text-white hover:border-white/20 transition-all">
                    Billing Portal
                  </button>
                  <button className="block w-full text-center py-2 text-red-500/50 hover:text-red-500 text-[10px] uppercase font-bold tracking-widest transition-colors">
                    Cancel Subscription
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
