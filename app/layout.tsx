import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AURA',
  description: 'Automated Urban Radio Audio',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
