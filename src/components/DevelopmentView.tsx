import React, { useState, useEffect } from 'react';
import { Plus, X, Users, Edit2 } from 'lucide-react';

function StarInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(n => (
        <button key={n} type="button" onClick={() => onChange(String(n))}
          className={`text-xl transition-colors ${Number(value) >= n ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'}`}>★</button>
      ))}
      <span className="text-xs text-slate-500 ml-1 self-center">{value || '—'}/5</span>
    </div>
  );
}

const ESTADOS_EVAL = ['Borrador', 'Firmado', 'Cerrado'] as const;
const estadoColor = (e: string) => ({
  Borrador: 'bg-slate-100 text-slate-600',
  Firmado:  'bg-blue-100 text-blue-700',
  Cerrado:  'bg-emerald-100 text-emerald-700',
}[e] || 'bg-slate-100 text-slate-500');

const scoreColor = (s: number) => s >= 4 ? 'text-emerald-600' : s >= 3 ? 'text-blue-600' : s >= 2 ? 'text-amber-600' : 'text-red-600';

const emptyEvalForm = () => ({
  id_empleado: '', anio: String(new Date().getFullYear()), cuatrimestre: '1',
  tipo: 'Cuatrimestral', puntaje_liderazgo: '', puntaje_trabajo_equipo: '',
  puntaje_comunicacion: '', puntaje_iniciativa: '', puntaje_tecnico: '',
  puntaje_cumplimiento: '', proyectos_asignados: '', proyectos_entregados: '',
  comentarios: '', plan_mejora: '', estado: 'Borrador',
  firma_empleado: false, firma_supervisor: false,
});

