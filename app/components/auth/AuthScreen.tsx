'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { WalletConnectButton } from '@/app/components/web3/ConnectButton';
import { Sparkles, Mail, Chrome, ArrowRight, UserPlus } from 'lucide-react';

export function AuthScreen() {
  const [mode, setMode] = useState<'landing' | 'login' | 'signup'>('landing');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      if (res.ok) {
        const { token, user } = await res.json();
        localStorage.setItem('xeron_token', token);
        localStorage.setItem('xeron_user', JSON.stringify(user));
        window.location.href = '/dashboard';
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (isSignup: boolean) => {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, isSignup }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.magicLinkSent) {
          alert('Magic link sent to your email!');
        } else if (data.token) {
          localStorage.setItem('xeron_token', data.token);
          localStorage.setItem('xeron_user', JSON.stringify(data.user));
          window.location.href = '/dashboard';
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'landing') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center px-4"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="mb-8"
          >
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 via-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/25">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold gradient-text mb-4">XERON</h1>
            <p className="text-xl text-white/60 max-w-xl mx-auto">
              Your autonomous AI agent with persistent memory, self-learning, and 1000+ model connectors.
            </p>
          </motion.div>

          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            <Button
              size="lg"
              onClick={() => window.location.href = '/dashboard'}
              className="h-14 text-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-sm">or continue with</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={handleGuestLogin}
                disabled={loading}
                className="h-14"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Guest
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setMode('login')}
                className="h-14"
              >
                <Mail className="w-5 h-5 mr-2" />
                Email
              </Button>
            </div>

            <div className="flex items-center justify-center gap-2 pt-4">
              <WalletConnectButton />
            </div>
          </div>

          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { label: 'Persistent Memory', value: 'Unlimited' },
              { label: 'AI Models', value: '1000+' },
              { label: 'Skills', value: '20+' },
              { label: 'Start Free', value: '$0' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-xl glass"
              >
                <div className="text-2xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-white/40">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 grid-pattern opacity-30" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <button
          onClick={() => setMode('landing')}
          className="mb-8 text-white/40 hover:text-white text-sm"
        >
          ← Back
        </button>

        <div className="p-8 rounded-2xl glass">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {mode === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-white/40 text-sm mt-2">
              {mode === 'login' ? 'Sign in to continue' : 'Start your AI journey'}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>

            <Button
              className="w-full h-12"
              onClick={() => handleEmailAuth(mode === 'signup')}
              disabled={loading || !email}
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </Button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-white/30 text-xs">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <Button
              variant="outline"
              className="w-full h-12"
              onClick={handleGuestLogin}
              disabled={loading}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Continue as Guest
            </Button>

            <div className="flex items-center justify-center gap-2 pt-4">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}