import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import RecruitmentView from './components/RecruitmentView';
import EmployeesView from './components/EmployeesView';
import ControlView from './components/ControlView';
import DevelopmentView from './components/DevelopmentView';
import ExitView from './components/ExitView';
import ReglasView from './components/ReglasView';
import ReportsView from './components/ReportsView';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [deepLink, setDeepLink] = useState<{ empId?: number; tab?: string } | null>(null);

  function handleNavigate(module: string, empId?: number, tab?: string) {
    const normalized =
      module === 'personal'   ? 'personnel'   :
      module === 'reclutamiento' ? 'recruitment' :
      module === 'desarrollo' ? 'development' :
      module === 'salida'     ? 'exit'        :
      module === 'control'    ? 'control'     :
      module === 'reportes'   ? 'reports'     :
      module; // pass through if already correct key

    setDeepLink(empId ? { empId, tab } : null);
    setActiveTab(normalized);
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':   return <DashboardView onNavigate={handleNavigate} />;
      case 'recruitment': return <RecruitmentView />;
      case 'personnel':   return <EmployeesView deepLink={deepLink} onDeepLinkConsumed={() => setDeepLink(null)} />;
      case 'control':     return <ControlView />;
      case 'development': return <DevelopmentView />;
      case 'exit':        return <ExitView />;
      case 'reports':     return <ReportsView onNavigate={handleNavigate} />;
      case 'reglas':      return <ReglasView />;
      default:            return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setDeepLink(null); setActiveTab(tab); }}
      />
      {/* pt-12 on mobile to clear the fixed top bar; sm: reverts to normal */}
      <main className="flex-1 pt-12 sm:pt-0 p-4 sm:p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
