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
      module === 'personal'      ? 'personnel'   :
      module === 'reclutamiento' ? 'recruitment' :
      module === 'desarrollo'    ? 'development' :
      module === 'salida'        ? 'exit'        :
      module === 'control'       ? 'control'     :
      module === 'reportes'      ? 'reports'     :
      module;

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
    /*
     * Layout strategy
     * ───────────────
     * On wide screens (≥768 px) Sidebar renders a permanent left column
     * inside a horizontal flex row, so we need flex here.
     * On narrow screens Sidebar renders ONLY a fixed topbar + a portal
     * drawer — it contributes zero width to this row — so main fills 100%.
     *
     * The Sidebar component itself decides which mode to use via a
     * matchMedia listener, so no Tailwind breakpoint classes are needed
     * here; the layout always starts as "flex row" but on narrow screens
     * the sidebar simply isn't in the flow.
     */
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => { setDeepLink(null); setActiveTab(tab); }}
      />
      {/*
       * main always gets flex-1 (fills remaining width).
       * On wide screens that's "screen minus 208 px sidebar".
       * On narrow screens the sidebar is out of flow, so flex-1 = 100%.
       *
       * pt-[48px] reserves space for the fixed mobile topbar (h≈48px).
       * On wide screens the topbar is not rendered, so the padding is
       * harmless (you could conditionally apply it, but it doesn't hurt).
       * We use an inline style for the padding-top so it is immune to
       * Tailwind's JIT purging arbitrary values.
       *)
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 'var(--topbar-h, 48px)' }}
      >
        {/*
         * CSS custom property trick: on wide screens Sidebar doesn't render
         * the topbar, so we override --topbar-h to 0 via a sibling selector
         * isn't possible in plain CSS. Instead we rely on the fact that
         * Sidebar's wide branch returns a position:static element, giving
         * the flex container a real left sibling, which means the main's
         * flex-1 already excludes the sidebar width. We just need the
         * padding-top gone on desktop. The Sidebar injects a <style> tag
         * for this.
         *)
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
