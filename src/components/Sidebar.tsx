import React, { useState } from 'react';
import { LayoutDashboard, UserSearch, Users, CalendarCheck, GraduationCap, LogOut, BarChart3, BookOpen, Menu, X } from 'lucide-react';

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

export default function Sidebar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (t: string) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: string) => {
    setActiveTab(id);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg shrink-0">T</div>
          <div className="min-w-0">
            <p className="text-white text-sm font-bold">TelcoPanamá</p>
            <p className="text-slate-400 text-xs">RRHH · Sistema</p>
          </div>
          {/* Close button — only visible when mobile drawer is open */}
          <button
            className="ml-auto sm:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left
                ${active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-700">
        <div className="flex items-center gap-2 px-2">
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">A</div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">Ana López</p>
            <p className="text-slate-500 text-xs truncate">Coord. RRHH</p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (always visible on sm+) ── */}
      <div className="hidden sm:flex w-52 bg-slate-900 flex-col h-screen shrink-0">
        <SidebarContent />
      </div>

      {/* ── Mobile: top bar with hamburger ── */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-40 flex items-center bg-slate-900 px-3 py-2.5 border-b border-slate-700">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center text-white font-black text-sm shrink-0">T</div>
          <p className="text-white text-sm font-bold">TelcoPanamá</p>
          <span className="text-slate-500 text-xs">· RRHH</span>
        </div>
      </div>

      {/* ── Mobile: drawer overlay ── */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="relative w-64 max-w-[80vw] bg-slate-900 flex flex-col h-full shadow-2xl">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
