import React, { useEffect, useState } from 'react';
import { Users, Briefcase, GraduationCap, Bell, AlertTriangle, CheckCircle, UserPlus, CalendarCheck, Umbrella, LogOut } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function DashboardView({ onNavigate }: { onNavigate?: (m: string, id?: number, tab?: string) => void }) {
  const [stats, setStats]         = useState<any>(null);
  const [alertas, setAlertas]     = useState<any[]>([]);
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [rotacion, setRotacion]   = useState<any[]>([]);
  const [vacaciones, setVacaciones] = useState<any[]>([]);
  const [ausenciasHoy, setAusenciasHoy] = useState<number>(0);
  const [showAlertas, setShowAlertas] = useState(false);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats);
    fetch('/api/alertas?estado=Nueva').then(r => r.json()).then(d => setAlertas(Array.isArray(d) ? d.slice(0, 6) : []));
    fetch('/api/asistencia/resumen').then(r => r.json()).then(d => setAsistencia(Array.isArray(d) ? d.slice(0, 7).reverse() : []));
    fetch('/api/reportes/rotacion').then(r => r.json()).then(d => setRotacion(d.chart || []));
    fetch('/api/reportes/vacaciones').then(r => r.json()).then(d => {
      const proximas = (d.tomadas || []).filter((v: any) => v.fecha_inicio >= new Date().toISOString().slice(0, 10)).slice(0, 5);
      setVacaciones(proximas.length ? proximas : (d.alerta15 || []).slice(0, 5));
    });
    // Ausencias hoy
    fetch('/api/reportes/asistencia-dia-anterior').then(r => r.json()).then(d => {
      setAusenciasHoy(Number(d.resumen?.ausentes || 0));
    });
    fetch('/api/alertas/generar', { method: 'POST' }).catch(() => {});
  }, []);

  const nivelColor = (n: string) => ({
    critical: 'border-l-red-500 bg-red-50 text-red-700',
    warning:  'border-l-amber-500 bg-amber-50 text-amber-700',
    info:     'border-l-blue-500 bg-blue-50 text-blue-700',
  }[n] || 'border-l-slate-300 bg-slate-50 text-slate-600');

  const nivelIcon = (n: string) => n === 'critical' ? '🔴' : n === 'warning' ? '🟡' : '🔵';

  // KPI cards — top row
  const kpis = [
    { label: 'Empleados activos',   value: stats?.totalEmpleados || 0,            sub: 'Ver detalle', icon: Users,         col: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200',   tab: 'personnel' },
    { label: 'Vacantes pendientes', value: stats?.vacantesAbiertas || 0,          sub: 'Ver detalle', icon: Briefcase,     col: 'text-emerald-600',bg: 'bg-emerald-50',border: 'border-emerald-200',tab: 'recruitment' },
    { label: 'Ausencias hoy',       value: ausenciasHoy,                           sub: 'Ver detalle', icon: AlertTriangle, col: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200',  tab: 'reports' },
    { label: 'Capacitaciones',      value: stats?.capacitacionesCompletadas || 0, sub: 'Ver detalle', icon: GraduationCap, col: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', tab: 'development' },
  ];

  const tasa_ausentismo = asistencia.length
    ? Math.max(0, 100 - asistencia.reduce((sum: number, d: any) => sum + Number(d.pct || 100), 0) / asistencia.length).toFixed(1)
    : '—';
  const tasa_asistencia = asistencia.length
    ? (asistencia.reduce((sum: number, d: any) => sum + Number(d.pct || 100), 0) / asistencia.length).toFixed(1)
    : '—';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard principal</h2>
          <p className="text-sm text-slate-500">Bienvenida, Ana López · Coordinadora de RRHH</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            {new Date().toLocaleDateString('es-PA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <div className="relative">
            <button onClick={() => setShowAlertas(v => !v)}
              className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <Bell className="w-5 h-5 text-slate-500" />
              {alertas.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {alertas.length > 9 ? '9+' : alertas.length}
                </span>
              )}
            </button>
            {showAlertas && (
              <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800 text-sm">Alertas activas</h3>
                  <button onClick={() => setShowAlertas(false)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {alertas.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-6">Sin alertas nuevas ✓</p>
                  ) : alertas.map((a: any) => (
                    <div key={a.id} className={`px-4 py-3 ${nivelColor(a.nivel)}`}>
                      <p className="text-xs font-semibold">{nivelIcon(a.nivel)} {a.titulo}</p>
                      <p className="text-xs opacity-75 mt-0.5">{a.descripcion}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-slate-100">
                  <button onClick={() => onNavigate?.('reports')}
                    className="text-xs text-blue-600 hover:underline font-medium">
                    Ver todos en Reportes →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} onClick={() => onNavigate?.(k.tab)}
              className={`bg-white rounded-xl border ${k.border} p-5 shadow-sm cursor-pointer hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{k.label}</p>
                <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${k.col}`} />
                </div>
              </div>
              <p className={`text-3xl font-black ${k.col}`}>{k.value}</p>
              <p className="text-xs text-blue-500 mt-1 font-medium hover:underline">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5">
        {/* Tasa de ausentismo */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-800 text-sm">Tasa de ausentismo (%)</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Este mes</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div>
              <span className="text-2xl font-black text-amber-600">{tasa_ausentismo}%</span>
              <span className="text-xs text-slate-400 ml-1">ausentismo prom.</span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-lg font-bold text-emerald-600">{tasa_asistencia}%</span>
              <span className="text-xs text-slate-400 ml-1">asistencia</span>
            </div>
          </div>
          {(() => {
            // Convert asistencia pct → ausentismo real (100 - pct)
            const ausData = asistencia.map((d: any) => ({
              ...d,
              ausentismo: Math.max(0, parseFloat((100 - Number(d.pct || 100)).toFixed(1)))
            }));
            const maxAus = Math.max(...ausData.map((d: any) => d.ausentismo), 5);
            const yMax = Math.ceil(maxAus * 1.3 / 5) * 5; // round up to next 5%

            return (
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={ausData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradAus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" tickFormatter={(v: string) => v?.slice(5)}
                    axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis domain={[0, yMax]} axisLine={false} tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10 }} unit="%" />
                  <Tooltip
                    formatter={(v: any) => [`${v}%`, 'Ausentismo']}
                    labelFormatter={(l: string) => `Fecha: ${l}`}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="ausentismo" stroke="#f59e0b" strokeWidth={2.5}
                    fill="url(#gradAus)" dot={{ fill: '#f59e0b', r: 4 }} activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            );
          })()}
        </div>

        {/* Rotación mensual */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-slate-800 text-sm">Rotación mensual (ingresos vs salidas)</h3>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Últimos meses</span>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />Ingresos</span>
            <span className="flex items-center gap-1 text-xs text-red-500 font-semibold"><span className="w-2.5 h-2.5 rounded-sm bg-red-400 inline-block" />Salidas</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={rotacion.slice(-6)} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,.1)', fontSize: 12 }} />
              <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[3, 3, 0, 0]} />
              <Bar dataKey="salidas"  name="Salidas"  fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row: Próximas vacaciones + Avisos + Atajos */}
      <div className="grid grid-cols-3 gap-5">
        {/* Próximas vacaciones */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Próximas vacaciones</h3>
            <button onClick={() => onNavigate?.('reports')} className="text-xs text-blue-500 hover:underline font-medium">Ver todas</button>
          </div>
          {vacaciones.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">Sin vacaciones próximas</p>
          ) : (
            <div className="space-y-3">
              {vacaciones.map((v: any, i: number) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                    {(v.empleado || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{v.empleado}</p>
                    <p className="text-xs text-slate-400 truncate">{v.departamento}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">{v.fecha_inicio || '—'}</p>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                      {v.dias_solicitados || Number(v.dias_pendientes || 0).toFixed(0)} d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Avisos importantes (alertas) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-sm">Avisos importantes</h3>
            {alertas.length > 0 && <span className="text-xs bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">{alertas.length}</span>}
          </div>
          {alertas.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-2 text-slate-400">
              <CheckCircle className="w-8 h-8 text-emerald-300" />
              <p className="text-xs">Sin avisos pendientes</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {alertas.map((a: any) => (
                <div key={a.id} className={`border-l-4 rounded-r-lg p-2.5 ${nivelColor(a.nivel)}`}>
                  <div className="flex items-start gap-1.5">
                    <span className="text-xs shrink-0 mt-0.5">{nivelIcon(a.nivel)}</span>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{a.titulo}</p>
                      <p className="text-xs opacity-75 mt-0.5 line-clamp-2">{a.descripcion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Atajos rápidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Atajos rápidos</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: UserPlus,     label: 'Nuevo empleado',      col: 'text-blue-600',   bg: 'bg-blue-50',   tab: 'personnel' },
              { icon: CalendarCheck,label: 'Registrar asistencia', col: 'text-emerald-600',bg: 'bg-emerald-50',tab: 'control' },
              { icon: Umbrella,     label: 'Solicitar vacaciones', col: 'text-amber-600',  bg: 'bg-amber-50',  tab: 'personnel' },
              { icon: GraduationCap,label: 'Nueva capacitación',   col: 'text-purple-600', bg: 'bg-purple-50', tab: 'development' },
              { icon: Briefcase,    label: 'Nueva convocatoria',   col: 'text-sky-600',    bg: 'bg-sky-50',    tab: 'recruitment' },
              { icon: LogOut,       label: 'Registrar salida',     col: 'text-red-600',    bg: 'bg-red-50',    tab: 'exit' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <button key={s.label} onClick={() => onNavigate?.(s.tab)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl ${s.bg} hover:opacity-80 transition-opacity cursor-pointer border border-transparent hover:border-slate-200`}>
                  <div className={`w-9 h-9 rounded-lg bg-white shadow-sm flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${s.col}`} />
                  </div>
                  <span className="text-xs font-medium text-slate-700 text-center leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Empresa footer */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-xl p-5 text-white flex items-center gap-5">
        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-xl font-black shrink-0">T</div>
        <div className="flex-1">
          <h3 className="font-bold">TelcoPanamá S.A.</h3>
          <p className="text-blue-200 text-xs mt-0.5">Conectar a los panameños con tecnología de telecomunicaciones de clase mundial.</p>
        </div>
        <div className="text-right text-xs text-blue-300 space-y-0.5 shrink-0">
          <p>RUC: 155-789-1-2020</p>
          <p>Área Bancaria, Calle 50</p>
          <p>contacto@telcopanama.com.pa</p>
        </div>
      </div>
    </div>
  );
}
