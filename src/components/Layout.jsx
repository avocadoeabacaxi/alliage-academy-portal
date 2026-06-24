import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { LayoutDashboard, FileText, PlusCircle, Users, LogOut, Menu, X, Search, PanelLeftClose, PanelLeftOpen, Activity, History, ClipboardList, Edit, User as UserIcon, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Layout() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    base44.entities.TrainingRequest.filter({ status: 'Pendente Análise' })
      .then(data => setPendingCount(data.length))
      .catch(() => {});
  }, []);

  const userRole = user?.role || 'solicitante';

  const navGroups = [
    {
      label: t('nav.section.general'),
      items: [
        { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'] },
        { path: '/requests', label: t('nav.requests'), icon: FileText, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'], badge: pendingCount },
        { path: '/my-requests', label: t('nav.myRequests'), icon: ClipboardList, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'] },
      ]
    },
    {
      label: t('nav.section.actions'),
      items: [
        { path: '/requests/new', label: t('nav.newRequest'), icon: PlusCircle, roles: ['admin', 'educador', 'gerente_regional'] },
        { path: '/solicitacao', label: t('nav.newRequest'), icon: PlusCircle, roles: ['solicitante'] },
        { path: '/requests/past', label: t('nav.pastEvent'), icon: History, roles: ['admin', 'solicitante', 'educador', 'gerente_regional'] },
      ]
    },
    {
      label: t('nav.section.admin'),
      items: [
        { path: '/users', label: t('nav.users'), icon: Users, roles: ['admin'] },
      ]
    },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/requests') return location.pathname === '/requests' || location.pathname.startsWith('/requests/');
    if (path === '/requests/past') return location.pathname === '/requests/past';
    if (path === '/requests/new') return location.pathname === '/requests/new';
    if (path === '/solicitacao') return location.pathname === '/solicitacao';
    return location.pathname === path;
  };

  const handleLogout = async () => {
    await base44.auth.logout('/');
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate('/requests');
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm animate-fade-in" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-b from-[#003B5C] via-[#003553] to-[#002840] text-white transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-20' : 'w-72'}`}>
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00A6D6] to-[#0088B0] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#00A6D6]/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold tracking-tight leading-tight">Alliage</h1>
              <p className="text-[11px] text-cyan-200/50 truncate">{t('app.tagline')}</p>
            </div>
          )}
          <button className="hidden lg:block text-cyan-200/50 hover:text-white transition-colors p-1" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
          <button className="lg:hidden text-cyan-200" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-200/40" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleSearch}
                placeholder={t('nav.searchPlaceholder')}
                className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-cyan-200/40 focus:outline-none focus:border-[#00A6D6] focus:bg-white/10 transition-all"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => item.roles.includes(userRole));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                {!collapsed && <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-200/35">{group.label}</p>}
                <div className="space-y-0.5">
                  {visibleItems.map(item => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => { setSidebarOpen(false); setUserMenuOpen(false); }}
                        className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${active ? 'bg-[#00A6D6]/15 text-white' : 'text-cyan-100/70 hover:bg-white/5 hover:text-white'} ${collapsed ? 'justify-center' : ''}`}
                      >
                        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 rounded-r-full bg-[#00A6D6]" />}
                        <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${active ? 'text-[#00A6D6]' : 'text-cyan-200/50 group-hover:text-cyan-100'}`} />
                        {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                        {!collapsed && item.badge > 0 && (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-[#00A6D6]/20 text-[#5DDEFF]">{item.badge}</span>
                        )}
                        {collapsed && item.badge > 0 && (
                          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00A6D6] ring-2 ring-[#003B5C]" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>


      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-gradient-to-r from-[#003B5C] via-[#003553] to-[#002840] border-b border-white/10">
          <button className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <LanguageSelector />
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A6D6] to-[#0088B0] flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/15">
                    {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-[#003553]" />
                </div>
                <ChevronDown className="w-4 h-4 text-white/70" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50 animate-fade-in">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-sm font-semibold text-slate-900">{user?.full_name || '—'}</p>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                  <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <UserIcon className="w-4 h-4" />
                    {t('common.edit')} Perfil
                  </button>
                  <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
                    <LogOut className="w-4 h-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        {userMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}