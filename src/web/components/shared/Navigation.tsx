import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Globe } from "lucide-react";

interface NavLink {
  label: string;
  href: string;
}

const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "Originals", href: "/originals" },
  { label: "Plans", href: "/plans" },
  { label: "Contact", href: "/contact" },
];

const languages = [
  { code: "en", label: "EN" },
  { code: "pt", label: "PT" },
  { code: "es", label: "ES" },
];

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [language, setLanguage] = useState("en");
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("lang");
    if (saved) setLanguage(saved);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    localStorage.setItem("lang", code);
    setShowLangDropdown(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-[#0a0a0a]/95 backdrop-blur-md shadow-lg" : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="group">
            <span className="font-heading text-2xl md:text-3xl font-semibold tracking-wide">
              <span className="text-[#d4a843]">Luiz Laffey</span>
              <span className="text-white/90"> Productions</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-body text-sm uppercase tracking-widest transition-colors duration-300 ${
                  location === link.href
                    ? "text-[#d4a843]"
                    : "text-white/80 hover:text-[#d4a843]"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLangDropdown(!showLangDropdown)}
                className="flex items-center gap-2 text-white/80 hover:text-[#d4a843] transition-colors"
              >
                <Globe size={16} />
                <span className="text-sm uppercase">{language}</span>
              </button>
              {showLangDropdown && (
                <div className="absolute right-0 top-full mt-2 bg-[#1a1a1a] border border-white/10 rounded-lg overflow-hidden shadow-xl">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageChange(lang.code)}
                      className={`block w-full px-4 py-2 text-left text-sm transition-colors ${
                        language === lang.code
                          ? "bg-[#d4a843] text-[#0a0a0a]"
                          : "text-white/80 hover:bg-white/10"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Login Button */}
            <Link
              href="/login"
              className="px-5 py-2 bg-[#d4a843] text-[#0a0a0a] font-medium text-sm uppercase tracking-wider rounded transition-all duration-300 hover:bg-[#e8c574] hover:shadow-lg hover:shadow-[#d4a843]/20"
            >
              Login
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white/90 hover:text-[#d4a843] transition-colors"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden mt-6 pb-6 border-t border-white/10 pt-6 animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`font-body text-base uppercase tracking-widest transition-colors ${
                    location === link.href
                      ? "text-[#d4a843]"
                      : "text-white/80 hover:text-[#d4a843]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              
              {/* Mobile Language */}
              <div className="flex gap-4 pt-4 border-t border-white/10">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`text-sm uppercase ${
                      language === lang.code ? "text-[#d4a843]" : "text-white/60"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="mt-4 px-5 py-3 bg-[#d4a843] text-[#0a0a0a] font-medium text-center text-sm uppercase tracking-wider rounded"
              >
                Login
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
