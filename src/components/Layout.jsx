import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import ProfileEditModal from '@/components/ProfileEditModal';
import AuthorizationGate from '@/components/AuthorizationGate';
import { LayoutDashboard, FileText, PlusCircle, Users, LogOut, Menu, X, Search, PanelLeftClose, PanelLeftOpen, Activity, History, ClipboardList, Edit, User as UserIcon, ChevronDown, Settings, BarChart3, ContactRound, UserRoundPlus } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { teamCopy, clientCopy } from '@/lib/directoryLabels';

export default function Layout() {
  const { t, lang } = useLanguage();
  const teamLabels = teamCopy[lang] || teamCopy.pt;
  const clientLabels = clientCopy[lang] || clientCopy.pt;
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await base44.auth.me();
        if (!u) return;
        const res = await base44.functions.invoke('checkUserAuthorization', { email: u.email });
        const appUser = res.data?.status === 'approved' && res.data?.role ? { ...u, role: res.data.role, region: res.data.region || u.region } : u;
        setUser(appUser);
        if (appUser.role !== 'solicitante') {
          const requests = await base44.entities.TrainingRequest.filter({ status: 'Pendente Análise' });
          setPendingCount(requests.length);
        }
      } catch (e) {}
    };
    loadUser();
  }, []);

  const userRole = user?.role || 'solicitante';

  const navGroups = [
    {
      label: t('nav.section.general'),
      items: [
        { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard, roles: ['admin', 'educador', 'gerente_regional'] },
        { path: '/requests', label: t('nav.requests'), icon: FileText, roles: ['admin', 'educador', 'gerente_regional'], badge: pendingCount },
        { path: '/my-requests', label: t('nav.requests'), icon: ClipboardList, roles: ['solicitante'] },
        { path: '/team', label: teamLabels.title, icon: UserRoundPlus, roles: ['admin', 'gerente_regional', 'solicitante'] },
        { path: '/clients', label: clientLabels.title, icon: ContactRound, roles: ['admin', 'gerente_regional', 'solicitante'] },
      ]
    },
    {
      label: t('nav.section.actions'),
      items: [
        { path: '/requests/new', label: t('nav.newRequest'), icon: PlusCircle, roles: ['admin', 'educador', 'gerente_regional'] },
        { path: '/solicitacao', label: t('nav.newRequest'), icon: PlusCircle, roles: ['solicitante'] },
        { path: '/requests/past', label: t('nav.pastEvent'), icon: History, roles: ['admin', 'educador', 'gerente_regional'] },
      ]
    },
    {
      label: 'Análise',
      items: [
        { path: '/surveys', label: 'Pesquisas', icon: BarChart3, roles: ['admin', 'educador', 'gerente_regional'] },
      ]
    },

  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/requests') return location.pathname === '/requests' || location.pathname.startsWith('/requests/');
    if (path === '/requests/past') return location.pathname === '/requests/past';
    if (path === '/requests/new') return location.pathname.startsWith('/requests/new');
    if (path === '/solicitacao') return location.pathname.startsWith('/solicitacao');
    if (path === '/surveys') return location.pathname === '/surveys';
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
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-b from-[#003B5C] via-[#003553] to-[#002840] text-white transition-all duration-300 lg:rounded-br-3xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${collapsed ? 'w-20' : 'w-56'}`}>
        {/* Brand */}
        <div className="flex items-center justify-center px-4 py-4 border-b border-white/10">
          <img src="/assets/alliage-training.png" alt="Alliage" className={`flex-shrink-0 ${collapsed ? 'h-10' : 'h-12'} w-auto`} />
          <button className="lg:hidden absolute right-4 text-cyan-200" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>



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

        {/* Footer */}
        <div className={`px-4 py-3 border-t border-white/10 ${collapsed ? 'text-center' : ''}`}>
          <p className={`text-[8px] text-cyan-200/40 whitespace-nowrap overflow-hidden ${collapsed ? 'hidden' : ''}`}>
            Created by MKT Alliage, Avocado and{' '}
            <a href="https://www.lab485.com" target="_blank" rel="noopener noreferrer" className="text-cyan-300/70 hover:text-cyan-200 transition-colors underline">
              LAB485
            </a>
          </p>
          {collapsed && (
            <a href="https://www.lab485.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-300/70 hover:text-cyan-200 transition-colors">
              LAB485
            </a>
          )}
        </div>
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
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00A6D6] to-[#0088B0] flex items-center justify-center text-xs font-bold text-white ring-2 ring-white/15 overflow-hidden">
                    {user?.photo_url ? (
                      <img src={user.photo_url} alt={user.full_name} className="w-full h-full object-cover" />
                    ) : (
                      user?.full_name?.charAt(0)?.toUpperCase() || '?'
                    )}
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
                  {user?.role === 'admin' && (
                    <button onClick={() => { setProfileModalOpen(true); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                     <UserIcon className="w-4 h-4" />
                     {t('common.edit')} Perfil
                    </button>
                  )}
                  {user?.role === 'admin' && (
                    <Link to="/settings" onClick={() => setUserMenuOpen(false)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
                      <Settings className="w-4 h-4" />
                      Configurações
                    </Link>
                  )}
                  {user?.role === 'admin' && (
                    <Link to="/settings?tab=users" onClick={() => setUserMenuOpen(false)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
                      <Users className="w-4 h-4" />
                      Usuários
                    </Link>
                  )}
                  {['gerente_regional', 'educador'].includes(user?.role) && (
                    <Link to="/settings?tab=users" onClick={() => setUserMenuOpen(false)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
                      <Settings className="w-4 h-4" />
                      Configurações
                    </Link>
                  )}
                  <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100">
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
          <AuthorizationGate>
            <Outlet />
          </AuthorizationGate>
        </main>
      </div>

      <ProfileEditModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        onUpdateUser={setUser}
      />
    </div>
  );
}
