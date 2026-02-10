import { Layout } from "../components/shared";
import { Link } from "wouter";
import { CheckCircle, ArrowRight, Download, Radio, Calendar } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useSubscription } from "../hooks/useSubscription";

export default function SubscriptionSuccess() {
  const { user } = useAuth();
  const { originals } = useSubscription();

  // Get subscription info from URL params if available
  const params = new URLSearchParams(window.location.search);
  const planType = params.get('plan');
  const program = params.get('program');

  const planNames: Record<string, string> = {
    'MONTHLY_BROADCAST': 'Monthly Plan',
    'ANNUAL_BROADCAST': 'Annual Plan',
    'STRATEGIC_ANNUAL': 'Dual Program Plan',
  };

  const programNames: Record<string, string> = {
    'ZERO_POINT_ZERO': 'Zero Point Zero',
    'LUIZ_LAFFEY_COLLECTION': "Luiz Laffey's Collection",
  };

  return (
    <Layout>
      <section className="relative py-24 min-h-[calc(100vh-80px)] flex items-center">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a]" />
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />

        <div className="relative max-w-2xl mx-auto px-6 w-full">
          {/* Success Card */}
          <div className="bg-[#111111] border border-green-500/30 rounded-2xl p-12 text-center">
            {/* Checkmark Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative animate-bounce">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl" />
                <div className="relative w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500 flex items-center justify-center">
                  <CheckCircle className="text-green-500" size={40} />
                </div>
              </div>
            </div>

            {/* Content */}
            <h1 className="font-heading text-4xl md:text-5xl text-white mb-4">
              Welcome to Your Subscription!
            </h1>
            
            <p className="font-body text-lg text-white/70 mb-8">
              Thank you for subscribing, <span className="text-[#d4a843] font-semibold">{user?.name || "valued member"}</span>. 
              Your subscription is now active and ready to use.
            </p>

            {/* Subscription Details */}
            {(planType || program) && (
              <div className="bg-white/5 rounded-xl p-6 mb-10 border border-white/10">
                <h2 className="font-heading text-white mb-4">Your Subscription Details</h2>
                <div className="space-y-3 text-left">
                  {program && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Radio className="text-[#d4a843] shrink-0" size={18} />
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider">Program</p>
                        <p className="text-white font-semibold">{programNames[program] || program}</p>
                      </div>
                    </div>
                  )}
                  {planType && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                      <Calendar className="text-[#d4a843] shrink-0" size={18} />
                      <div>
                        <p className="text-white/60 text-xs uppercase tracking-wider">Plan Type</p>
                        <p className="text-white font-semibold">{planNames[planType] || planType}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* What's Next */}
            <div className="bg-white/5 rounded-xl p-6 mb-10 border border-white/10">
              <h3 className="font-heading text-white mb-4">What's Next?</h3>
              <ul className="space-y-3 text-left font-body text-white/70">
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a843] font-bold mt-0.5">1.</span>
                  <span>Access your subscribed programs immediately from Your Licensed Programs</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a843] font-bold mt-0.5">2.</span>
                  <span>Download broadcast files and promotional assets</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a843] font-bold mt-0.5">3.</span>
                  <span>Check your email for subscription confirmation and setup instructions</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-[#d4a843] font-bold mt-0.5">4.</span>
                  <span>Configure your Station Settings for personalized setup</span>
                </li>
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/broadcasts"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-lg hover:shadow-[#d4a843]/25"
              >
                <Download size={18} />
                Go to Your Programs
                <ArrowRight size={18} />
              </Link>
              <Link
                href="/originals"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-white/20 text-white font-semibold text-sm uppercase tracking-wider rounded transition-all duration-300 hover:border-[#d4a843] hover:text-[#d4a843]"
              >
                Browse More Programs
              </Link>
            </div>

            {/* Support Note */}
            <p className="font-body text-white/50 text-sm mt-8 pt-8 border-t border-white/10">
              Questions? Contact our support team at support@luizlaffeyproductions.com or visit <Link href="/contact" className="text-[#d4a843] hover:text-[#e8c574]">Contact Us</Link>
            </p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
