import { ReactNode, useEffect } from "react";
import { useLocation } from "wouter";
import { Navigation } from "./Navigation";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <Navigation />
      <main className="flex-1 pt-20">{children}</main>
      <Footer />
    </div>
  );
}
