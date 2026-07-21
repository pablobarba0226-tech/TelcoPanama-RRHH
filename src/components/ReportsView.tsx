import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, Download } from 'lucide-react';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

type NavigateFn = (module: string, empId?: number, tab?: string) => void;

// ── Pagination component (standalone, receives page/setPage as props) ─────────
function Paginacion({ total, page, setPage, pageSize = 50 }: {
  total: number;
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  pageSize?: number;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
    .reduce((acc: (number | string)[], p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
      acc.push(p); return acc;
    }, []);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
      <span className="text-xs text-slate-500">
        Mostrando {((page-1)*pageSize)+1}–{Math.min(page*pageSize, total)} de <strong>{total}</strong> registros
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium disabled:opacity-40 hover:bg-white transition-colors">
          ← Anterior
        </button>
        {pages.map((p, i) => p === '…'
          ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
          : <button key={p} onClick={() => setPage(Number(p))}
              className={`w-8 h-7 text-xs rounded-lg font-medium transition-colors
                ${page === p ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-white text-slate-600'}`}>
              {p}
            </button>
        )}
        <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page >= totalPages}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium disabled:opacity-40 hover:bg-white transition-colors">
          Siguiente →
        </button>
      </div>
      <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
    </div>
  );
}

function EmpLink({ emp, onNavigate, tab = 'asistencia' }: { emp: any; onNavigate?: NavigateFn; tab?: string }) {
  if (emp.id_empleado && onNavigate) {
    return (
      <button onClick={() => onNavigate('personnel', emp.id_empleado, tab)}
        className="text-blue-600 hover:text-blue-800 hover:underline text-left font-medium">
        {emp.empleado}
      </button>
    );
  }
  return <span className="font-medium text-slate-800">{emp.empleado}</span>;
}

