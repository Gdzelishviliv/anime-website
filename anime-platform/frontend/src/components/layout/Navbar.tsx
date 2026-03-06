'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, LogOut, Menu, X, Crown, Compass, Tv, Home } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/browse', label: 'Browse', icon: Compass },
    { href: '/season', label: 'This Season', icon: Tv },
    { href: '/subscription', label: 'Premium', icon: Crown },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchFocused(false);
    }
  };

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-dark-950/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-white/[0.06]'
            : 'bg-gradient-to-b from-dark-950/80 to-transparent',
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 bg-primary-500/20 rounded-xl blur-lg group-hover:bg-primary-500/30 transition-colors" />
                <div className="relative w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <span className="text-white font-black text-sm tracking-tight">A</span>
                </div>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-white to-dark-300 bg-clip-text text-transparent">
                Ani<span className="bg-gradient-to-r from-primary-400 to-primary-500 bg-clip-text text-transparent">Stream</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1 bg-dark-800/40 backdrop-blur-sm rounded-full px-1.5 py-1 border border-white/[0.06]">
              {navLinks.map((link) => {
                const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      'relative flex items-center gap-1.5 text-sm font-medium px-4 py-2 rounded-full transition-colors duration-200',
                      isActive ? 'text-white' : 'text-dark-400 hover:text-dark-200',
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-primary-600/20 border border-primary-500/25 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                      />
                    )}
                    <Icon className={cn('w-3.5 h-3.5 relative z-10', link.href === '/subscription' && isActive && 'text-yellow-400')} />
                    <span className="relative z-10">{link.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Section */}
            <div className="hidden md:flex items-center gap-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <motion.div
                  animate={{ width: searchFocused ? 280 : 180 }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  className="relative"
                >
                  <Search className={cn(
                    'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200',
                    searchFocused ? 'text-primary-400' : 'text-dark-500',
                  )} />
                  <input
                    type="text"
                    placeholder="Search anime..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    className={cn(
                      'w-full bg-dark-800/60 backdrop-blur-sm rounded-full pl-10 pr-4 py-2 text-sm text-dark-100 placeholder-dark-500 transition-all duration-200 outline-none',
                      searchFocused
                        ? 'border border-primary-500/40 ring-2 ring-primary-500/10 bg-dark-800/80'
                        : 'border border-white/[0.06] hover:border-white/[0.1]',
                    )}
                  />
                </motion.div>
              </form>

              {/* Auth */}
              {isAuthenticated ? (
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen(!profileOpen)}
                    className={cn(
                      'flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-all duration-200 border',
                      profileOpen
                        ? 'bg-dark-800 border-white/[0.1]'
                        : 'border-transparent hover:bg-dark-800/60 hover:border-white/[0.06]',
                    )}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                      <span className="text-white text-xs font-bold uppercase">
                        {user?.username?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-dark-200 max-w-[80px] truncate">
                      {user?.username}
                    </span>
                  </button>

                  <AnimatePresence>
                    {profileOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-dark-900/95 backdrop-blur-xl border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
                      >
                        <div className="px-4 py-3 border-b border-white/[0.06]">
                          <p className="text-sm font-medium text-white truncate">{user?.username}</p>
                          <p className="text-xs text-dark-500 truncate">{user?.email}</p>
                        </div>
                        <div className="p-1.5">
                          <Link
                            href="/profile"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                          >
                            <User className="w-4 h-4" />
                            Profile
                          </Link>
                          <Link
                            href="/subscription"
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                          >
                            <Crown className="w-4 h-4" />
                            Subscription
                          </Link>
                          <button
                            onClick={() => { logout(); setProfileOpen(false); }}
                            className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.08] rounded-lg transition-colors"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-sm font-medium text-dark-300 hover:text-white px-4 py-2 rounded-full transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    className="text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 px-5 py-2 rounded-full transition-all duration-200 shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/[0.06] transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <X className="w-5 h-5 text-dark-300" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                    <Menu className="w-5 h-5 text-dark-300" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, x: '100%' }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed top-0 right-0 z-50 h-full w-72 bg-dark-900/98 backdrop-blur-xl border-l border-white/[0.06] md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.06]">
                <span className="text-sm font-semibold text-dark-300 uppercase tracking-wider">Menu</span>
                <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-colors">
                  <X className="w-4 h-4 text-dark-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 px-3">
                <form onSubmit={handleSearch} className="px-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input
                      type="text"
                      placeholder="Search anime..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-dark-800/60 border border-white/[0.06] rounded-xl pl-10 pr-4 py-2.5 text-sm text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500/40 transition-colors"
                    />
                  </div>
                </form>

                <div className="space-y-0.5">
                  {navLinks.map((link) => {
                    const isActive = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-primary-600/15 text-primary-400 border border-primary-500/20'
                            : 'text-dark-300 hover:bg-white/[0.04] hover:text-white border border-transparent',
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/[0.06] p-4">
                {isAuthenticated ? (
                  <div className="space-y-2">
                    <Link
                      href="/profile"
                      className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-dark-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                    >
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                        <span className="text-white text-xs font-bold uppercase">{user?.username?.charAt(0) || 'U'}</span>
                      </div>
                      {user?.username}
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/[0.08] transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link href="/login" className="block w-full text-center py-2.5 rounded-xl text-sm font-medium text-dark-200 border border-white/[0.08] hover:bg-white/[0.04] transition-colors">
                      Sign In
                    </Link>
                    <Link href="/register" className="block w-full text-center py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-primary-500 shadow-lg shadow-primary-500/20 transition-all">
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