export default function DevelopmentView() {
  const [tab, setTab] = useState<'capacitaciones' | 'evaluaciones'>('capacitaciones');
  const [caps, setCaps] = useState<any[]>([]);
  const [evals, setEvals] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [selectedCap, setSelectedCap] = useState<any>(null);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [showCapModal, setShowCapModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showPartModal, setShowPartModal] = useState(false);
  const [editCap, setEditCap] = useState<any>(null);
  const [editEval, setEditEval] = useState<any>(null); // null = nueva, obj = editar
  const [msg, setMsg] = useState('');
  const [showPlanMejoraModal, setShowPlanMejoraModal] = useState(false);
  const [planMejoraTarget, setPlanMejoraTarget] = useState<any>(null);
  const [planMejoraText, setPlanMejoraText] = useState('');

  const [capForm, setCapForm] = useState({
    titulo: '', descripcion: '', proveedor: '', tipo: 'Interna', modalidad: 'Presencial',
    duracion_horas: '', costo: '', fecha_inicio: '', fecha_fin: '', max_participantes: '', id_departamento: ''
  });
  const [evalForm, setEvalForm] = useState(emptyEvalForm());
  const [partEmpIds, setPartEmpIds] = useState<string[]>([]);
  const [partSearch, setPartSearch] = useState('');
  const [partBulkDept, setPartBulkDept] = useState('');
  const [partBulkLoading, setPartBulkLoading] = useState(false);

  useEffect(() => {
    fetch('/api/empleados?limit=300').then(r => r.json()).then(d => setEmpleados(d.data || []));
    fetch('/api/departamentos').then(r => r.json()).then(setDepartamentos);
    cargarCaps(); cargarEvals();
  }, []);

  async function cargarCaps() {
    const r = await fetch('/api/capacitaciones');
    setCaps(await r.json());
  }
  async function cargarEvals() {
    const r = await fetch('/api/evaluaciones');
    setEvals(await r.json());
  }
  async function abrirParticipantes(cap: any) {
    setSelectedCap(cap);
    const r = await fetch(`/api/capacitaciones/${cap.id}/participantes`);
    setParticipantes(await r.json());
    setPartSearch(''); setPartBulkDept(''); setPartEmpIds([]);
    setShowPartModal(true);
  }

  async function guardarCap(e: React.FormEvent) {
    e.preventDefault();
    const url = editCap ? `/api/capacitaciones/${editCap.id}` : '/api/capacitaciones';
    const method = editCap ? 'PUT' : 'POST';
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(capForm) });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: 'Error desconocido' }));
      setMsg(`❌ Error al guardar: ${err.error || r.status}`);
      setTimeout(() => setMsg(''), 6000);
      return;
    }
    setShowCapModal(false); setEditCap(null); cargarCaps();
    setMsg('✅ Capacitación guardada.'); setTimeout(() => setMsg(''), 3000);
  }

  async function guardarEval(e: React.FormEvent) {
    e.preventDefault();
    const scores = [
      evalForm.puntaje_liderazgo, evalForm.puntaje_trabajo_equipo,
      evalForm.puntaje_comunicacion, evalForm.puntaje_iniciativa,
      evalForm.puntaje_tecnico, evalForm.puntaje_cumplimiento
    ].map(Number);
    const promedio = scores.filter(Boolean).length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.filter(Boolean).length
      : 0;
    const bajoProm = promedio < 2.5 && promedio > 0;
    const planMejora = bajoProm
      ? (evalForm.plan_mejora || 'Plan de mejora requerido — completar con el jefe inmediato')
      : evalForm.plan_mejora;

    const body = {
      ...evalForm,
      anio: Number(evalForm.anio),
      cuatrimestre: evalForm.cuatrimestre ? Number(evalForm.cuatrimestre) : null,
      id_evaluador: 1,
      estado: evalForm.estado || 'Borrador',
      plan_mejora: planMejora || null,
      puntaje_liderazgo: Number(evalForm.puntaje_liderazgo) || null,
      puntaje_trabajo_equipo: Number(evalForm.puntaje_trabajo_equipo) || null,
      puntaje_comunicacion: Number(evalForm.puntaje_comunicacion) || null,
      puntaje_iniciativa: Number(evalForm.puntaje_iniciativa) || null,
      puntaje_tecnico: Number(evalForm.puntaje_tecnico) || null,
      puntaje_cumplimiento: Number(evalForm.puntaje_cumplimiento) || null,
      proyectos_asignados: Number(evalForm.proyectos_asignados) || 0,
      proyectos_entregados: Number(evalForm.proyectos_entregados) || 0,
    };

    if (editEval) {
      await fetch(`/api/evaluaciones/${editEval.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    } else {
      await fetch('/api/evaluaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    }

    setShowEvalModal(false); setEditEval(null); setEvalForm(emptyEvalForm()); cargarEvals();

    if (bajoProm) {
      setMsg(`⚠️ Promedio ${promedio.toFixed(2)}/5 — Plan de mejora activado automáticamente (Regla 1.1.6)`);
    } else {
      setMsg(`✅ Evaluación ${editEval ? 'actualizada' : 'guardada'}. Promedio: ${promedio.toFixed(2)}/5`);
    }
    setTimeout(() => setMsg(''), 5000);
  }

  async function cambiarEstado(ev: any, nuevoEstado: string) {
    await fetch(`/api/evaluaciones/${ev.id}/estado`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: nuevoEstado })
    });
    cargarEvals();
    setMsg(`Estado cambiado a "${nuevoEstado}"`);
    setTimeout(() => setMsg(''), 3000);
  }

  async function guardarPlanMejora() {
    if (!planMejoraTarget) return;
    await fetch(`/api/evaluaciones/${planMejoraTarget.id}/estado`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_mejora: planMejoraText })
    });
    setShowPlanMejoraModal(false); setPlanMejoraTarget(null); setPlanMejoraText('');
    cargarEvals(); setMsg('Plan de mejora guardado.'); setTimeout(() => setMsg(''), 3000);
  }

  function abrirEditarEval(ev: any) {
    setEditEval(ev);
    setEvalForm({
      id_empleado: String(ev.id_empleado),
      anio: String(ev.anio),
      cuatrimestre: ev.cuatrimestre ? String(ev.cuatrimestre) : '',
      tipo: ev.tipo || 'Cuatrimestral',
      puntaje_liderazgo: String(ev.puntaje_liderazgo || ''),
      puntaje_trabajo_equipo: String(ev.puntaje_trabajo_equipo || ''),
      puntaje_comunicacion: String(ev.puntaje_comunicacion || ''),
      puntaje_iniciativa: String(ev.puntaje_iniciativa || ''),
      puntaje_tecnico: String(ev.puntaje_tecnico || ''),
      puntaje_cumplimiento: String(ev.puntaje_cumplimiento || ''),
      proyectos_asignados: String(ev.proyectos_asignados || ''),
      proyectos_entregados: String(ev.proyectos_entregados || ''),
      comentarios: ev.comentarios || '',
      plan_mejora: ev.plan_mejora || '',
      estado: ev.estado || 'Borrador',
      firma_empleado: ev.firma_empleado || false,
      firma_supervisor: ev.firma_supervisor || false,
    });
    setShowEvalModal(true);
  }

  async function agregarParticipantes() {
    if (!selectedCap || !partEmpIds.length) return;
    await fetch(`/api/capacitaciones/${selectedCap.id}/participantes`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ empleados_ids: partEmpIds })
    });
    const r = await fetch(`/api/capacitaciones/${selectedCap.id}/participantes`);
    setParticipantes(await r.json()); setPartEmpIds([]); cargarCaps();
  }

  async function inscribirDepartamento() {
    if (!selectedCap || !partBulkDept) return;
    setPartBulkLoading(true);
    const r = await fetch(`/api/capacitaciones/${selectedCap.id}/participantes/departamento`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_departamento: partBulkDept })
    });
    const d = await r.json();
    const pr = await fetch(`/api/capacitaciones/${selectedCap.id}/participantes`);
    setParticipantes(await pr.json());
    setPartBulkDept(''); setPartBulkLoading(false); cargarCaps();
    const msg = d.mensaje || `${d.inserted} empleados inscritos`;
    setMsg(`✅ ${msg}`);
    setTimeout(() => setMsg(''), 5000);
  }

  async function actualizarParticipante(capId: number, empId: number, data: any) {
    await fetch(`/api/capacitaciones/${capId}/participantes/${empId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
    });
    const r = await fetch(`/api/capacitaciones/${capId}/participantes`);
    setParticipantes(await r.json()); cargarCaps();
  }

  const capEstadoColor = (e: string) => ({
    Programada: 'bg-blue-100 text-blue-700', 'En curso': 'bg-amber-100 text-amber-700',
    Completada: 'bg-emerald-100 text-emerald-700', Cancelada: 'bg-red-100 text-red-700',
  }[e] || 'bg-slate-100 text-slate-600');

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm border font-medium ${msg.includes('⚠️') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {msg}
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Desarrollo</h2>
          <p className="text-sm text-slate-500 mt-0.5">Capacitaciones y evaluaciones de desempeño</p>
        </div>
        <button onClick={() => { setEditCap(null); setCapForm({ titulo: '', descripcion: '', proveedor: '', tipo: 'Interna', modalidad: 'Presencial', duracion_horas: '', costo: '', fecha_inicio: '', fecha_fin: '', max_participantes: '', id_departamento: '' }); setShowCapModal(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva capacitación
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['capacitaciones', 'evaluaciones'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors
              ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        <div className="ml-auto pb-1 self-end">
          {tab === 'evaluaciones' && (
            <button onClick={() => { setEditEval(null); setEvalForm(emptyEvalForm()); setShowEvalModal(true); }}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
              <Plus className="w-3.5 h-3.5" /> Nueva evaluación
            </button>
          )}
        </div>
      </div>

      {/* ── CAPACITACIONES ──────────────────────────────────────────────────── */}
      {tab === 'capacitaciones' && (
        <div className="grid grid-cols-1 gap-4">
          {caps.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">No hay capacitaciones registradas</div>
          )}
          {caps.map((cap: any) => (
            <div key={cap.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-slate-900">{cap.titulo}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${capEstadoColor(cap.estado)}`}>{cap.estado}</span>
                  </div>
                  <p className="text-sm text-slate-500">{cap.tipo} · {cap.modalidad} · {cap.duracion_horas}h · {cap.departamento_nombre || 'Global'}</p>
                  {cap.descripcion && <p className="text-xs text-slate-400 mt-1 line-clamp-1">{cap.descripcion}</p>}
                </div>
                <div className="text-right text-sm shrink-0">
                  <p className="text-slate-500">{(cap.fecha_inicio||'').slice(0,10)} → {cap.fecha_fin || '—'}</p>
                  <p className="text-slate-400 text-xs">{cap.proveedor || '—'}</p>
                  {cap.costo > 0 && <p className="text-slate-500 text-xs mt-0.5">${cap.costo}</p>}
                </div>
              </div>
              <div className="px-5 pb-4 flex items-center gap-6 text-sm">
                <span className="text-slate-500"><strong className="text-slate-800">{cap.inscritos || 0}</strong> inscritos</span>
                <span className="text-slate-500"><strong className="text-emerald-600">{cap.completados || 0}</strong> completados</span>
                {cap.nota_promedio && <span className="text-slate-500">Nota prom: <strong className="text-blue-600">{cap.nota_promedio}</strong></span>}
                <div className="ml-auto flex gap-2">
                  <button onClick={() => abrirParticipantes(cap)}
                    className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium">
                    <Users className="w-3.5 h-3.5" /> Participantes
                  </button>
                  <button onClick={() => {
                    setEditCap(cap); setCapForm({
                      titulo: cap.titulo, descripcion: cap.descripcion || '', proveedor: cap.proveedor || '',
                      tipo: cap.tipo || 'Interna', modalidad: cap.modalidad || 'Presencial',
                      duracion_horas: cap.duracion_horas || '', costo: cap.costo || '',
                      fecha_inicio: cap.fecha_inicio || '', fecha_fin: cap.fecha_fin || '',
                      max_participantes: cap.max_participantes || '', id_departamento: cap.id_departamento || '',
                    }); setShowCapModal(true);
                  }} className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-200 font-medium">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── EVALUACIONES ────────────────────────────────────────────────────── */}
      {tab === 'evaluaciones' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Empleado', 'Departamento', 'Período', 'Promedio', 'Proyectos', 'Plan mejora', 'Estado', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {evals.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">No hay evaluaciones registradas</td></tr>
              )}
              {evals.map((ev: any) => {
                const prom = Number(ev.promedio) || 0;
                const bajoProm = prom > 0 && prom < 2.5;
                return (
                  <tr key={ev.id} className={`hover:bg-slate-50 ${bajoProm ? 'bg-red-50' : ''}`}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{ev.empleado_nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{ev.departamento}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 font-medium">
                      {ev.anio}{ev.cuatrimestre ? ` C${ev.cuatrimestre}` : ' (Anual)'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-lg font-bold ${scoreColor(prom)}`}>{prom.toFixed(1)}</span>
                        <span className="text-xs text-slate-400">/5</span>
                        {bajoProm && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">↓ bajo</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {ev.proyectos_asignados > 0 ? `${ev.proyectos_entregados}/${ev.proyectos_asignados}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {ev.plan_mejora ? (
                        <button onClick={() => { setPlanMejoraTarget(ev); setPlanMejoraText(ev.plan_mejora); setShowPlanMejoraModal(true); }}
                          className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold hover:bg-amber-200">
                          ⚠️ Ver plan
                        </button>
                      ) : bajoProm ? (
                        <button onClick={() => { setPlanMejoraTarget(ev); setPlanMejoraText(''); setShowPlanMejoraModal(true); }}
                          className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold hover:bg-red-200">
                          + Crear plan
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* Estado dropdown */}
                      <select value={ev.estado}
                        onChange={e => cambiarEstado(ev, e.target.value)}
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${estadoColor(ev.estado)}`}>
                        {ESTADOS_EVAL.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => abrirEditarEval(ev)}
                        className="flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg hover:bg-slate-200 font-medium">
                        <Edit2 className="w-3 h-3" /> Editar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal capacitación ──────────────────────────────────────────────── */}
      {showCapModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900">{editCap ? 'Editar capacitación' : 'Nueva capacitación'}</h3>
              <button onClick={() => { setShowCapModal(false); setEditCap(null); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={guardarCap} className="p-5 space-y-3">
              <p className="text-xs bg-amber-50 text-amber-700 rounded-lg px-3 py-2 border border-amber-100">📋 Regla 1.1.5: toda capacitación requiere aprobación de RRHH.</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input required value={capForm.titulo} onChange={e => setCapForm({ ...capForm, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Tipo', 'tipo', ['Interna','Externa','Online','Certificación','Taller','Seminario'], 'select'],
                  ['Modalidad', 'modalidad', ['Presencial','Virtual','Híbrido'], 'select'],
                  ['Duración (horas)', 'duracion_horas', [], 'number'],
                  ['Costo (USD)', 'costo', [], 'number'],
                  ['Fecha inicio', 'fecha_inicio', [], 'date'],
                  ['Fecha fin', 'fecha_fin', [], 'date'],
                ].map(([label, key, options, type]) => (
                  <div key={String(key)}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{String(label)}</label>
                    {type === 'select' ? (
                      <select value={(capForm as any)[String(key)]} onChange={e => setCapForm({ ...capForm, [String(key)]: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                        {(options as string[]).map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={String(type)} value={(capForm as any)[String(key)]}
                        onChange={e => setCapForm({ ...capForm, [String(key)]: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                    )}
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Proveedor</label>
                <input value={capForm.proveedor} onChange={e => setCapForm({ ...capForm, proveedor: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                <select value={capForm.id_departamento} onChange={e => setCapForm({ ...capForm, id_departamento: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Global (todos)</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción</label>
                <textarea value={capForm.descripcion} onChange={e => setCapForm({ ...capForm, descripcion: e.target.value })} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowCapModal(false); setEditCap(null); }} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal evaluación (nueva / editar) ──────────────────────────────── */}
      {showEvalModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900">{editEval ? 'Editar evaluación' : 'Nueva evaluación de desempeño'}</h3>
              <button onClick={() => { setShowEvalModal(false); setEditEval(null); setEvalForm(emptyEvalForm()); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={guardarEval} className="p-5 space-y-4">
              <p className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2 border border-blue-100">
                📋 Regla 1.1.6: escala 1–5 por competencia. Promedio &lt; 2.5 activa plan de mejora automáticamente.
              </p>

              {/* Empleado + Año */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
                  <select required value={evalForm.id_empleado}
                    onChange={e => setEvalForm({ ...evalForm, id_empleado: e.target.value })}
                    disabled={!!editEval}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none disabled:bg-slate-50 disabled:text-slate-400">
                    <option value="">Seleccione</option>
                    {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Año *</label>
                  <input required type="number" min="2020" max="2099"
                    value={evalForm.anio} onChange={e => setEvalForm({ ...evalForm, anio: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              {/* Cuatrimestre + Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cuatrimestre</label>
                  <select value={evalForm.cuatrimestre}
                    onChange={e => setEvalForm({ ...evalForm, cuatrimestre: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">— Anual (sin cuatrimestre) —</option>
                    <option value="1">1er Cuatrimestre (Ene–Abr)</option>
                    <option value="2">2do Cuatrimestre (May–Ago)</option>
                    <option value="3">3er Cuatrimestre (Sep–Dic)</option>
                    <option value="4">4to Cuatrimestre (Oct–Dic+)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select value={evalForm.tipo}
                    onChange={e => setEvalForm({ ...evalForm, tipo: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    {['Cuatrimestral','Anual','Semestral','Trimestral','Mensual','Especial'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Competencias */}
              <div className="space-y-3 bg-slate-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Competencias (1–5 estrellas)</p>
                {[
                  ['puntaje_liderazgo', 'Liderazgo'],
                  ['puntaje_trabajo_equipo', 'Trabajo en equipo'],
                  ['puntaje_comunicacion', 'Comunicación'],
                  ['puntaje_iniciativa', 'Iniciativa'],
                  ['puntaje_tecnico', 'Habilidad técnica'],
                  ['puntaje_cumplimiento', 'Cumplimiento'],
                ].map(([k, l]) => (
                  <div key={k} className="flex items-center justify-between">
                    <label className="text-sm text-slate-700 w-40">{l}</label>
                    <StarInput value={(evalForm as any)[k]} onChange={v => setEvalForm({ ...evalForm, [k]: v })} />
                  </div>
                ))}
                {/* Live average */}
                {['puntaje_liderazgo','puntaje_trabajo_equipo','puntaje_comunicacion','puntaje_iniciativa','puntaje_tecnico','puntaje_cumplimiento'].some(k => (evalForm as any)[k]) && (() => {
                  const vals = ['puntaje_liderazgo','puntaje_trabajo_equipo','puntaje_comunicacion','puntaje_iniciativa','puntaje_tecnico','puntaje_cumplimiento'].map(k => Number((evalForm as any)[k])).filter(Boolean);
                  const prom = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
                  return (
                    <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-semibold text-center ${prom >= 4 ? 'bg-emerald-100 text-emerald-700' : prom >= 3 ? 'bg-blue-100 text-blue-700' : prom >= 2.5 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      Promedio actual: {prom.toFixed(2)}/5
                      {prom < 2.5 && prom > 0 && ' — ⚠️ Generará plan de mejora automático'}
                    </div>
                  );
                })()}
              </div>

              {/* Proyectos */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Proyectos asignados</label>
                  <input type="number" min="0" value={evalForm.proyectos_asignados}
                    onChange={e => setEvalForm({ ...evalForm, proyectos_asignados: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Proyectos entregados</label>
                  <input type="number" min="0" value={evalForm.proyectos_entregados}
                    onChange={e => setEvalForm({ ...evalForm, proyectos_entregados: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              {/* Plan de mejora manual */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Plan de mejora {['puntaje_liderazgo','puntaje_trabajo_equipo','puntaje_comunicacion','puntaje_iniciativa','puntaje_tecnico','puntaje_cumplimiento'].some(k=>(evalForm as any)[k]) && (() => {const v=['puntaje_liderazgo','puntaje_trabajo_equipo','puntaje_comunicacion','puntaje_iniciativa','puntaje_tecnico','puntaje_cumplimiento'].map(k=>Number((evalForm as any)[k])).filter(Boolean);const p=v.length?v.reduce((a,b)=>a+b,0)/v.length:0;return p<2.5&&p>0;})() && <span className="text-red-500 ml-1">* Requerido</span>}
                </label>
                <textarea value={evalForm.plan_mejora}
                  onChange={e => setEvalForm({ ...evalForm, plan_mejora: e.target.value })}
                  rows={3} placeholder="Acciones concretas para mejorar el desempeño del colaborador..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>

              {/* Comentarios */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Comentarios del evaluador</label>
                <textarea value={evalForm.comentarios}
                  onChange={e => setEvalForm({ ...evalForm, comentarios: e.target.value })}
                  rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>

              {/* Estado (solo en edición) */}
              {editEval && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                  <select value={evalForm.estado}
                    onChange={e => setEvalForm({ ...evalForm, estado: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    {ESTADOS_EVAL.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {/* Firmas (solo en edición) */}
              {editEval && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Firmas digitales</p>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={evalForm.firma_empleado}
                      onChange={e => setEvalForm({ ...evalForm, firma_empleado: e.target.checked })}
                      className="accent-blue-600 w-4 h-4" />
                    <span className="text-sm text-slate-700">Empleado firmó / está de acuerdo</span>
                    {evalForm.firma_empleado && <span className="text-emerald-600 text-xs font-semibold">✓ Firmado</span>}
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={evalForm.firma_supervisor}
                      onChange={e => setEvalForm({ ...evalForm, firma_supervisor: e.target.checked })}
                      className="accent-purple-600 w-4 h-4" />
                    <span className="text-sm text-slate-700">Supervisor firmó / aprobó</span>
                    {evalForm.firma_supervisor && <span className="text-emerald-600 text-xs font-semibold">✓ Firmado</span>}
                  </label>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowEvalModal(false); setEditEval(null); setEvalForm(emptyEvalForm()); }}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-purple-700">
                  {editEval ? 'Actualizar evaluación' : 'Guardar evaluación'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Plan de Mejora ────────────────────────────────────────────── */}
      {showPlanMejoraModal && planMejoraTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <div>
                <h3 className="font-bold text-slate-900">Plan de mejora</h3>
                <p className="text-xs text-slate-400 mt-0.5">{planMejoraTarget.empleado_nombre} — {planMejoraTarget.anio} C{planMejoraTarget.cuatrimestre}</p>
              </div>
              <button onClick={() => { setShowPlanMejoraModal(false); setPlanMejoraTarget(null); }}>
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700">
                ⚠️ Promedio: <strong>{Number(planMejoraTarget.promedio).toFixed(2)}/5</strong> — Por debajo del threshold 2.5 (Regla 1.1.6)
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Acciones de mejora</label>
                <textarea value={planMejoraText} onChange={e => setPlanMejoraText(e.target.value)} rows={5}
                  placeholder="Describe las acciones concretas, plazos y responsables para mejorar el desempeño..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowPlanMejoraModal(false); setPlanMejoraTarget(null); }}
                  className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">Cancelar</button>
                <button onClick={guardarPlanMejora}
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-amber-700">
                  Guardar plan de mejora
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal participantes ─────────────────────────────────────────────── */}
      {showPartModal && selectedCap && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900">Participantes — {selectedCap.titulo}</h3>
              <button onClick={() => setShowPartModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 space-y-4">
                <p className="text-sm font-semibold text-slate-700">Agregar participantes</p>

                {/* Bulk by department */}
                <div className="flex gap-2 items-end pb-3 border-b border-slate-200">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">📂 Inscribir empleados activos de un departamento <span className="text-slate-400">(excluye personal en vacaciones)</span></label>
                    <select value={partBulkDept} onChange={e => setPartBulkDept(e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white">
                      <option value="">Seleccione departamento...</option>
                      {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <button onClick={inscribirDepartamento} disabled={!partBulkDept || partBulkLoading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 whitespace-nowrap">
                    {partBulkLoading ? 'Inscribiendo...' : '+ Inscribir todos'}
                  </button>
                </div>

                {/* Individual search */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">🔍 Buscar y agregar individualmente</label>
                  <input value={partSearch} onChange={e => setPartSearch(e.target.value)}
                    placeholder="Escribí nombre o departamento..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-white mb-2" />
                  <div className="flex gap-2">
                    <div className="flex-1 border border-slate-200 rounded-lg overflow-hidden bg-white">
                      {(() => {
                        const disponibles = empleados.filter(e =>
                          !participantes.find((p: any) => p.id_empleado === e.id) &&
                          (!partSearch || `${e.nombre} ${e.apellido} ${e.departamento_nombre || ''}`.toLowerCase().includes(partSearch.toLowerCase()))
                        );
                        if (disponibles.length === 0) return <p className="text-xs text-slate-400 text-center py-3">Sin resultados</p>;
                        return (
                          <select multiple value={partEmpIds}
                            onChange={e => setPartEmpIds(Array.from(e.target.selectedOptions).map(o => o.value))}
                            className="w-full px-2 py-1 text-sm outline-none" size={Math.min(disponibles.length, 5)}>
                            {disponibles.map(e => (
                              <option key={e.id} value={String(e.id)}>{e.nombre} {e.apellido} — {e.departamento_nombre || '—'}</option>
                            ))}
                          </select>
                        );
                      })()}
                    </div>
                    <button onClick={agregarParticipantes} disabled={!partEmpIds.length}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium self-start disabled:opacity-50">
                      Agregar
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Ctrl+clic para seleccionar múltiples</p>
                </div>
              </div>
              <table className="w-full">
                <thead><tr className="bg-slate-50">
                  {['Empleado','Dpto.','Estado','Nota (≥71=aprobado)','Aprobado','Acción'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {participantes.map((p: any) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-sm font-medium text-slate-800">{p.empleado_nombre}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{p.departamento}</td>
                      <td className="px-3 py-2 text-xs">
                        <select value={p.estado}
                          onChange={e => actualizarParticipante(selectedCap.id, p.id_empleado, { ...p, estado: e.target.value })}
                          className="border border-slate-200 rounded px-2 py-1 text-xs outline-none">
                          {['Inscrito','Completado','No asistió','Abandonó'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-center gap-0.5">
                          <input type="number" min="0" max="100" value={p.nota_evaluacion || ''} placeholder="—"
                            onChange={e => actualizarParticipante(selectedCap.id, p.id_empleado, { ...p, nota_evaluacion: e.target.value })}
                            className={`w-16 border rounded px-2 py-1 text-xs outline-none text-center font-semibold
                              ${p.nota_evaluacion !== null && p.nota_evaluacion !== undefined
                                ? Number(p.nota_evaluacion) >= 71 ? 'border-emerald-300 text-emerald-700' : 'border-red-300 text-red-600'
                                : 'border-slate-200'}`} />
                          {p.nota_evaluacion !== null && p.nota_evaluacion !== undefined && (
                            <span className={`text-xs font-semibold ${Number(p.nota_evaluacion) >= 71 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {Number(p.nota_evaluacion) >= 71 ? '✓ aprobó' : '✗ reprobó'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center text-sm">
                        {p.nota_evaluacion !== null && p.nota_evaluacion !== undefined
                          ? (Number(p.nota_evaluacion) >= 71 ? '✅' : '❌')
                          : p.aprobado === true ? '✅' : p.aprobado === false ? '❌' : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => actualizarParticipante(selectedCap.id, p.id_empleado, { ...p, estado: 'Completado', fecha_completado: new Date().toISOString().slice(0, 10) })}
                          className="text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-100">Completar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