export default function ReportsView({ onNavigate }: { onNavigate?: NavigateFn }) {
  const [tab, setTab] = useState<'r0'|'r1'|'r2'|'r3'|'r4'|'r5'|'r6'|'r7'>('r0');
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alertas, setAlertas] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [filterRango, setFilterRango] = useState<string>('');
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetch('/api/departamentos').then(r => r.json()).then(d => setDepartamentos(Array.isArray(d) ? d : []));
    fetch('/api/alertas?nivel=warning').then(r => r.json()).then(d => setAlertas(Array.isArray(d) ? d.slice(0, 8) : []));
  }, []);

  useEffect(() => {
    setPage(1);
    setFilterRango('');
    setFilterEstado('');
    cargarReporte();
  }, [tab, filterDept, filterFecha, filterEstado]);

  const ENDPOINTS: Record<string, string> = {
    r0: '/api/reportes/resumen-general',
    r1: '/api/reportes/asistencia-dia-anterior',
    r2: '/api/reportes/asistencia-mensual',
    r3: '/api/reportes/capacitaciones',
    r4: '/api/reportes/metricas-personal',
    r5: '/api/reportes/rotacion',
    r6: '/api/reportes/vacaciones',
    r7: '/api/reportes/estados-asistencia',
  };

  async function cargarReporte() {
    setLoading(true); setData(null);
    const params = new URLSearchParams();
    if (filterDept) params.set('dept', filterDept);
    if (filterFecha && tab === 'r1') params.set('fecha', filterFecha);
    const qs = params.toString() ? '?' + params.toString() : '';
    try {
      const r = await fetch(ENDPOINTS[tab] + qs);
      setData(await r.json());
    } catch { setData({}); }
    setLoading(false);
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────
  function exportCSV(filename: string, rows: any[], cols: { key: string; label: string }[]) {
    const header = cols.map(c => `"${c.label}"`).join(',');
    const body = rows.map(r => cols.map(c => {
      const v = r[c.key] ?? '';
      return `"${String(v).replace(/"/g, '""')}"`;
    }).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function exportCurrentReport() {
    if (!data) return;
    const d = new Date().toISOString().slice(0,10);
    if (tab === 'r1') exportCSV(`asistencia_diaria_${d}`, data.registros || [], [
      { key: 'empleado', label: 'Empleado' }, { key: 'departamento', label: 'Departamento' },
      { key: 'cargo', label: 'Cargo' }, { key: 'fecha', label: 'Fecha' },
      { key: 'hora_entrada', label: 'Entrada' }, { key: 'hora_salida', label: 'Salida' },
      { key: 'estado', label: 'Estado' }, { key: 'minutos_tardanza', label: 'Tardanza (min)' },
      { key: 'justificado', label: 'Justificado' },
    ]);
    else if (tab === 'r2') exportCSV(`asistencia_mensual_${d}`, data.por_empleado || [], [
      { key: 'empleado', label: 'Empleado' }, { key: 'departamento', label: 'Departamento' },
      { key: 'dias_laborables', label: 'Días laborables' }, { key: 'presentes', label: 'Presentes' },
      { key: 'tardanzas', label: 'Tardanzas' }, { key: 'ausencias_injust', label: 'Aus. injustificadas' },
      { key: 'pct_asistencia', label: '% Asistencia' },
    ]);
    else if (tab === 'r3') exportCSV(`capacitaciones_${d}`, data.capacitaciones || [], [
      { key: 'titulo', label: 'Capacitación' }, { key: 'tipo', label: 'Tipo' },
      { key: 'departamento', label: 'Departamento' }, { key: 'estado', label: 'Estado' },
      { key: 'inscritos', label: 'Inscritos' }, { key: 'completados', label: 'Completados' },
      { key: 'nota_promedio', label: 'Nota promedio' }, { key: 'pct_aprobacion', label: '% Aprobación' },
    ]);
    else if (tab === 'r4') exportCSV(`metricas_personal_${d}`, data.empleados || [], [
      { key: 'empleado', label: 'Empleado' }, { key: 'departamento', label: 'Departamento' },
      { key: 'cargo', label: 'Cargo' }, { key: 'promedio_evaluacion', label: 'Eval. promedio' },
      { key: 'proyectos_asignados', label: 'Proyectos asignados' },
      { key: 'proyectos_entregados', label: 'Proyectos entregados' },
      { key: 'pct_entrega', label: '% Entrega' },
      { key: 'tardanzas_mes', label: 'Tardanzas mes' }, { key: 'ausencias_mes', label: 'Ausencias mes' },
    ]);
    else if (tab === 'r5') exportCSV(`rotacion_${d}`, data.por_departamento || [], [
      { key: 'departamento', label: 'Departamento' },
      { key: 'ingresos_6m', label: 'Ingresos (6m)' }, { key: 'salidas_6m', label: 'Salidas (6m)' },
    ]);
    else if (tab === 'r6') exportCSV(`vacaciones_${d}`, data.saldos || [], [
      { key: 'empleado', label: 'Empleado' }, { key: 'departamento', label: 'Departamento' },
      { key: 'anios_servicio', label: 'Años servicio' },
      { key: 'dias_acumulados', label: 'Días acumulados' },
      { key: 'dias_tomados', label: 'Días tomados' },
      { key: 'dias_pendientes', label: 'Días pendientes' },
      { key: 'costo_pendiente', label: 'Costo pasivo (USD)' },
    ]);
    else if (tab === 'r7') exportCSV(`estados_asistencia_${d}`, data.por_departamento || [], [
      { key: 'departamento', label: 'Departamento' },
      { key: 'total', label: 'Total' },
      { key: 'presentes', label: 'Presentes' },
      { key: 'tardanzas', label: 'Tardanzas' },
      { key: 'ausentes', label: 'Ausentes' },
      { key: 'vacaciones', label: 'Vacaciones' },
      { key: 'pct_asistencia', label: '% Asistencia' },
    ]);
  }

    const TABS = [
    { id: 'r0', label: 'Resumen general', icon: '📊' },
    { id: 'r1', label: 'Asistencia diaria',    icon: '📅' },
    { id: 'r2', label: '% Asistencia mensual', icon: '📊' },
    { id: 'r3', label: 'Capacitaciones',        icon: '🎓' },
    { id: 'r4', label: 'Métricas personal',     icon: '📈' },
    { id: 'r5', label: 'Rotación',              icon: '🔄' },
    { id: 'r6', label: 'Vacaciones',            icon: '🏖️' },
    { id: 'r7', label: 'Estados asistencia',    icon: '📋' },
  ];

  const nivelStyle = (n: string) => ({
    critical: 'border-l-red-500 bg-red-50 text-red-800',
    warning:  'border-l-amber-500 bg-amber-50 text-amber-800',
    info:     'border-l-blue-500 bg-blue-50 text-blue-800',
  }[n] || 'border-l-slate-400 bg-slate-50');

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reportes y Dashboards</h2>
          <p className="text-sm text-slate-500 mt-0.5">Análisis de datos de RRHH con thresholds de alerta automáticos</p>
        </div>
        <div className="flex gap-2">
          {data && (
            <button onClick={exportCurrentReport}
              className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-medium">
              <Download className="w-3.5 h-3.5" /> Exportar CSV
            </button>
          )}
          <button onClick={() => fetch('/api/alertas/generar', { method: 'POST' })
            .then(() => fetch('/api/alertas?nivel=warning').then(r => r.json()).then(d => setAlertas(Array.isArray(d) ? d.slice(0, 8) : [])))}
            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium">
            🔄 Regenerar alertas
          </button>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="font-semibold text-slate-800 text-sm">Alertas activas ({alertas.length})</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {alertas.map((a: any) => (
              <div key={a.id} className={`border-l-4 rounded-r-lg p-2.5 ${nivelStyle(a.nivel)}`}>
                <p className="text-xs font-semibold truncate">{a.titulo}</p>
                <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{a.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
          <option value="">Todos los departamentos</option>
          {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        {tab === 'r1' && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 font-medium">Fecha:</label>
              <input type="date" value={filterFecha} onChange={e => setFilterFecha(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white" />
              {filterFecha && <button onClick={() => setFilterFecha('')} className="text-xs text-slate-400 hover:text-slate-600 underline">Hoy</button>}
            </div>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
              <option value="">Todos los estados</option>
              <option value="Presente">✅ Presentes</option>
              <option value="Tardanza">⏰ Tardanzas</option>
              <option value="Ausente">❌ Ausentes</option>
              <option value="Vacaciones">🏖️ Vacaciones</option>
            </select>
          </>
        )}
        <span className="text-xs text-slate-400">
          {tab === 'r1' ? (filterFecha ? `Mostrando: ${filterFecha}` : 'Mostrando: último día con registros') : 'Filtro aplica a todos los reportes'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
              ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading && <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Cargando reporte...</div>}

            {/* ── R0: Resumen General ──────────────────────────────────────────── */}
      {!loading && tab === 'r0' && data && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-5">
            {/* Empleados */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>👥</span> Personal
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total empleados', value: data.empleados?.total || 0, color: 'text-slate-800', bg: 'bg-slate-50' },
                  { label: 'Activos', value: data.empleados?.activos || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'En vacaciones', value: data.empleados?.en_vacaciones || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Inactivos', value: data.empleados?.inactivos || 0, color: 'text-slate-500', bg: 'bg-slate-100' },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-lg p-3`}>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Asistencia */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <span>📅</span> Asistencia — último día registrado
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Presentes', value: data.asistencia_hoy?.presentes || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'Tardanzas', value: data.asistencia_hoy?.tardanzas || 0, color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Ausentes', value: data.asistencia_hoy?.ausentes || 0, color: 'text-red-700', bg: 'bg-red-50' },
                  { label: '% Asistencia', value: `${data.asistencia_hoy?.pct_asistencia || 0}%`, color: 'text-blue-700', bg: 'bg-blue-50' },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-lg p-3`}>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
              {Number(data.asistencia_hoy?.prom_tardanza||0) > 0 && (
                <p className="text-xs text-amber-700 mt-3 bg-amber-50 rounded-lg px-3 py-2">
                  Tardanza promedio: <strong>{data.asistencia_hoy.prom_tardanza} min</strong>
                </p>
              )}
            </div>
            {/* Mes actual */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4"><span>📆</span> Mes actual</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tardanzas del mes', value: data.mes_actual?.tardanzas_mes || 0, color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Ausencias del mes', value: data.mes_actual?.ausencias_mes || 0, color: 'text-red-700', bg: 'bg-red-50' },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-lg p-3`}>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Capacitaciones */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4"><span>🎓</span> Capacitaciones</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Total', value: data.capacitaciones?.total || 0, color: 'text-slate-800', bg: 'bg-slate-50' },
                  { label: 'Completadas', value: data.capacitaciones?.completadas || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                  { label: 'En curso', value: data.capacitaciones?.en_curso || 0, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Programadas', value: data.capacitaciones?.programadas || 0, color: 'text-amber-700', bg: 'bg-amber-50' },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-lg p-3`}>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Vacaciones */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4">Vacaciones pendientes</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Con +15 días pend.', value: data.vacaciones?.criticas || 0, color: 'text-red-700', bg: 'bg-red-50' },
                  { label: 'Días pend. promedio', value: data.vacaciones?.promedio_pendientes || '—', color: 'text-amber-700', bg: 'bg-amber-50' },
                  { label: 'Costo pasivo', value: `$${Number(data.vacaciones?.costo_pasivo||0).toLocaleString()}`, color: 'text-purple-700', bg: 'bg-purple-50' },
                ].map(k => (
                  <div key={k.label} className={`${k.bg} rounded-lg p-3`}>
                    <p className="text-xs text-slate-500">{k.label}</p>
                    <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Evaluaciones */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-bold text-slate-800 mb-4">Desempeño general</h3>
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">Promedio global de evaluaciones</p>
                <p className={`text-4xl font-black ${
                  Number(data.evaluaciones?.promedio_global||0)>=4 ? 'text-emerald-600' :
                  Number(data.evaluaciones?.promedio_global||0)>=3 ? 'text-blue-600' :
                  Number(data.evaluaciones?.promedio_global||0)>=2 ? 'text-amber-600' : 'text-red-600'
                }`}>{data.evaluaciones?.promedio_global || '—'}<span className="text-xl font-normal text-slate-400">/5</span></p>
                {data.evaluaciones?.promedio_global && (
                  <p className="text-sm font-semibold mt-1 text-slate-500">
                    = {(Number(data.evaluaciones.promedio_global)*20).toFixed(0)}% sobre 100
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
            Resumen ejecutivo de todos los modulos. Usá las pestañas para ver reportes especificos con filtros por departamento, fecha y estado.
          </div>
        </div>
      )}

            {/* ── R1: Asistencia diaria ─────────────────────────────────────────────── */}
      {!loading && tab === 'r1' && data && data.registros !== undefined && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total registros', value: data.resumen?.total || 0,     color: 'text-slate-800',   bg: 'bg-slate-50' },
              { label: 'Presentes',       value: data.resumen?.presentes || 0, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Tardanzas',       value: data.resumen?.tardanzas || 0, color: 'text-amber-600',   bg: 'bg-amber-50' },
              { label: 'Ausentes',        value: data.resumen?.ausentes || 0,  color: 'text-red-600',     bg: 'bg-red-50' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-slate-100`}>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color} mt-1`}>{k.value}</p>
              </div>
            ))}
          </div>
          {data.resumen?.promedio_tardanza > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-700">
              ⏰ Tardanza promedio: <strong>{data.resumen.promedio_tardanza} minutos</strong>
            </div>
          )}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Detalle — Día anterior</h3>
              {onNavigate && <span className="text-xs text-slate-400">Clic en nombre → perfil de asistencia</span>}
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Empleado','Departamento','Cargo','Entrada','Salida','Estado','Tardanza'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  const filtrados = (data.registros || []).filter((r: any) => !filterEstado || r.estado === filterEstado);
                  const paginados = filtrados.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
                  return paginados;
                })().map((r: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-sm"><EmpLink emp={r} onNavigate={onNavigate} tab="asistencia" /></td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{r.departamento}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{r.cargo || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{r.hora_entrada || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-600">{r.hora_salida || '—'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.estado === 'Presente' ? 'bg-emerald-100 text-emerald-700' :
                        r.estado === 'Tardanza' ? 'bg-amber-100 text-amber-700' :
                        r.estado === 'Ausente'  ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>{r.estado}</span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{r.minutos_tardanza > 0 ? `${r.minutos_tardanza}m` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(() => { const f=(data.registros||[]).filter((r:any)=>!filterEstado||r.estado===filterEstado); return <Paginacion total={f.length} page={page} setPage={setPage} />; })()}
          </div>
        </div>
      )}

      {/* ── R2: Asistencia mensual ────────────────────────────────────────────── */}
      {!loading && tab === 'r2' && data && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 mb-4">% Asistencia diaria — mes actual</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.por_dia || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="fecha" tickFormatter={v => String(v).slice(5)} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v: any) => [`${v}%`, 'Asistencia']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
                <Line type="monotone" dataKey="pct" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Por empleado — mes actual</h3>
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-500 font-medium">⚠️ Rojo = pct &lt; 85%</span>
                {onNavigate && <span className="text-xs text-slate-400">| Clic en nombre → perfil de asistencia</span>}
              </div>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Empleado','Departamento','Días','Presentes','Tardanzas','Aus. injust.','% Asistencia'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data.por_empleado || []).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map((e: any, i: number) => (
                  <tr key={i} className={`hover:bg-slate-50 ${e.pct_asistencia < 85 ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2.5 text-sm"><EmpLink emp={e} onNavigate={onNavigate} tab="asistencia" /></td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{e.departamento}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{e.dias_laborables}</td>
                    <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{e.presentes}</td>
                    <td className="px-4 py-2.5 text-sm text-amber-600">{e.tardanzas}</td>
                    <td className="px-4 py-2.5 text-sm text-red-600">{e.ausencias_injust}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-16">
                          <div className={`h-1.5 rounded-full ${e.pct_asistencia >= 90 ? 'bg-emerald-500' : e.pct_asistencia >= 75 ? 'bg-amber-400' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(e.pct_asistencia, 100)}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${e.pct_asistencia >= 90 ? 'text-emerald-600' : e.pct_asistencia >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                          {e.pct_asistencia}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Paginacion total={(data.por_empleado||[]).length} page={page} setPage={setPage} />
          </div>
        </div>
      )}

      {/* ── R3: Capacitaciones ───────────────────────────────────────────────── */}
      {!loading && tab === 'r3' && data && (
        <div className="space-y-4">
          {(data.capacitaciones || []).length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
              <p className="text-slate-400">No hay datos de capacitaciones</p>
              {onNavigate && (
                <button onClick={() => onNavigate('development')}
                  className="mt-3 text-sm text-blue-600 hover:underline font-medium">
                  Ir al módulo Desarrollo para registrar capacitaciones →
                </button>
              )}
            </div>
          )}
          {(data.capacitaciones || []).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Tasa de aprobación por capacitación</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={(data.capacitaciones || []).slice(0, 8)} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="titulo" angle={-20} textAnchor="end" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} unit="%" />
                  <Tooltip formatter={(v: any) => [`${v}%`, 'Aprobación']} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  <Bar dataKey="pct_aprobacion" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {(data.capacitaciones || []).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Detalle de capacitaciones</span>
                {onNavigate && (
                  <button onClick={() => onNavigate('development')}
                    className="text-xs text-blue-600 hover:underline font-medium">
                    Ver módulo Desarrollo →
                  </button>
                )}
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-slate-200">
                  {['Capacitación','Tipo','Depto.','Estado','Inscritos','Completados','Nota prom.','% Aprobación'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.capacitaciones || []).map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800 max-w-xs truncate">{c.titulo}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{c.tipo}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{c.departamento || 'Global'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.estado === 'Completada' ? 'bg-emerald-100 text-emerald-700' :
                          c.estado === 'En curso'   ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>{c.estado}</span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{c.inscritos || 0}</td>
                      <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{c.completados || 0}</td>
                      <td className="px-4 py-2.5 text-sm text-blue-600 font-medium">{c.nota_promedio || '—'}</td>
                      <td className="px-4 py-2.5 text-sm font-bold">{c.pct_aprobacion ? `${c.pct_aprobacion}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── R4: Métricas de personal ─────────────────────────────────────────── */}
      {!loading && tab === 'r4' && data && (() => {
        const rangoFiltrado = (data.empleados || []).filter((e: any) => {
          if (!filterRango) return true;
          const p = Number(e.puntaje_100 || 0);
          if (filterRango === '90+')  return p >= 90;
          if (filterRango === '80-89') return p >= 80 && p < 90;
          if (filterRango === '70-79') return p >= 70 && p < 80;
          if (filterRango === '<60')   return p < 60;
          return true;
        });
        return (
        <div className="space-y-4">
          {/* Filtros de rango */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold text-slate-500 uppercase">Filtrar por puntaje:</span>
            {[
              { v: '',      l: 'Todos',   col: 'bg-slate-100 text-slate-600' },
              { v: '90+',   l: '≥ 90%',   col: 'bg-emerald-100 text-emerald-700' },
              { v: '80-89', l: '80–89%',  col: 'bg-blue-100 text-blue-700' },
              { v: '70-79', l: '70–79%',  col: 'bg-amber-100 text-amber-700' },
              { v: '<60',   l: '< 60%',   col: 'bg-red-100 text-red-700' },
            ].map(f => (
              <button key={f.v} onClick={() => { setFilterRango(f.v); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                  ${filterRango === f.v ? f.col + ' border-current' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                {f.l}
                <span className="ml-1.5 opacity-60">
                  ({(data.empleados||[]).filter((e: any) => {
                    const p = Number(e.puntaje_100||0);
                    if (f.v === '90+')   return p >= 90;
                    if (f.v === '80-89') return p >= 80 && p < 90;
                    if (f.v === '70-79') return p >= 70 && p < 80;
                    if (f.v === '<60')   return p < 60;
                    return true;
                  }).length})
                </span>
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400">
              ⚠️ Rojo = puntaje bajo threshold · Clic en nombre → evaluaciones
            </span>
          </div>

          {/* Resumen por departamento */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800 text-sm">Resumen por departamento</h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Departamento','Empleados','Prom. /5','Puntaje /100','⭐ Excelente','✓ Bueno','~ Regular','↓ Bajo','Sin eval.'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data.por_departamento || []).map((d: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5 text-sm font-medium text-slate-800">{d.departamento}</td>
                    <td className="px-3 py-2.5 text-sm text-slate-500 text-center">{d.total_empleados}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-sm font-bold ${Number(d.promedio_evaluacion||0)>=4?'text-emerald-600':Number(d.promedio_evaluacion||0)>=3?'text-blue-600':Number(d.promedio_evaluacion||0)>=2?'text-amber-600':'text-red-600'}`}>
                        {d.promedio_evaluacion ? Number(d.promedio_evaluacion).toFixed(1) : '—'}/5
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2 max-w-20">
                          <div className={`h-2 rounded-full ${Number(d.puntaje_100||0)>=80?'bg-emerald-500':Number(d.puntaje_100||0)>=60?'bg-amber-400':'bg-red-500'}`}
                            style={{width:`${Math.min(Number(d.puntaje_100||0),100)}%`}} />
                        </div>
                        <span className={`text-sm font-bold ${Number(d.puntaje_100||0)>=80?'text-emerald-600':Number(d.puntaje_100||0)>=60?'text-amber-600':'text-red-600'}`}>
                          {d.puntaje_100 ? Number(d.puntaje_100).toFixed(0) : '—'}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-emerald-600">{d.excelente||0}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-blue-600">{d.bueno||0}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-amber-600">{d.regular||0}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold text-red-600">{d.bajo||0}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-slate-400">{d.sin_evaluacion||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tabla individual */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800 text-sm">Detalle por empleado</h3>
              <span className="text-xs text-slate-400">{rangoFiltrado.length} empleados{filterRango ? ` con puntaje ${filterRango}%` : ''}</span>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Empleado','Departamento','Cargo','Eval /5','Puntaje /100','Proyectos','% Entrega','Tard.','Aus.'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rangoFiltrado.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map((e: any, i: number) => {
                  const p100 = Number(e.puntaje_100 || 0);
                  const bajo = p100 > 0 && p100 < 50;
                  const riesgo = p100 >= 50 && p100 < 70;
                  return (
                    <tr key={i} className={`hover:bg-slate-50 ${bajo?'bg-red-50':riesgo?'bg-amber-50':''}`}>
                      <td className="px-4 py-2.5 text-sm"><EmpLink emp={e} onNavigate={onNavigate} tab="evaluaciones" /></td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{e.departamento}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate">{e.cargo}</td>
                      <td className="px-4 py-2.5">
                        {e.promedio_evaluacion
                          ? <span className={`text-sm font-bold ${Number(e.promedio_evaluacion)>=4?'text-emerald-600':Number(e.promedio_evaluacion)>=3?'text-blue-600':Number(e.promedio_evaluacion)>=2.5?'text-amber-600':'text-red-600'}`}>
                              {Number(e.promedio_evaluacion).toFixed(1)}/5
                            </span>
                          : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {e.puntaje_100 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-14 bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${p100>=90?'bg-emerald-500':p100>=70?'bg-blue-500':p100>=60?'bg-amber-400':'bg-red-500'}`}
                                style={{width:`${Math.min(p100,100)}%`}} />
                            </div>
                            <span className={`text-sm font-bold ${p100>=90?'text-emerald-600':p100>=70?'text-blue-600':p100>=60?'text-amber-600':'text-red-600'}`}>
                              {p100.toFixed(0)}%
                            </span>
                          </div>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {e.proyectos_asignados>0?`${e.proyectos_entregados}/${e.proyectos_asignados}`:'—'}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium">
                        {e.pct_entrega!=null
                          ? <span className={Number(e.pct_entrega)>=90?'text-emerald-600':Number(e.pct_entrega)>=70?'text-amber-600':'text-red-600'}>{e.pct_entrega}%</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {Number(e.tardanzas_mes)>4?<span className="text-amber-600 font-medium">⏰ {e.tardanzas_mes}</span>:e.tardanzas_mes||0}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {Number(e.ausencias_mes)>2?<span className="text-red-600 font-medium">❌ {e.ausencias_mes}</span>:e.ausencias_mes||0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Paginacion total={rangoFiltrado.length} page={page} setPage={setPage} />
          </div>
        </div>
        );
      })()}

      {/* ── R6: Vacaciones ──────────────────────────────────────────────────── */}
      {!loading && tab === 'r6' && data && (
        <div className="space-y-5">
          {/* KPI cards */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Empleados activos',     value: data.resumen?.totalEmpleados || 0, color: 'text-slate-800',   bg: 'bg-slate-50' },
              { label: 'Días pendientes total', value: data.resumen?.totalPendientes || 0, color: 'text-blue-700',   bg: 'bg-blue-50' },
              { label: 'Costo pasivo (USD)',    value: `$${Number(data.resumen?.totalCosto||0).toLocaleString()}`, color: 'text-purple-700', bg: 'bg-purple-50' },
              { label: 'Días tomados (año)',    value: data.resumen?.diasTomadosAnio || 0, color: 'text-emerald-700', bg: 'bg-emerald-50' },
              { label: 'Con +15 días pend.',   value: data.resumen?.empleadosAlerta || 0, color: 'text-red-700',    bg: 'bg-red-50' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-slate-100`}>
                <p className="text-xs text-slate-500 font-medium leading-tight">{k.label}</p>
                <p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Alert block: >15 días */}
          {(data.alerta15||[]).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⚠️</span>
                <h3 className="font-bold text-red-800">{data.alerta15.length} empleado{data.alerta15.length>1?'s':''} con más de 15 días pendientes</h3>
                {onNavigate && <span className="text-xs text-red-400 ml-auto">Clic en nombre → perfil vacaciones</span>}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(data.alerta15||[]).map((e: any) => (
                  <div key={e.id_empleado} className="bg-white rounded-lg border border-red-200 px-4 py-2.5 flex items-center justify-between">
                    <div>
                      {onNavigate ? (
                        <button onClick={() => onNavigate('personnel', e.id_empleado, 'vacaciones')} className="text-sm font-semibold text-blue-600 hover:underline text-left">{e.empleado}</button>
                      ) : <span className="text-sm font-semibold text-slate-800">{e.empleado}</span>}
                      <p className="text-xs text-slate-500">{e.departamento}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">{Number(e.dias_pendientes).toFixed(1)}</p>
                      <p className="text-xs text-slate-400">días</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Saldos table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Saldos de vacaciones por empleado</h3>
              {onNavigate && <span className="text-xs text-slate-400">Clic en nombre → perfil</span>}
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Empleado','Departamento','Antigüedad','Acumulados','Tomados','Pendientes','Costo pasivo','Estado'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data.saldos||[]).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map((e: any) => {
                  const pend = Number(e.dias_pendientes);
                  const alerta = pend > 15;
                  const riesgo = pend > 10 && pend <= 15;
                  return (
                    <tr key={e.id_empleado} className={`hover:bg-slate-50 ${alerta?'bg-red-50':riesgo?'bg-amber-50':''}`}>
                      <td className="px-4 py-2.5 text-sm">
                        {onNavigate ? (
                          <button onClick={() => onNavigate('personnel', e.id_empleado, 'vacaciones')} className="text-blue-600 hover:underline font-medium">{e.empleado}</button>
                        ) : <span className="font-medium text-slate-800">{e.empleado}</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{e.departamento}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{e.anios_servicio} año{e.anios_servicio!==1?'s':''}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-600">{Number(e.dias_acumulados).toFixed(1)}</td>
                      <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{Number(e.dias_tomados).toFixed(1)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-sm font-bold ${alerta?'text-red-600':riesgo?'text-amber-600':'text-slate-700'}`}>{pend.toFixed(1)}</span>
                        {alerta && <span className="ml-1 text-xs">⚠️</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">${Number(e.costo_pendiente||0).toLocaleString()}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${alerta?'bg-red-100 text-red-700':riesgo?'bg-amber-100 text-amber-700':'bg-emerald-100 text-emerald-700'}`}>
                          {alerta?'🔴 Crítico':riesgo?'🟡 Riesgo':'🟢 OK'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Paginacion total={(data.saldos||[]).length} page={page} setPage={setPage} />
          </div>

          {/* Vacaciones tomadas en el año */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Vacaciones aprobadas — {new Date().getFullYear()}</h3>
            </div>
            {(data.tomadas||[]).length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">Sin vacaciones registradas este año</p>
            ) : (
              <table className="w-full">
                <thead><tr className="border-b border-slate-200">
                  {['Empleado','Departamento','Desde','Hasta','Días','Motivo'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.tomadas||[]).map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{v.empleado}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{v.departamento}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{v.fecha_inicio}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{v.fecha_fin}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-blue-600">{v.dias_solicitados}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500 max-w-xs truncate">{v.motivo||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

            {/* ── R5: Rotación ─────────────────────────────────────────────────────── */}
      {!loading && tab === 'r5' && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Ingresos vs Salidas mensuales</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.chart || []} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="mes" angle={-20} textAnchor="end" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,.1)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salidas"  name="Salidas"  fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Motivos de salida</h3>
              {(data.motivos || []).length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.motivos || []} dataKey="cantidad" nameKey="tipo" cx="50%" cy="50%" outerRadius={70}
                      label={({ tipo, percent }: any) => `${String(tipo).slice(0, 12)} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {(data.motivos || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p className="text-slate-400 text-sm text-center py-16">Sin datos de salidas registradas</p>}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h3 className="font-semibold text-slate-800">Rotación por departamento — últimos 6 meses</h3>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Departamento','Ingresos (6m)','Salidas (6m)','Balance'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data.por_departamento || []).map((d: any, i: number) => (
                  <tr key={i} className={`hover:bg-slate-50 ${Number(d.salidas_6m) > 2 ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{d.departamento}</td>
                    <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{d.ingresos_6m}</td>
                    <td className="px-4 py-2.5 text-sm text-red-600 font-medium">
                      {Number(d.salidas_6m) > 2 ? <span>⚠️ {d.salidas_6m}</span> : d.salidas_6m}
                    </td>
                    <td className="px-4 py-2.5 text-sm">
                      <span className={`font-bold ${Number(d.ingresos_6m) - Number(d.salidas_6m) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {Number(d.ingresos_6m) - Number(d.salidas_6m) >= 0 ? '+' : ''}{Number(d.ingresos_6m) - Number(d.salidas_6m)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* ── R7: Estados de asistencia ──────────────────────────────────────────── */}
      {!loading && tab === 'r7' && data && (
        <div className="space-y-5">

          {/* Fecha y resumen */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">
              Resumen de asistencia — <span className="text-blue-600">{data.fecha_consultada}</span>
            </h3>
            {data.sin_registro > 0 && (
              <div className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg">
                ⚠️ {data.sin_registro} empleados sin registro hoy
              </div>
            )}
          </div>

          {/* KPI por estado */}
          <div className="grid grid-cols-5 gap-3">
            {(data.por_estado || []).map((e: any) => {
              const cfg: Record<string, { col: string; bg: string; icon: string }> = {
                'Presente':   { col: 'text-emerald-700', bg: 'bg-emerald-50', icon: '✅' },
                'Tardanza':   { col: 'text-amber-700',   bg: 'bg-amber-50',   icon: '⏰' },
                'Ausente':    { col: 'text-red-700',     bg: 'bg-red-50',     icon: '❌' },
                'Vacaciones': { col: 'text-blue-700',    bg: 'bg-blue-50',    icon: '🏖️' },
              };
              const c = cfg[e.estado] || { col: 'text-slate-700', bg: 'bg-slate-50', icon: '📌' };
              return (
                <div key={e.estado} className={`${c.bg} rounded-xl p-4 border border-slate-100`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-500">{e.estado}</span>
                    <span className="text-lg">{c.icon}</span>
                  </div>
                  <p className={`text-3xl font-black ${c.col}`}>{e.cantidad}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{e.porcentaje}% del total</p>
                </div>
              );
            })}
            {data.sin_registro > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-500">Sin registro</span>
                  <span className="text-lg">❓</span>
                </div>
                <p className="text-3xl font-black text-slate-600">{data.sin_registro}</p>
                <p className="text-xs text-slate-400 mt-0.5">no marcaron hoy</p>
              </div>
            )}
          </div>

          {/* Tendencia 30 días */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h4 className="font-semibold text-slate-800 mb-4 text-sm">Tendencia últimos 30 días</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.tendencia || []} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="fecha" tickFormatter={(v: string) => v?.slice(5)} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 11 }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="presentes"  name="Presentes"  fill="#10b981" radius={[2,2,0,0]} stackId="a" />
                <Bar dataKey="tardanzas"  name="Tardanzas"  fill="#f59e0b" radius={[0,0,0,0]} stackId="a" />
                <Bar dataKey="ausentes"   name="Ausentes"   fill="#ef4444" radius={[0,0,0,0]} stackId="a" />
                <Bar dataKey="vacaciones" name="Vacaciones" fill="#3b82f6" radius={[2,2,0,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Por departamento */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 bg-slate-50">
              <h4 className="font-semibold text-slate-800 text-sm">Por departamento — {data.fecha_consultada}</h4>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-slate-200">
                {['Departamento','Total','Presentes','Tardanzas','Ausentes','Vacaciones','% Asistencia'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data.por_departamento || []).map((d: any, i: number) => (
                  <tr key={i} className={`hover:bg-slate-50 ${Number(d.pct_asistencia) < 75 ? 'bg-red-50' : Number(d.pct_asistencia) < 90 ? 'bg-amber-50' : ''}`}>
                    <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{d.departamento}</td>
                    <td className="px-4 py-2.5 text-sm text-slate-500">{d.total}</td>
                    <td className="px-4 py-2.5 text-sm text-emerald-600 font-medium">{d.presentes}</td>
                    <td className="px-4 py-2.5 text-sm text-amber-600 font-medium">{d.tardanzas}</td>
                    <td className="px-4 py-2.5 text-sm text-red-600 font-medium">{d.ausentes}</td>
                    <td className="px-4 py-2.5 text-sm text-blue-600 font-medium">{d.vacaciones}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5 max-w-20">
                          <div className={`h-1.5 rounded-full ${Number(d.pct_asistencia) >= 90 ? 'bg-emerald-500' : Number(d.pct_asistencia) >= 75 ? 'bg-amber-400' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(Number(d.pct_asistencia), 100)}%` }} />
                        </div>
                        <span className={`text-sm font-bold ${Number(d.pct_asistencia) >= 90 ? 'text-emerald-600' : Number(d.pct_asistencia) >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                          {d.pct_asistencia}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top tardanzas y ausencias */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <h4 className="font-semibold text-amber-800 text-sm">⏰ Top 10 empleados con más tardanzas (mes)</h4>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-slate-200">
                  {['Empleado','Depto.','Tardanzas','Prom. min'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.top_tardanzas || []).map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-xs font-medium text-slate-800">{e.empleado}</td>
                      <td className="px-3 py-2 text-xs text-slate-500 truncate max-w-24">{e.departamento}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${Number(e.tardanzas_mes) >= 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {e.tardanzas_mes}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-slate-500 text-center">{e.promedio_min} min</td>
                    </tr>
                  ))}
                  {!(data.top_tardanzas?.length) && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-xs">Sin tardanzas este mes</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                <h4 className="font-semibold text-red-800 text-sm">❌ Top 10 empleados con más ausencias (mes)</h4>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-slate-200">
                  {['Empleado','Depto.','Ausencias','Injust.'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {(data.top_ausencias || []).map((e: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-xs font-medium text-slate-800">{e.empleado}</td>
                      <td className="px-3 py-2 text-xs text-slate-500 truncate max-w-24">{e.departamento}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${Number(e.ausencias_mes) >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                          {e.ausencias_mes}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {Number(e.injustificadas) > 0
                          ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{e.injustificadas}</span>
                          : <span className="text-emerald-500 text-xs">✓</span>}
                      </td>
                    </tr>
                  ))}
                  {!(data.top_ausencias?.length) && <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400 text-xs">Sin ausencias este mes</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
