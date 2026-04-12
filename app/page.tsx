'use client';

import dynamic from 'next/dynamic';
import { Footer } from '@/app/components/landing/Footer';

const Hero = dynamic(
  () => import('@/app/components/landing/Hero').then((mod) => ({ default: mod.Hero })),
  { ssr: false, loading: () => (
    <section className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-white/30 text-sm">Loading XERON...</span>
      </div>
    </section>
  )}
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      <Hero />
      <Footer />
    </div>
  );
}