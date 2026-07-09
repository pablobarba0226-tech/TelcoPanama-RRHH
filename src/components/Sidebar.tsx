import React from 'react';
import { LayoutDashboard, UserSearch, Users, CalendarCheck, GraduationCap, LogOut, BarChart3, BookOpen } from 'lucide-react';

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
  return (
    <div className="w-52 bg-slate-900 flex flex-col h-screen shrink-0">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-lg">T</div>
          <div>
            <p className="text-white text-sm font-bold">TelcoPanamá</p>
            <p className="text-slate-400 text-xs">RRHH · Sistema</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
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
    </div>
  );
}
