import { useState, useEffect } from 'react';

const PREVIEW_PASSWORD = 'preview2026';
const AUTH_COOKIE = 'preview_auth';

export default function PreviewAuth({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if already authenticated via cookie
    const authCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${AUTH_COOKIE}=`));
    
    if (authCookie) {
      const token = authCookie.split('=')[1];
      if (token === btoa(PREVIEW_PASSWORD)) {
        setIsAuthenticated(true);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password === PREVIEW_PASSWORD) {
      // Set cookie for 24 hours
      const expires = new Date();
      expires.setHours(expires.getHours() + 24);
      document.cookie = `${AUTH_COOKIE}=${btoa(PREVIEW_PASSWORD)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
      
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#d4a843]"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0d1117] to-[#0a0a0a] flex items-center justify-center px-6">
        <div className="absolute top-1/3 -left-48 w-96 h-96 bg-[#d4a843]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-[#0047ab]/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-md w-full">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#d4a843]/10 border border-[#d4a843]/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-[#d4a843]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-2xl font-heading text-white mb-2">Preview Access</h1>
              <p className="text-white/60 font-body text-sm">Enter password to view the site</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter preview password"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-[#d4a843]/50 transition-colors font-body"
                  autoFocus
                />
                {error && (
                  <p className="mt-2 text-red-500 text-sm font-body">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#d4a843] text-[#0a0a0a] font-semibold text-sm uppercase tracking-wider rounded-lg hover:bg-[#e8c574] transition-colors"
              >
                Access Preview
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/40 text-xs text-center font-body">
                This is a preview site. For access, contact the site administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
