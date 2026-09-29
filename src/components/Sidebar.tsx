import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, UserSearch, Users, CalendarCheck,
  GraduationCap, LogOut, BarChart3, BookOpen, Menu, X,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard',   label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'recruitment', label: 'Reclutamiento IA',  icon: UserSearch },
  { id: 'personnel',   label: 'Personal',          icon: Users },
  { id: 'control',     label: 'Control Diario',    icon: CalendarCheck },
  { id: 'development', label: 'Desarrollo',        icon: GraduationCap },
  { id: 'exit',        label: 'Salida',            icon: LogOut },
  { id: 'reports',     label: 'Reportes',          icon: BarChart3 },
  { id: 'reglas',      label: 'Reglamento',        icon: BookOpen },
];

// "Wide" = viewport ≥ 768px; below that we use the drawer pattern.
function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setWide(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return wide;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: string;
  setActiveTab: (t: string) => void;
}) {
  const isWide = useIsWide();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer when resizing to wide
  useEffect(() => { if (isWide) setDrawerOpen(false); }, [isWide]);

  const handleNav = (id: string) => {
    setActiveTab(id);
    setDrawerOpen(false);
  };

  // ── Shared nav list ──────────────────────────────────────────────────────
  const NavList = () => (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {navItems.map(item => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
              ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  const UserFooter = () => (
    <div className="p-3 border-t border-slate-700">
      <div className="flex items-center gap-2 px-2">
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
        <div className="min-w-0">
          <p className="text-white text-xs font-semibold truncate">Ana López</p>
          <p className="text-slate-500 text-xs truncate">Coord. RRHH</p>
        </div>
      </div>
    </div>
  );

  // ── WIDE: persistent sidebar ─────────────────────────────────────────────
  if (isWide) {
    return (
      <div className="w-52 bg-slate-900 flex flex-col h-screen shrink-0">
        {/* Tell App.tsx no topbar offset is needed on wide screens */}
        <style>{`:root { --topbar-h: 0px; }`}</style>
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shrink-0">T</div>
            <div className="min-w-0">
              <p className="text-white text-sm font-bold">TelcoPanamá</p>
              <p className="text-slate-400 text-xs">RRHH · Sistema</p>
            </div>
          </div>
        </div>
        <NavList />
        <UserFooter />
      </div>
    );
  }

  // ── NARROW: topbar + drawer ──────────────────────────────────────────────
  return (
    <>
      {/* Tell App.tsx the topbar offset needed */}
      <style>{`:root { --topbar-h: 48px; }`}</style>

      {/* Fixed top bar — replaces the sidebar entirely */}
      <div
        style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40 }}
        className="flex items-center bg-slate-900 border-b border-slate-700 px-3 py-2.5"
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3 min-w-0">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-sm shrink-0">T</div>
          <p className="text-white text-sm font-bold truncate">TelcoPanamá</p>
          <span className="text-slate-500 text-xs shrink-0">· RRHH</span>
        </div>
      </div>

      {/* Drawer overlay */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }}
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div
            style={{ position: 'relative', width: 240, maxWidth: '80vw' }}
            className="bg-slate-900 flex flex-col h-full shadow-2xl"
          >
            {/* Drawer header */}
            <div className="p-4 border-b border-slate-700 flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shrink-0">T</div>
              <div className="min-w-0 flex-1">
                <p className="text-white text-sm font-bold">TelcoPanamá</p>
                <p className="text-slate-400 text-xs">RRHH · Sistema</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavList />
            <UserFooter />
          </div>
        </div>
      )}
    </>
  );
}
