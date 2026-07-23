import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Users, ChevronRight, CheckCircle2, Circle, Upload, TrendingUp, TrendingDown, Award, Clock, Calendar, BookOpen, Star, AlertTriangle, FileText } from 'lucide-react';

interface Empleado {
  id: number; codigo_empleado: string; nombre: string; apellido?: string;
  cedula?: string; correo_corporativo?: string; telefono?: string; genero?: string;
  fecha_ingreso?: string; tipo_contrato?: string; jornada?: string;
  salario_base?: number; estado: string; modalidad?: string;
  departamento_nombre?: string; cargo_titulo?: string; supervisor_nombre?: string;
  dias_pendientes?: number; dias_acumulados?: number; dias_tomados?: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const estadoBadge = (e: string) => ({
  'Activo':               'bg-emerald-100 text-emerald-700',
  'Inactivo':             'bg-slate-100 text-slate-500',
  'Vacaciones':           'bg-blue-100 text-blue-700',
  'Licencia':             'bg-amber-100 text-amber-700',
  'En periodo de prueba': 'bg-orange-100 text-orange-700',
  'Suspendido':           'bg-red-100 text-red-700',
}[e] || 'bg-slate-100 text-slate-500');

function ScoreBars({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  const col = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-blue-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-800">{value}/{max}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${col} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-sm ${i < Math.round(value) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
      <span className="text-xs text-slate-500 ml-1">{Number(value).toFixed(1)}</span>
    </div>
  );
}

// ── Tab: Asistencia ───────────────────────────────────────────────────────────
function TabAsistencia({ empId }: { empId: number }) {
  const [data, setData] = useState<any>(null);
  const [meses, setMeses] = useState('3');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/empleados/${empId}/asistencia?meses=${meses}`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [empId, meses]);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;
  if (!data || data.error) return (
    <div className="text-center py-12">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-slate-500 font-medium">No se pudieron cargar los datos de asistencia</p>
      <p className="text-slate-400 text-sm mt-1">{data?.error || 'Error de conexión'}</p>
    </div>
  );

  const { resumen = {}, registros = [] } = data;
  const total = Number(resumen.total_registros) || 0;
  const pctPresente = total ? Math.round((Number(resumen.presentes) / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Reporte de asistencia individual</h3>
        <select value={meses} onChange={e => setMeses(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none">
          <option value="1">Último mes</option>
          <option value="3">Últimos 3 meses</option>
          <option value="6">Últimos 6 meses</option>
          <option value="12">Último año</option>
        </select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Asistencia', value: `${pctPresente}%`, sub: `${resumen.presentes} días`, col: pctPresente >= 90 ? 'text-emerald-600 bg-emerald-50' : pctPresente >= 75 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50' },
          { label: 'Tardanzas', value: resumen.tardanzas, sub: `${resumen.tardanzas_injustificadas} injustificadas`, col: 'text-amber-600 bg-amber-50' },
          { label: 'Ausencias', value: resumen.ausentes, sub: `${resumen.ausencias_injustificadas} injustificadas`, col: 'text-red-600 bg-red-50' },
          { label: 'Prom. tardanza', value: resumen.promedio_tardanza ? `${resumen.promedio_tardanza} min` : '—', sub: 'cuando hay tardanza', col: 'text-purple-600 bg-purple-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 border border-slate-100 ${k.col.split(' ')[1]}`}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.col.split(' ')[0]}`}>{k.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Attendance bar visual */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Distribución del período</p>
        <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
          {[
            { key: 'presentes', label: 'Presentes', col: 'bg-emerald-400' },
            { key: 'tardanzas', label: 'Tardanzas', col: 'bg-amber-400' },
            { key: 'ausentes', label: 'Ausentes', col: 'bg-red-400' },
            { key: 'vacaciones', label: 'Vacaciones', col: 'bg-blue-400' },
          ].map(({ key, col }) => {
            const val = Number((resumen as any)[key] || 0);
            const pct = total ? (val / total) * 100 : 0;
            return pct > 0 ? <div key={key} className={`${col} transition-all`} style={{ width: `${pct}%` }} title={`${key}: ${val}`} /> : null;
          })}
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: 'Presente', col: 'bg-emerald-400' }, { label: 'Tardanza', col: 'bg-amber-400' },
            { label: 'Ausente', col: 'bg-red-400' }, { label: 'Vacaciones', col: 'bg-blue-400' },
          ].map(({ label, col }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${col}`} />
              <span className="text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Records table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Fecha', 'Entrada', 'Salida', 'Estado', 'Tardanza', 'Justificado'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {registros.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">Sin registros en este período</td></tr>
            )}
            {registros.slice(0, 30).map((r: any, i: number) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{String(r.fecha).slice(0, 10)}</td>
                <td className="px-4 py-2.5 text-sm text-slate-600">{r.hora_entrada || '—'}</td>
                <td className="px-4 py-2.5 text-sm text-slate-600">{r.hora_salida || '—'}</td>
                <td className="px-4 py-2.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    r.estado === 'Presente' ? 'bg-emerald-100 text-emerald-700' :
                    r.estado === 'Tardanza' ? 'bg-amber-100 text-amber-700' :
                    r.estado === 'Ausente'  ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-700'}`}>{r.estado}</span>
                </td>
                <td className="px-4 py-2.5 text-sm text-slate-500">{r.minutos_tardanza > 0 ? `${r.minutos_tardanza} min` : '—'}</td>
                <td className="px-4 py-2.5 text-sm">
                  {r.justificado ? <span className="text-emerald-600 font-medium">✓ Sí</span> : <span className="text-slate-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {registros.length > 30 && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 text-center">
            Mostrando 30 de {registros.length} registros
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tab: Vacaciones ───────────────────────────────────────────────────────────
function TabVacaciones({ empId }: { empId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/empleados/${empId}/vacaciones`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [empId]);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;
  if (!data || data.error) return (
    <div className="text-center py-12">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-slate-500 font-medium">No se pudieron cargar los datos de vacaciones</p>
    </div>
  );

  const { saldo = {}, solicitudes = [], costoVacaciones, aniosServicio, salarioDiario } = data;
  const pendientes = Number(saldo.dias_pendientes || 0);
  const acumulados = Number(saldo.dias_acumulados || 0);
  const tomados = Number(saldo.dias_tomados || 0);
  const pctUsado = acumulados > 0 ? Math.round((tomados / acumulados) * 100) : 0;

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-slate-800">Balance de vacaciones y permisos</h3>

      {/* Balance cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
          <p className="text-sm text-blue-600 font-medium">Días disponibles</p>
          <p className="text-4xl font-bold text-blue-700 mt-1">{pendientes}</p>
          <p className="text-xs text-blue-500 mt-1">de {acumulados} acumulados</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
          <p className="text-sm text-slate-600 font-medium">Días tomados</p>
          <p className="text-4xl font-bold text-slate-700 mt-1">{tomados}</p>
          <div className="mt-2 h-1.5 bg-slate-200 rounded-full">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pctUsado}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1">{pctUsado}% del total acumulado</p>
        </div>
        <div className={`rounded-xl p-5 border ${costoVacaciones ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-sm font-medium ${costoVacaciones ? 'text-emerald-600' : 'text-slate-600'}`}>Costo estimado vacaciones</p>
          {costoVacaciones ? (
            <>
              <p className="text-3xl font-bold text-emerald-700 mt-1">${Number(costoVacaciones).toLocaleString()}</p>
              <p className="text-xs text-emerald-500 mt-1">${salarioDiario}/día × {pendientes} días</p>
            </>
          ) : (
            <p className="text-xl font-bold text-slate-400 mt-2">Sin datos salariales</p>
          )}
        </div>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Años de servicio', value: aniosServicio !== null ? `${aniosServicio} año${aniosServicio !== 1 ? 's' : ''}` : '—', icon: '🏆' },
          { label: 'Salario diario', value: salarioDiario ? `$${salarioDiario}` : '—', icon: '💰' },
          { label: 'Tasa de goce', value: `${pctUsado}%`, icon: '📊' },
        ].map(m => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <span className="text-2xl">{m.icon}</span>
            <div>
              <p className="text-xs text-slate-500">{m.label}</p>
              <p className="text-lg font-bold text-slate-800">{m.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Solicitudes */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700">Historial de solicitudes</h4>
        </div>
        {solicitudes.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">Sin solicitudes registradas</div>
        ) : (
          <table className="w-full">
            <thead><tr className="border-b border-slate-100">
              {['Tipo', 'Desde', 'Hasta', 'Días', 'Motivo', 'Estado'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {solicitudes.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">{s.tipo}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{String(s.fecha_inicio).slice(0, 10)}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{String(s.fecha_fin).slice(0, 10)}</td>
                  <td className="px-4 py-2.5 text-sm font-semibold text-blue-600">{s.dias_solicitados}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500 max-w-xs truncate">{s.motivo || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      s.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                      s.estado === 'Rechazado' ? 'bg-red-100 text-red-600' :
                      s.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                    }`}>{s.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Capacitaciones ────────────────────────────────────────────────────────
function TabCapacitaciones({ empId }: { empId: number }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/empleados/${empId}/capacitaciones`)
      .then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, [empId]);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;
  if (!data || data.error) return (
    <div className="text-center py-12">
      <div className="text-3xl mb-3">⚠️</div>
      <p className="text-slate-500 font-medium">No se pudieron cargar las capacitaciones</p>
    </div>
  );

  const { capacitaciones = [], resumen = {} } = data;

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-slate-800">Historial de capacitaciones</h3>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total inscritas', value: resumen.total, col: 'text-blue-600 bg-blue-50' },
          { label: 'Completadas', value: resumen.completadas, col: 'text-emerald-600 bg-emerald-50' },
          { label: 'Aprobadas (≥71)', value: resumen.aprobadas ?? '—', col: 'text-purple-600 bg-purple-50' },
          { label: 'Nota promedio', value: resumen.notaPromedio ? `${resumen.notaPromedio}/100` : '—', col: 'text-amber-600 bg-amber-50' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl p-4 border border-slate-100 ${k.col.split(' ')[1]}`}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={`text-2xl font-bold mt-1 ${k.col.split(' ')[0]}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {capacitaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
          <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin capacitaciones registradas</p>
          <p className="text-slate-400 text-sm mt-1">Este empleado no ha participado en ninguna capacitación</p>
        </div>
      ) : (
        <div className="space-y-3">
          {capacitaciones.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-semibold text-slate-800">{c.titulo}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      c.estado_participante === 'Completado' ? 'bg-emerald-100 text-emerald-700' :
                      c.estado_participante === 'Inscrito'   ? 'bg-blue-100 text-blue-700' :
                      c.estado_participante === 'Abandono'   ? 'bg-red-100 text-red-600' :
                      'bg-slate-100 text-slate-500'}`}>{c.estado_participante}</span>
                    {c.aprobado && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">✓ Aprobado</span>}
                  </div>
                  <div className="flex gap-4 mt-1.5 flex-wrap">
                    <span className="text-xs text-slate-500">📅 {String(c.fecha_inicio).slice(0, 10)} – {String(c.fecha_fin || c.fecha_inicio).slice(0, 10)}</span>
                    <span className="text-xs text-slate-500">⏱ {c.duracion_horas}h</span>
                    <span className="text-xs text-slate-500">📋 {c.tipo}</span>
                    <span className="text-xs text-slate-500">🏢 {c.modalidad}</span>
                    {c.proveedor && <span className="text-xs text-slate-500">🎓 {c.proveedor}</span>}
                  </div>
                  {c.observaciones && (
                    <p className="text-xs text-slate-500 mt-2 italic">"{c.observaciones}"</p>
                  )}
                </div>
                {c.nota_evaluacion !== null && (
                  <div className="text-center shrink-0 ml-4">
                    <div className={`text-2xl font-bold ${Number(c.nota_evaluacion) >= 71 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {c.nota_evaluacion}
                    </div>
                    <div className="text-xs text-slate-400">/100</div>
                    <div className={`text-xs font-semibold mt-0.5 ${Number(c.nota_evaluacion) >= 71 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {Number(c.nota_evaluacion) >= 71 ? '✓ Aprobado' : '✗ Reprobado'}
                    </div>
                  </div>
                )}
              </div>
              {c.fecha_completado && (
                <p className="text-xs text-emerald-600 mt-2">✅ Completado el {String(c.fecha_completado).slice(0, 10)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Evaluaciones ─────────────────────────────────────────────────────────
function TabEvaluaciones({ empId }: { empId: number }) {
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/empleados/${empId}/evaluaciones`)
      .then(r => r.json()).then(d => { setEvaluaciones(Array.isArray(d) ? d : []); setLoading(false); });
  }, [empId]);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;

  const competencias = [
    { key: 'puntaje_liderazgo', label: 'Liderazgo' },
    { key: 'puntaje_trabajo_equipo', label: 'Trabajo en equipo' },
    { key: 'puntaje_comunicacion', label: 'Comunicación' },
    { key: 'puntaje_iniciativa', label: 'Iniciativa' },
    { key: 'puntaje_tecnico', label: 'Habilidad técnica' },
    { key: 'puntaje_cumplimiento', label: 'Cumplimiento' },
  ];

  const latest = evaluaciones[0];
  const promedio = evaluaciones.length
    ? (evaluaciones.reduce((s, e) => s + Number(e.promedio || 0), 0) / evaluaciones.length).toFixed(2)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Evaluaciones de desempeño</h3>
        {promedio && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
                Promedio histórico: {promedio}/5 · <span className={Number(promedio)*20>=90?'text-emerald-600':Number(promedio)*20>=70?'text-blue-600':Number(promedio)*20>=60?'text-amber-600':'text-red-600'}>{(Number(promedio)*20).toFixed(0)}%</span>
              </span>
          </div>
        )}
      </div>

      {evaluaciones.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
          <Star className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Sin evaluaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Latest evaluation detail */}
          {latest && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-900 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white">Última evaluación — {latest.anio}{latest.cuatrimestre ? ` C${latest.cuatrimestre}` : ''}</h4>
                  <p className="text-slate-400 text-xs mt-0.5">
                    {latest.tipo} · Evaluador: {latest.evaluador_nombre || 'Sistema'} · {String(latest.fecha).slice(0, 10)}
                  </p>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${Number(latest.promedio) >= 4 ? 'text-emerald-400' : Number(latest.promedio) >= 3 ? 'text-blue-400' : Number(latest.promedio) >= 2 ? 'text-amber-400' : 'text-red-400'}`}>
                    {Number(latest.promedio).toFixed(1)}
                  </div>
                  <div className="text-slate-400 text-xs">/5.0</div>
                  <div className={`text-sm font-bold mt-1 ${Number(latest.promedio)*20 >= 90 ? 'text-emerald-400' : Number(latest.promedio)*20 >= 70 ? 'text-blue-400' : Number(latest.promedio)*20 >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                    {(Number(latest.promedio)*20).toFixed(0)}%
                  </div>
                  <div className="text-slate-500 text-xs">/100</div>
                </div>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {competencias.map(({ key, label }) => (
                  latest[key] != null ? (
                    <ScoreBars key={key} label={label} value={Number(latest[key])} />
                  ) : null
                ))}
              </div>
              {(latest.proyectos_asignados > 0) && (
                <div className="px-5 pb-5">
                  <div className="bg-slate-50 rounded-lg p-3 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Proyectos asignados</p>
                      <p className="text-xl font-bold text-slate-800">{latest.proyectos_asignados}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">Entregados</p>
                      <p className="text-xl font-bold text-emerald-600">{latest.proyectos_entregados}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-500">A tiempo</p>
                      <p className="text-xl font-bold text-blue-600">{latest.proyectos_a_tiempo}</p>
                    </div>
                  </div>
                </div>
              )}
              {(latest.observaciones || latest.plan_mejora) && (
                <div className="px-5 pb-5 space-y-3">
                  {latest.observaciones && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-blue-700 mb-1">📝 Observaciones del evaluador</p>
                      <p className="text-sm text-slate-700">{latest.observaciones}</p>
                    </div>
                  )}
                  {latest.plan_mejora && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-amber-700 mb-1">📋 Plan de mejora</p>
                      <p className="text-sm text-slate-700">{latest.plan_mejora}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Historical evaluations */}
          {evaluaciones.length > 1 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700">Historial de evaluaciones</h4>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-slate-100">
                  {['Período', 'Tipo', 'Promedio', 'Liderazgo', 'Equipo', 'Tecnico', 'Evaluador', 'Fecha'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {evaluaciones.map((e: any) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-sm font-semibold text-slate-800">{e.anio}{e.cuatrimestre ? ` C${e.cuatrimestre}` : ''}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{e.tipo}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-sm font-bold ${Number(e.promedio) >= 4 ? 'text-emerald-600' : Number(e.promedio) >= 3 ? 'text-blue-600' : Number(e.promedio) >= 2 ? 'text-amber-600' : 'text-red-600'}`}>
                            {Number(e.promedio).toFixed(1)}
                          </span>
                          <div className="flex text-xs">
                            {Array.from({ length: 5 }).map((_, i) => <span key={i} className={i < Math.round(Number(e.promedio)) ? 'text-amber-400' : 'text-slate-200'}>★</span>)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{e.puntaje_liderazgo || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{e.puntaje_trabajo_equipo || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{e.puntaje_tecnico || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{e.evaluador_nombre || '—'}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-400">{String(e.fecha).slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Historial ────────────────────────────────────────────────────────────
function TabHistorial({ empId, empleado }: { empId: number; empleado: Empleado }) {
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');

  useEffect(() => {
    fetch(`/api/empleados/${empId}/historial`)
      .then(r => r.json()).then(d => { setHistorial(Array.isArray(d) ? d : []); setLoading(false); });
  }, [empId]);

  if (loading) return <div className="text-center py-12 text-slate-400">Cargando...</div>;

  const TIPOS: Record<string, { icon: string; label: string; col: string; bg: string }> = {
    evaluacion:    { icon: '⭐', label: 'Evaluación', col: 'text-amber-700', bg: 'bg-amber-50 border-amber-100' },
    capacitacion:  { icon: '📚', label: 'Capacitación', col: 'text-blue-700', bg: 'bg-blue-50 border-blue-100' },
    ausencia:      { icon: '⚠️', label: 'Ausencia / Tardanza', col: 'text-red-600', bg: 'bg-red-50 border-red-100' },
    vacacion:      { icon: '🏖️', label: 'Permiso / Vacación', col: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-100' },
  };

  const filtered = filter === 'todos' ? historial : historial.filter(h => h.tipo === filter);

  // Stats
  const stats = {
    evaluaciones: historial.filter(h => h.tipo === 'evaluacion').length,
    capacitaciones: historial.filter(h => h.tipo === 'capacitacion').length,
    ausencias: historial.filter(h => h.tipo === 'ausencia').length,
    permisos: historial.filter(h => h.tipo === 'vacacion').length,
  };

  const avgEval = historial.filter(h => h.tipo === 'evaluacion' && h.valor).length
    ? (historial.filter(h => h.tipo === 'evaluacion').reduce((s, h) => s + Number(h.valor || 0), 0) / historial.filter(h => h.tipo === 'evaluacion').length).toFixed(2)
    : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Expediente completo del trabajador</h3>
        <span className="text-xs text-slate-400">{historial.length} eventos registrados</span>
      </div>

      {/* Summary panel */}
      <div className="bg-slate-900 rounded-xl p-5 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold shrink-0">
            {empleado.nombre[0]}{empleado.apellido?.[0] || ''}
          </div>
          <div>
            <p className="font-bold">{empleado.nombre} {empleado.apellido}</p>
            <p className="text-slate-400 text-sm">{empleado.cargo_titulo} · {empleado.departamento_nombre}</p>
          </div>
          {avgEval && (
            <div className="ml-auto text-center">
              <p className="text-xs text-slate-400">Desempeño promedio</p>
              <p className={`text-2xl font-bold ${Number(avgEval) >= 4 ? 'text-emerald-400' : Number(avgEval) >= 3 ? 'text-blue-400' : 'text-amber-400'}`}>{avgEval}/5</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Evaluaciones', value: stats.evaluaciones, icon: '⭐' },
            { label: 'Capacitaciones', value: stats.capacitaciones, icon: '📚' },
            { label: 'Ausencias / Tardanzas', value: stats.ausencias, icon: '⚠️' },
            { label: 'Permisos / Vacaciones', value: stats.permisos, icon: '🏖️' },
          ].map(m => (
            <div key={m.label} className="bg-white/10 rounded-lg p-3 text-center">
              <p className="text-lg">{m.icon}</p>
              <p className="text-xl font-bold text-white">{m.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {[['todos', 'Todos'], ['evaluacion', '⭐ Evaluaciones'], ['capacitacion', '📚 Capacitaciones'], ['ausencia', '⚠️ Ausencias'], ['vacacion', '🏖️ Permisos']].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === v ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-10 text-center text-slate-400 text-sm">
          Sin eventos de este tipo
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />
          <div className="space-y-3 pl-14">
            {filtered.map((h: any, i: number) => {
              const tipo = TIPOS[h.tipo] || { icon: '📌', label: h.tipo, col: 'text-slate-600', bg: 'bg-slate-50 border-slate-100' };
              const isPositive = h.tipo === 'evaluacion' && Number(h.valor) >= 4;
              const isNegative = h.tipo === 'ausencia' || (h.tipo === 'evaluacion' && Number(h.valor) < 2.5);
              return (
                <div key={i} className="relative">
                  {/* Timeline dot */}
                  <div className={`absolute -left-10 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs shadow-sm
                    ${isPositive ? 'bg-emerald-400' : isNegative ? 'bg-red-400' : 'bg-blue-400'}`}>
                    {isPositive ? '✓' : isNegative ? '!' : '·'}
                  </div>
                  <div className={`border rounded-xl p-3.5 ${tipo.bg}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{tipo.icon}</span>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${tipo.col}`}>{tipo.label}</span>
                          {h.tipo === 'evaluacion' && h.valor && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${Number(h.valor) >= 4 ? 'bg-emerald-100 text-emerald-700' : Number(h.valor) >= 3 ? 'bg-blue-100 text-blue-700' : Number(h.valor) >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {Number(h.valor).toFixed(1)}/5 ★
                            </span>
                          )}
                          {h.tipo === 'capacitacion' && h.valor && (
                            <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700">{h.valor}/100</span>
                          )}
                          {h.tipo === 'ausencia' && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${h.descripcion === 'Tardanza' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                              {h.descripcion}
                            </span>
                          )}
                          {h.tipo === 'vacacion' && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${h.valor === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : h.valor === 'Rechazado' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                              {h.valor}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 mt-1 font-medium">{h.descripcion}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 mt-0.5">{h.fecha ? String(h.fecha).slice(0, 10) : '—'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main EmployeesView ────────────────────────────────────────────────────────
export default function EmployeesView({ deepLink, onDeepLinkConsumed }: { deepLink?: { empId?: number; tab?: string } | null; onDeepLinkConsumed?: () => void }) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [cargos, setCargos] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totales, setTotales] = useState<any>({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selected, setSelected] = useState<Empleado | null>(null);
  const [activeTab, setActiveTab] = useState('datos');
  const [induccion, setInduccion] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formTab, setFormTab] = useState<'personal' | 'laboral' | 'emergencia'>('personal');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const emptyForm = {
    nombre: '', apellido: '', cedula: '', pasaporte: '',
    correo_corporativo: '', correo_personal: '', telefono: '', telefono_emergencia: '',
    contacto_emergencia: '', fecha_nacimiento: '', genero: '', estado_civil: '', nacionalidad: 'Panamena',
    id_departamento: '', id_cargo: '', id_supervisor: '', fecha_ingreso: '',
    salario_base: '', tipo_contrato: 'Indefinido', jornada: 'Completa',
    estado: 'Activo', modalidad: 'Presencial',
  };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => { cargarDatos(); }, []);
  useEffect(() => { setPage(1); }, [search, filterDept, filterEstado]);
  useEffect(() => { cargarEmpleados(); }, [search, filterDept, filterEstado, page]);

  // Deep link: auto-open specific employee profile at specific tab
  useEffect(() => {
    if (!deepLink?.empId) return;
    fetch(`/api/empleados/${deepLink.empId}`)
      .then(r => r.json())
      .then(async emp => {
        if (emp.id) {
          const ind = await fetch(`/api/empleados/${emp.id}/induccion`).then(r => r.json()).catch(() => []);
          setInduccion(Array.isArray(ind) ? ind : []);
          setSelected(emp);
          setActiveTab(deepLink.tab || 'asistencia');
          onDeepLinkConsumed?.();
        }
      })
      .catch(() => {});
  }, [deepLink]);

  async function cargarDatos() {
    const [d, c, t] = await Promise.all([
      fetch('/api/departamentos').then(r => r.json()),
      fetch('/api/cargos').then(r => r.json()).catch(() => []),
      fetch('/api/stats').then(r => r.json()).catch(() => ({})),
    ]);
    setDepartamentos(Array.isArray(d) ? d : []);
    setCargos(Array.isArray(c) ? c : []);
    setTotales({
      total: t.totalEmpleados,
      activos: t.totalEmpleados,  // stats already filters activos
      vacaciones: null,
    });
    // Stats now has the full breakdown
    setTotales({
      total:      t.totalEmpleados,       // Activo + Vacaciones
      activos:    t.empleadosActivos ?? 0,
      vacaciones: t.empleadosVacaciones ?? 0,
      inactivos:  t.empleadosInactivos ?? 0,
    });
    cargarEmpleados();
  }

  async function cargarEmpleados() {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (filterDept) p.set('dept', filterDept);
    if (filterEstado) p.set('estado', filterEstado);
    p.set('limit', String(PAGE_SIZE));
    p.set('page', String(page));
    const r = await fetch(`/api/empleados?${p}`);
    const d = await r.json();
    setEmpleados(d.data || []);
    setTotal(d.total || 0);
    setLoading(false);
  }

  async function abrirPerfil(emp: Empleado) {
    setSelected(emp); setActiveTab('datos');
    const r = await fetch(`/api/empleados/${emp.id}/induccion`);
    setInduccion(await r.json());
  }

  async function toggleInduccion(item: any) {
    if (!selected) return;
    await fetch(`/api/empleados/${selected.id}/induccion/${item.id_item}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completado: !item.completado })
    });
    const r = await fetch(`/api/empleados/${selected.id}/induccion`);
    setInduccion(await r.json());
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.nombre.trim()) e.nombre = 'Requerido';
    if (!form.apellido.trim()) e.apellido = 'Requerido';
    if (!form.cedula.trim()) e.cedula = 'Requerido';
    if (!form.id_departamento) e.id_departamento = 'Requerido';
    if (!form.fecha_ingreso) e.fecha_ingreso = 'Requerido';
    if (!form.salario_base) e.salario_base = 'Requerido';
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function guardarEmpleado(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) { setFormTab('personal'); return; }
    const r = await fetch('/api/empleados', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    if (!r.ok) { const d = await r.json(); setMsg('Error: ' + d.error); return; }
    setShowModal(false); setForm(emptyForm); setFormErrors({});
    setMsg('Empleado registrado correctamente.'); setTimeout(() => setMsg(''), 4000);
    cargarEmpleados();
  }

  const indCompletados = induccion.filter(i => i.completado).length;
  const indPct = induccion.length ? Math.round(indCompletados / induccion.length * 100) : 0;

  const TABS = [
    { id: 'datos', label: 'Datos generales' },
    { id: 'induccion', label: `Inducción (${indPct}%)` },
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'vacaciones', label: 'Vacaciones' },
    { id: 'capacitaciones', label: 'Capacitaciones' },
    { id: 'evaluaciones', label: 'Evaluaciones' },
    { id: 'historial', label: 'Historial' },
  ];

  // ── PROFILE VIEW ─────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <button onClick={() => setSelected(null)} className="hover:text-blue-600">← Personal</button>
          <span>›</span><span className="text-slate-700">Empleados</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {selected.nombre[0]}{selected.apellido?.split(' ')[0]?.[0] || ''}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{selected.nombre} {selected.apellido}</h2>
            <p className="text-slate-500 text-sm">{selected.cargo_titulo || '—'} · {selected.departamento_nombre || '—'}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(selected.estado)}`}>{selected.estado}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{selected.codigo_empleado}</span>
              {selected.modalidad && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">{selected.modalidad}</span>}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500 space-y-1">
            <p>Ingreso: <strong>{String(selected.fecha_ingreso || '').slice(0, 10)}</strong></p>
            <p>Contrato: <strong>{selected.tipo_contrato}</strong></p>
            <p>Salario: <strong>${Number(selected.salario_base || 0).toLocaleString()}</strong></p>
            {selected.dias_pendientes != null && <p>Vacaciones: <strong className="text-blue-600">{selected.dias_pendientes} días</strong></p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-200 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors
                ${activeTab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {activeTab === 'datos' && (
            <div className="grid grid-cols-3 gap-x-8 gap-y-5">
              {[
                ['Cédula', String(selected.cedula || '—')],
                ['Correo corporativo', String(selected.correo_corporativo || '—')],
                ['Teléfono', String(selected.telefono || '—')],
                ['Departamento', String(selected.departamento_nombre || '—')],
                ['Cargo', String(selected.cargo_titulo || '—')],
                ['Supervisor', String(selected.supervisor_nombre || '—')],
                ['Jornada', String(selected.jornada || '—')],
                ['Modalidad', String(selected.modalidad || '—')],
                ['Tipo contrato', String(selected.tipo_contrato || '—')],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{k}</p>
                  <p className="text-sm font-medium text-slate-800">{v}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'induccion' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-slate-800">Checklist de inducción</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Proceso formal de bienvenida al nuevo colaborador</p>
                </div>
                <span className={`text-2xl font-bold ${indPct === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>{indCompletados}/{induccion.length}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${indPct === 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${indPct}%` }} />
              </div>
              <div className="space-y-2">
                {induccion.map((item: any) => (
                  <div key={item.id_item} onClick={() => toggleInduccion(item)}
                    className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border transition-all
                      ${item.completado ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                    {item.completado
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${item.completado ? 'text-emerald-800' : 'text-slate-700'}`}>{item.nombre}</p>
                      {item.completado && item.fecha_completado && <p className="text-xs text-emerald-600">Completado: {item.fecha_completado}</p>}
                    </div>
                    {!item.completado && <span className="text-xs text-slate-400">Clic para marcar</span>}
                  </div>
                ))}
              </div>
              {indPct === 100 && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center text-emerald-700 font-semibold text-sm">✅ Proceso de inducción completado</div>}
            </div>
          )}

          {activeTab === 'asistencia' && <TabAsistencia empId={selected.id} />}
          {activeTab === 'vacaciones' && <TabVacaciones empId={selected.id} />}
          {activeTab === 'capacitaciones' && <TabCapacitaciones empId={selected.id} />}
          {activeTab === 'evaluaciones' && <TabEvaluaciones empId={selected.id} />}
          {activeTab === 'historial' && <TabHistorial empId={selected.id} empleado={selected} />}
        </div>
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Directorio de Personal</h2>
          <p className="text-sm text-slate-500 mt-1">Gestión de empleados, ingresos y estructura organizacional.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuevo Ingreso
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Personal vigente', value: totales.total ?? total, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Activos', value: totales.activos ?? '—', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'En vacaciones', value: totales.vacaciones ?? '—', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Departamentos', value: departamentos.length, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-slate-100`}>
            <p className="text-xs text-slate-500 font-medium">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color} mt-1`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empleado..."
            className="flex-1 text-sm outline-none" />
        </div>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">Todos los departamentos</option>
          {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
          <option value="">Todos los estados</option>
          {['Activo', 'Inactivo', 'Vacaciones', 'Licencia', 'En periodo de prueba'].map(e => <option key={e}>{e}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[35%]">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[20%]">Cargo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[22%]">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[13%]">Estado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[10%]">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-sm">Cargando...</td></tr>}
            {!loading && empleados.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-12 text-center">
                <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No hay empleados registrados.</p>
              </td></tr>
            )}
            {empleados.map(emp => (
              <tr key={emp.id} onClick={() => abrirPerfil(emp)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {emp.nombre[0]}{emp.apellido?.split(' ')[0]?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{emp.nombre} {emp.apellido}</p>
                      <p className="text-xs text-slate-400">{emp.codigo_empleado}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600 truncate">{emp.cargo_titulo || '—'}</td>
                <td className="px-4 py-3 text-sm text-slate-600 truncate">{emp.departamento_nombre || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(emp.estado)}`}>{emp.estado}</span></td>
                <td className="px-4 py-3">
                  <button className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Ver perfil <ChevronRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Mostrando {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, total)} de <strong>{total}</strong> empleados
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors">
              ← Anterior
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(total/PAGE_SIZE) }, (_, i) => i+1)
                .filter(p => p === 1 || p === Math.ceil(total/PAGE_SIZE) || Math.abs(p-page) <= 2)
                .reduce((acc: (number|string)[], p, i, arr) => {
                  if (i > 0 && (p as number) - (arr[i-1] as number) > 1) acc.push('…');
                  acc.push(p); return acc;
                }, [])
                .map((p, i) => p === '…'
                  ? <span key={`e${i}`} className="px-1 text-slate-400 text-xs">…</span>
                  : <button key={p} onClick={() => setPage(Number(p))}
                      className={`w-8 h-7 text-xs rounded-lg font-medium transition-colors
                        ${page === p ? 'bg-blue-600 text-white' : 'border border-slate-200 hover:bg-slate-50 text-slate-600'}`}>
                      {p}
                    </button>
                )}
            </div>
            <button onClick={() => setPage(p => Math.min(Math.ceil(total/PAGE_SIZE), p+1))}
              disabled={page >= Math.ceil(total/PAGE_SIZE)}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors">
              Siguiente →
            </button>
          </div>
          <span className="text-xs text-slate-400">Clic en fila para ver perfil</span>
        </div>
      </div>

      {/* Modal nuevo ingreso */}
      {showModal && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Registro de empleado</h3>
                <p className="text-xs text-slate-400 mt-0.5">Complete la información del nuevo empleado</p>
              </div>
              <button onClick={() => { setShowModal(false); setFormErrors({}); setFormTab('personal'); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="flex border-b border-slate-200 px-5">
              {[['personal', '👤 Datos personales'], ['laboral', '💼 Información laboral'], ['emergencia', '📞 Contacto y emergencias']].map(([id, lbl]) => (
                <button key={id} onClick={() => setFormTab(id as any)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${formTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                  {lbl}
                </button>
              ))}
            </div>
            <form onSubmit={guardarEmpleado}>
              <div className="p-6">
                {formTab === 'personal' && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      {[['nombre', 'Nombres *'], ['apellido', 'Apellidos *'], ['cedula', 'Número de cédula *']].map(([k, l]) => (
                        <div key={k}>
                          <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                          <input required value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })}
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${formErrors[k] ? 'border-red-400' : 'border-slate-200'}`} />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de nacimiento</label>
                        <input type="date" value={form.fecha_nacimiento} onChange={e => setForm({ ...form, fecha_nacimiento: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Género</label>
                        <select value={form.genero} onChange={e => setForm({ ...form, genero: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                          <option value="">Seleccione</option>
                          {['Masculino', 'Femenino', 'Otro'].map(g => <option key={g}>{g}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Correo corporativo</label>
                        <input type="email" value={form.correo_corporativo} onChange={e => setForm({ ...form, correo_corporativo: e.target.value })}
                          placeholder="nombre@telcopanama.com.pa" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                        <input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-700 mb-2">📋 Regla 1.1.7 — Campos obligatorios</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[['nombre', 'Nombres'], ['apellido', 'Apellidos'], ['cedula', 'Cédula'], ['id_departamento', 'Departamento'], ['fecha_ingreso', 'Fecha de ingreso'], ['salario_base', 'Salario base']].map(([k, l]) => (
                          <div key={k} className="flex items-center gap-2 text-xs">
                            <span className={(form as any)[k] ? 'text-emerald-600' : 'text-slate-300'}>{(form as any)[k] ? '✓' : '○'}</span>
                            <span className={(form as any)[k] ? 'text-slate-700' : 'text-slate-400'}>{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {formTab === 'laboral' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Departamento *</label>
                        <select required value={form.id_departamento} onChange={e => setForm({ ...form, id_departamento: e.target.value })}
                          className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${formErrors.id_departamento ? 'border-red-400' : 'border-slate-200'}`}>
                          <option value="">Seleccione</option>
                          {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Cargo</label>
                        <select value={form.id_cargo} onChange={e => setForm({ ...form, id_cargo: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                          <option value="">Seleccione cargo</option>
                          {cargos.filter((c: any) => !form.id_departamento || c.id_departamento === Number(form.id_departamento)).map((c: any) => (
                            <option key={c.id} value={c.id}>{c.titulo}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de ingreso *</label>
                        <input required type="date" value={form.fecha_ingreso} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de contrato *</label>
                        <select value={form.tipo_contrato} onChange={e => setForm({ ...form, tipo_contrato: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                          {['Indefinido', 'Definido', 'Por obra', 'Temporal', 'Pasantia'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Salario base (USD) *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                          <input required type="number" value={form.salario_base} onChange={e => setForm({ ...form, salario_base: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-sm outline-none" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Jornada</label>
                        <select value={form.jornada} onChange={e => setForm({ ...form, jornada: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                          {['Completa', 'Medio tiempo', 'Flexible', 'Nocturna'].map(j => <option key={j}>{j}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Modalidad</label>
                        <select value={form.modalidad} onChange={e => setForm({ ...form, modalidad: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                          {['Presencial', 'Hibrido', 'Remoto'].map(m => <option key={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-2">Estado del registro</p>
                      <div className="flex gap-4">
                        {['Activo', 'En periodo de prueba', 'Inactivo'].map(st => (
                          <label key={st} className="flex items-center gap-2 cursor-pointer text-sm">
                            <input type="radio" checked={form.estado === st} onChange={() => setForm({ ...form, estado: st })} className="accent-blue-600" />{st}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {formTab === 'emergencia' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Contacto de emergencia</label>
                      <input value={form.contacto_emergencia} onChange={e => setForm({ ...form, contacto_emergencia: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono de emergencia</label>
                      <input value={form.telefono_emergencia} onChange={e => setForm({ ...form, telefono_emergencia: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    </div>
                  </div>
                )}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {(['personal', 'laboral', 'emergencia'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setFormTab(t)}
                      className={`w-2 h-2 rounded-full ${formTab === t ? 'bg-blue-600' : 'bg-slate-200'}`} />
                  ))}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setShowModal(false); setFormErrors({}); setFormTab('personal'); }}
                    className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium">Cancelar</button>
                  {formTab !== 'emergencia' && (
                    <button type="button" onClick={() => setFormTab(formTab === 'personal' ? 'laboral' : 'emergencia')}
                      className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">Siguiente →</button>
                  )}
                  <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Guardar empleado</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
