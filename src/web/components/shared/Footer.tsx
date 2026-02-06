import { Link } from "wouter";
import { Mail } from "lucide-react";
import { FaInstagram, FaLinkedin, FaYoutube, FaSpotify } from "react-icons/fa";

const socialLinks = [
  { icon: FaInstagram, href: "#", label: "Instagram" },
  { icon: FaLinkedin, href: "#", label: "LinkedIn" },
  { icon: FaYoutube, href: "#", label: "YouTube" },
  { icon: FaSpotify, href: "#", label: "Spotify" },
];

const footerLinks = [
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Services", href: "/services" },
      { label: "Portfolio", href: "/portfolio" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Originals",
    links: [
      { label: "All Shows", href: "/originals" },
      { label: "Luiz Laffey's Collection", href: "/originals/luiz-laffeys-collection" },
      { label: "Zero Point Zero", href: "/originals/zero-point-zero" },
      { label: "Plans", href: "/plans" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Dubbing", href: "/services" },
      { label: "Voice-Over", href: "/services" },
      { label: "Translation", href: "/services" },
      { label: "Subtitling", href: "/services" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <span className="font-heading text-2xl font-semibold">
                <span className="text-[#d4a843]">Luiz Laffey</span>
                <span className="text-white/90"> Productions</span>
              </span>
            </Link>
            <p className="text-white/60 font-body text-sm leading-relaxed max-w-sm mb-6">
              A creative production company at the intersection of storytelling, 
              sound, language, and culture. Bringing voices to life across borders.
            </p>
            
            {/* Contact Email */}
            <div className="flex items-center gap-3 text-white/70 mb-6">
              <Mail size={18} className="text-[#d4a843]" />
              <a 
                href="mailto:contact@luizlaffeyproductions.com"
                className="font-body text-sm hover:text-[#d4a843] transition-colors"
              >
                contact@luizlaffeyproductions.com
              </a>
            </div>

            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:bg-[#d4a843] hover:text-[#0a0a0a] transition-all duration-300"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {footerLinks.map((column) => (
            <div key={column.title}>
              <h4 className="font-heading text-lg text-white mb-4">{column.title}</h4>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="font-body text-sm text-white/60 hover:text-[#d4a843] transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-body text-xs text-white/40">
            © {new Date().getFullYear()} Luiz Laffey Productions. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="font-body text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-body text-xs text-white/40 hover:text-white/60 transition-colors"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
