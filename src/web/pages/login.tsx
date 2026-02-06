import { Layout } from "../components/shared";
import { Link } from "wouter";
import { useState } from "react";
import { Mail, Lock, User, ArrowRight, Check, Radio, Download, Sparkles } from "lucide-react";
import { FaGoogle, FaApple } from "react-icons/fa";

const benefits = [
  { icon: Radio, text: "Access to licensed broadcast files" },
  { icon: Download, text: "High-quality weekly episodes" },
  { icon: Sparkles, text: "Station-branded promotional assets" },
];

function LoginPage() {
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual" | "dual">("annual");

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = "/broadcasts";
  };

  return (
    <Layout>
      <section className="relative py-24 min-h-[calc(100vh-80px)]">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Benefits Sidebar */}
            <div className="hidden lg:block">
              <span className="text-[#d4a843] text-sm uppercase tracking-[0.3em] font-medium mb-4 block">
                Broadcaster Access
              </span>
              <h1 className="font-heading text-4xl md:text-5xl text-white mb-6 leading-[1.1]">
                Access Your{" "}
                <span className="text-[#d4a843]">Licensed</span>{" "}
                Programs
              </h1>
              <p className="font-body text-lg text-white/70 mb-8">
                Enter your credentials to access your broadcast library, download episodes, and retrieve promotional materials for your station.
              </p>

              <div className="space-y-4 mb-8">
                {benefits.map((benefit) => (
                  <div key={benefit.text} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#d4a843]/10 flex items-center justify-center">
                      <benefit.icon className="text-[#d4a843]" size={20} />
                    </div>
                    <span className="font-body text-white/80">{benefit.text}</span>
                  </div>
                ))}
              </div>

              {/* Testimonial */}
              <div className="bg-[#111111] border border-white/5 rounded-xl p-6">
                <p className="font-body text-white/70 italic mb-4">
                  "The quality of content is exceptional. Our listeners love the shows."
                </p>
                <p className="font-body text-white/50 text-sm">— Radio Station Manager</p>
              </div>
            </div>

            {/* Right - Auth Form */}
            <div className="bg-[#111111] border border-white/5 rounded-2xl p-8">
              {/* Tab Switcher */}
              <div className="flex bg-white/5 rounded-lg p-1 mb-8">
                <button
                  onClick={() => setActiveTab("signin")}
                  className={`flex-1 py-3 px-4 rounded-md font-body text-sm font-medium transition-all ${
                    activeTab === "signin"
                      ? "bg-[#d4a843] text-[#0a0a0a]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setActiveTab("signup")}
                  className={`flex-1 py-3 px-4 rounded-md font-body text-sm font-medium transition-all ${
                    activeTab === "signup"
                      ? "bg-[#d4a843] text-[#0a0a0a]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {activeTab === "signin" ? (
                /* Sign In Form */
                <form className="space-y-5" onSubmit={handleSignIn}>
                  <div>
                    <label className="block font-body text-white/80 text-sm mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="email"
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-body text-white/80 text-sm mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="password"
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#d4a843] focus:ring-[#d4a843]" />
                      <span className="font-body text-white/60 text-sm">Remember me</span>
                    </label>
                    <button type="button" className="font-body text-[#d4a843] text-sm hover:text-[#e8c574]">
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded-lg transition-all duration-300 hover:bg-[#e8c574]"
                  >
                    Sign In
                  </button>
                </form>
              ) : (
                /* Sign Up Form */
                <form className="space-y-5">
                  {/* Plan Selection */}
                  <div className="space-y-3 mb-6">
                    <label className="block font-body text-white/80 text-sm">
                      Select License Tier
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("monthly")}
                        className={`p-4 rounded-lg border text-left transition-all ${
                          selectedPlan === "monthly"
                            ? "border-[#d4a843] bg-[#d4a843]/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="font-body text-white font-medium">Monthly Broadcast</div>
                        <div className="font-body text-[#d4a843]">$29/mo</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("annual")}
                        className={`p-4 rounded-lg border text-left transition-all relative ${
                          selectedPlan === "annual"
                            ? "border-[#d4a843] bg-[#d4a843]/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <span className="absolute -top-2 right-2 px-2 py-0.5 bg-[#d4a843] text-[#0a0a0a] text-xs font-bold rounded">
                          BEST VALUE
                        </span>
                        <div className="font-body text-white font-medium">Annual Broadcast</div>
                        <div className="font-body text-[#d4a843]">$299/yr</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan("dual")}
                        className={`p-4 rounded-lg border text-left transition-all relative ${
                          selectedPlan === "dual"
                            ? "border-[#0047ab] bg-[#0047ab]/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <span className="absolute -top-2 right-2 px-2 py-0.5 bg-[#0047ab] text-white text-xs font-bold rounded">
                          30% PREFERENTIAL
                        </span>
                        <div className="font-body text-white font-medium">Dual-Program Annual</div>
                        <div className="font-body text-[#0047ab]">$418/yr</div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-body text-white/80 text-sm mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-body text-white/80 text-sm mb-2">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="email"
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                        placeholder="your@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-body text-white/80 text-sm mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="password"
                        className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg font-body text-white placeholder:text-white/40 focus:border-[#d4a843] focus:outline-none transition-colors"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded-lg transition-all duration-300 hover:bg-[#e8c574]"
                  >
                    Create Account
                  </button>
                </form>
              )}

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#111111] px-4 font-body text-white/40 text-sm">
                    or continue with
                  </span>
                </div>
              </div>

              {/* Social Auth */}
              <div className="grid grid-cols-2 gap-3">
                <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                  <FaGoogle className="text-white" size={18} />
                  <span className="font-body text-white text-sm">Google</span>
                </button>
                <button className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors">
                  <FaApple className="text-white" size={20} />
                  <span className="font-body text-white text-sm">Apple</span>
                </button>
              </div>

              {/* Terms */}
              <p className="font-body text-white/40 text-xs text-center mt-6">
                By continuing, you agree to our{" "}
                <Link href="/terms" className="text-[#d4a843] hover:underline">Terms of Service</Link>
                {" "}and{" "}
                <Link href="/privacy" className="text-[#d4a843] hover:underline">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

export default LoginPage;
