import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, Download } from 'lucide-react';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

type NavigateFn = (module: string, empId?: number, tab?: string) => void;

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
  const [tab, setTab] = useState<'r1'|'r2'|'r3'|'r4'|'r5'>('r1');
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [alertas, setAlertas] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/departamentos').then(r => r.json()).then(d => setDepartamentos(Array.isArray(d) ? d : []));
    fetch('/api/alertas?nivel=warning').then(r => r.json()).then(d => setAlertas(Array.isArray(d) ? d.slice(0, 8) : []));
  }, []);

  useEffect(() => { setPage(1); }, [tab, filterDept, filterFecha, filterEstado]);
  useEffect(() => { cargarReporte(); }, [tab, filterDept, filterFecha]);

  const ENDPOINTS: Record<string, string> = {
    r1: '/api/reportes/asistencia-dia-anterior',
    r2: '/api/reportes/asistencia-mensual',
    r3: '/api/reportes/capacitaciones',
    r4: '/api/reportes/metricas-personal',
    r5: '/api/reportes/rotacion',
    r6: '/api/reportes/vacaciones',
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

  // ── Paginación helper ──────────────────────────────────────────────────────
  function Paginacion({ total, rows }: { total: number; rows: any[] }) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (totalPages <= 1) return null;
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 rounded-b-xl">
        <span className="text-xs text-slate-500">
          Mostrando {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} de <strong>{total}</strong> registros
        </span>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium disabled:opacity-40 hover:bg-white transition-colors">
            ← Anterior
          </button>
          {Array.from({length: totalPages}, (_,i)=>i+1)
            .filter(p => p===1 || p===totalPages || Math.abs(p-page)<=2)
            .reduce((acc:(number|string)[], p, i, arr) => {
              if (i>0 && (p as number)-(arr[i-1] as number)>1) acc.push('…');
              acc.push(p); return acc;
            }, [])
            .map((p,i) => p==='…'
              ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
              : <button key={p} onClick={() => setPage(Number(p))}
                  className={`w-8 h-7 text-xs rounded-lg font-medium transition-colors
                    ${page===p ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-white text-slate-600'}`}>
                  {p}
                </button>
            )}
          <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page>=totalPages}
            className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium disabled:opacity-40 hover:bg-white transition-colors">
            Siguiente →
          </button>
        </div>
        <span className="text-xs text-slate-400">Página {page} de {totalPages}</span>
      </div>
    );
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
  }

    const TABS = [
    { id: 'r1', label: 'Asistencia diaria',    icon: '📅' },
    { id: 'r2', label: '% Asistencia mensual', icon: '📊' },
    { id: 'r3', label: 'Capacitaciones',        icon: '🎓' },
    { id: 'r4', label: 'Métricas personal',     icon: '📈' },
    { id: 'r5', label: 'Rotación',              icon: '🔄' },
    { id: 'r6', label: 'Vacaciones',            icon: '🏖️' },
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
            {(() => { const f=(data.registros||[]).filter((r:any)=>!filterEstado||r.estado===filterEstado); return <Paginacion total={f.length} rows={f} />; })()}
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
            <Paginacion total={(data.por_empleado||[]).length} rows={data.por_empleado||[]} />
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
      {!loading && tab === 'r4' && data && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
            ⚠️ Filas resaltadas en rojo = empleados con métricas bajo el threshold · Amarillo = en zona de riesgo
            {onNavigate && <span className="ml-2 text-slate-500">| Clic en nombre → evaluaciones del empleado</span>}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead><tr className="bg-slate-50 border-b border-slate-200">
                {['Empleado','Departamento','Cargo','Evaluación prom.','Proyectos','% Entrega','Tardanzas mes','Ausencias mes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(data.empleados || []).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map((e: any, i: number) => {
                  const bajo = e.promedio_evaluacion && Number(e.promedio_evaluacion) < 2.5;
                  const riesgo = e.pct_entrega !== null && Number(e.pct_entrega) < 70;
                  return (
                    <tr key={i} className={`hover:bg-slate-50 ${bajo ? 'bg-red-50' : riesgo ? 'bg-amber-50' : ''}`}>
                      <td className="px-4 py-2.5 text-sm">
                        <EmpLink emp={e} onNavigate={onNavigate} tab="evaluaciones" />
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{e.departamento}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate">{e.cargo}</td>
                      <td className="px-4 py-2.5">
                        {e.promedio_evaluacion ? (
                          <span className={`text-sm font-bold ${Number(e.promedio_evaluacion) >= 4 ? 'text-emerald-600' : Number(e.promedio_evaluacion) >= 3 ? 'text-blue-600' : Number(e.promedio_evaluacion) >= 2.5 ? 'text-amber-600' : 'text-red-600'}`}>
                            {Number(e.promedio_evaluacion).toFixed(1)}/5
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">
                        {e.proyectos_asignados > 0 ? `${e.proyectos_entregados}/${e.proyectos_asignados}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-medium">
                        {e.pct_entrega != null ? (
                          <span className={Number(e.pct_entrega) >= 90 ? 'text-emerald-600' : Number(e.pct_entrega) >= 70 ? 'text-amber-600' : 'text-red-600'}>
                            {e.pct_entrega}%
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {e.tardanzas_mes > 4 ? <span className="text-amber-600 font-medium">⏰ {e.tardanzas_mes}</span> : e.tardanzas_mes || 0}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        {e.ausencias_mes > 2 ? <span className="text-red-600 font-medium">❌ {e.ausencias_mes}</span> : e.ausencias_mes || 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Paginacion total={(data.empleados||[]).length} rows={data.empleados||[]} />
          </div>
        </div>
      )}

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
            <Paginacion total={(data.saldos||[]).length} rows={data.saldos||[]} />
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
    </div>
  );
}
