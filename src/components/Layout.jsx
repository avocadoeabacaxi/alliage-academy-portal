import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { LayoutDashboard, FileText, PlusCircle, Users, LogOut, Menu, X, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout() {
  const { t, tf } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'] },
    { path: '/requests', label: t('nav.requests'), icon: FileText, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'] },
    { path: '/requests/new', label: t('nav.newRequest'), icon: PlusCircle, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'] },
    { path: '/users', label: t('nav.users'), icon: Users, roles: ['admin'] },
  ];

  const userRole = user?.role || 'solicitante';
  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[#1E3A5F] text-white flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Alliage</h1>
            <p className="text-xs text-blue-200/70">{tf ? '' : ''}{t('app.tagline')}</p>
          </div>
          <button className="lg:hidden text-blue-200" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? 'bg-white/15 text-white shadow-sm' : 'text-blue-100/80 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User panel */}
        <div className="px-3 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold">
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || '—'}</p>
              <p className="text-xs text-blue-200/70">{t(`role.${userRole}`)}</p>
            </div>
            <button onClick={handleLogout} className="text-blue-200/70 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10" title={t('nav.logout')}>
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white border-b border-slate-200">
          <button className="lg:hidden text-slate-600" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <LanguageSelector />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}