'use client';

import dynamic from 'next/dynamic';
import { Features } from '@/app/components/landing/Features';
import { Footer } from '@/app/components/landing/Footer';

const Hero = dynamic(
  () => import('@/app/components/landing/Hero').then((mod) => ({ default: mod.Hero })),
  { ssr: false, loading: () => (
    <section className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </section>
  )}
);

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-50" />
      
      {/* Content */}
      <div className="relative z-10">
        <Hero />
        <Features />
        <Footer />
      </div>
    </div>
  );
}
