import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, UserX, CheckCircle, AlertTriangle, Plus, X, Search, Filter } from 'lucide-react';

export default function ControlView() {
  const [tab, setTab] = useState<'asistencia'|'ausencias'|'vacaciones'>('asistencia');
  const [registros, setRegistros] = useState<any[]>([]);
  const [resumen, setResumen] = useState<any[]>([]);
  const [ausencias, setAusencias] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<any[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterFecha, setFilterFecha] = useState('');
  const [semana, setSemana] = useState(false);
  const [showModalAus, setShowModalAus] = useState(false);
  const [showModalVac, setShowModalVac] = useState(false);
  const [empleados, setEmpleados] = useState<any[]>([]);

  // forms
  const [ausForm, setAusForm] = useState({ id_empleado:'', fecha:'', tipo:'Ausente', tipo_justificante:'', motivo:'', justificado:false });
  const [vacForm, setVacForm] = useState({ id_empleado:'', tipo:'Vacaciones', fecha_inicio:'', fecha_fin:'', motivo:'' });
  const [marcajeForm, setMarcajeForm] = useState({ id_empleado:'', fecha: new Date().toISOString().slice(0,10), hora_entrada:'08:00', hora_salida:'17:00', estado:'Presente' });
  const [showMarcaje, setShowMarcaje] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/departamentos').then(r=>r.json()).then(setDepartamentos);
    fetch('/api/empleados?limit=300').then(r=>r.json()).then(d=>setEmpleados(d.data||[]));
    cargarAsistencia();
    cargarResumen();
    cargarPermisos();
  }, []);

  useEffect(() => { cargarAsistencia(); }, [filterDept, filterFecha, semana]);
  useEffect(() => { cargarPermisos(); }, [tab]);

  async function cargarAsistencia() {
    const p = new URLSearchParams();
    if (filterDept) p.set('dept', filterDept);
    if (filterFecha) p.set('fecha', filterFecha);
    if (semana) p.set('semana', 'true');
    const r = await fetch(`/api/asistencia?${p}`);
    setRegistros(await r.json());
  }

  async function cargarResumen() {
    const p = new URLSearchParams();
    if (filterDept) p.set('dept', filterDept);
    const r = await fetch(`/api/asistencia/resumen?${p}`);
    const d = await r.json();
    setResumen(Array.isArray(d) ? d.slice(0,7).reverse() : []);
  }

  async function cargarPermisos() {
    const tipo = tab === 'ausencias' ? 'Ausencia justificada' : tab === 'vacaciones' ? 'Vacaciones' : '';
    const p = new URLSearchParams();
    if (tipo) p.set('tipo', tipo); // not filtering by tipo since we show both
    if (filterFecha) p.set('fecha', filterFecha);
    if (filterDept)  p.set('dept', filterDept);
    const r = await fetch(`/api/permisos?${p}`);
    const pd = await r.json();
    setPermisos(Array.isArray(pd) ? pd : []);
  }

  async function guardarMarcaje(e: React.FormEvent) {
    e.preventDefault();
    // Auto-calc tardanza
    const [h, m] = (marcajeForm.hora_entrada||'08:00').split(':').map(Number);
    const minutos_tardanza = Math.max(0, (h * 60 + m) - (8 * 60 + 15));
    const estado = minutos_tardanza > 0 ? 'Tardanza' : marcajeForm.estado;
    await fetch('/api/asistencia', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ ...marcajeForm, estado, minutos_tardanza }) });
    setMsg(`Marcaje guardado. Estado: ${estado}${minutos_tardanza > 0 ? ` (${minutos_tardanza} min tardanza)` : ''}`);
    setShowMarcaje(false); cargarAsistencia(); cargarResumen();
    setTimeout(() => setMsg(''), 4000);
  }

  async function guardarAusencia(e: React.FormEvent) {
    e.preventDefault();
    await fetch('/api/asistencia', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id_empleado: ausForm.id_empleado, fecha: ausForm.fecha,
        estado: 'Ausente', justificado: ausForm.justificado,
        tipo_justificante: ausForm.tipo_justificante, observaciones: ausForm.motivo }) });
    setShowModalAus(false); cargarAsistencia();
    setMsg('Ausencia registrada correctamente.'); setTimeout(() => setMsg(''), 4000);
  }

  async function guardarVacacion(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch('/api/permisos', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify(vacForm) });
    if (!r.ok) { const d = await r.json(); setMsg('Error: ' + d.error); return; }
    setShowModalVac(false); cargarPermisos();
    setMsg('Solicitud de vacaciones enviada.'); setTimeout(() => setMsg(''), 4000);
  }

  async function aprobarPermiso(id: number, estado: string) {
    await fetch(`/api/permisos/${id}/aprobar`, { method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ estado, aprobado_por: 1 }) });
    cargarPermisos();
  }

  const hoy = registros.filter(r => r.fecha === new Date().toISOString().slice(0,10));
  const stats = {
    presentes:  registros.filter(r=>r.estado==='Presente').length,
    tardanzas:  registros.filter(r=>r.estado==='Tardanza').length,
    ausentes:   registros.filter(r=>r.estado==='Ausente').length,
    vacaciones: registros.filter(r=>r.estado==='Vacaciones').length,
  };

  const estadoColor = (e: string) => ({
    Presente:   'bg-emerald-100 text-emerald-700',
    Tardanza:   'bg-amber-100 text-amber-700',
    Ausente:    'bg-red-100 text-red-700',
    Vacaciones: 'bg-blue-100 text-blue-700',
    Licencia:   'bg-purple-100 text-purple-700',
  }[e] || 'bg-slate-100 text-slate-600');

  return (
    <div className="space-y-5">
      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Control Diario</h2>
          <p className="text-sm text-slate-500 mt-0.5">Asistencia, ausencias y vacaciones del personal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMarcaje(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar marcaje
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Presentes', value: stats.presentes,  color:'text-emerald-600', bg:'bg-emerald-50', icon:'✅' },
          { label:'Tardanzas', value: stats.tardanzas,  color:'text-amber-600',   bg:'bg-amber-50',   icon:'⏰' },
          { label:'Ausentes',  value: stats.ausentes,   color:'text-red-600',     bg:'bg-red-50',     icon:'❌' },
          { label:'Vacaciones',value: stats.vacaciones, color:'text-blue-600',    bg:'bg-blue-50',    icon:'🏖️' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-slate-100`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-slate-500 font-medium">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color} mt-1`}>{k.value}</p>
              </div>
              <span className="text-2xl">{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['asistencia','ausencias','vacaciones'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors
              ${tab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* ASISTENCIA */}
      {tab === 'asistencia' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-3 flex-wrap items-center">
            <select value={filterDept} onChange={e=>{setFilterDept(e.target.value);cargarResumen();}}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="">Todos los departamentos</option>
              {departamentos.map(d=><option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <input type="date" value={filterFecha} onChange={e=>setFilterFecha(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={semana} onChange={e=>setSemana(e.target.checked)} className="rounded" />
              Ver historial semanal
            </label>
            <button onClick={()=>{setFilterDept('');setFilterFecha('');setSemana(false);}}
              className="text-xs text-slate-400 hover:text-slate-600 underline ml-auto">Limpiar</button>
          </div>

          {/* Historial semanal - gráfico simple */}
          {semana && resumen.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-800 mb-4">Asistencia última semana</h3>
              <div className="flex items-end gap-3 h-32">
                {resumen.map((d:any) => (
                  <div key={d.fecha} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold text-blue-600">{d.pct}%</span>
                    <div className="w-full bg-blue-100 rounded-t-md" style={{height: `${Math.max(8,(d.pct||0)*1.1)}px`, background: d.pct >= 90 ? '#22c55e' : d.pct >= 75 ? '#3b82f6' : '#f59e0b'}} />
                    <span className="text-xs text-slate-400">{String(d.fecha).slice(5)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Empleado','Departamento','Fecha','Entrada','Salida','Estado','Tardanza'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No hay registros para los filtros seleccionados
                  </td></tr>
                )}
                {registros.map((r:any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.empleado_nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.departamento}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.fecha}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.hora_entrada || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{r.hora_salida || '—'}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoColor(r.estado)}`}>{r.estado}</span></td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.minutos_tardanza > 0 ? `${r.minutos_tardanza} min` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">{registros.length} registros</div>
          </div>
        </div>
      )}

      {/* AUSENCIAS */}
      {tab === 'ausencias' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowModalAus(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Registrar ausencia
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Empleado','Departamento','Fecha','Estado','Justificado','Tipo justificante','Observaciones'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registros.filter((r:any) => r.estado === 'Ausente').length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400 text-sm">No hay ausencias registradas</td></tr>
                )}
                {registros.filter((r:any) => r.estado === 'Ausente').map((r:any) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{r.empleado_nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.departamento}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.fecha}</td>
                    <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Ausente</span></td>
                    <td className="px-4 py-3 text-sm">{r.justificado ? <span className="text-emerald-600 font-medium">✓ Sí</span> : <span className="text-red-500">✗ No</span>}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.tipo_justificante || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{r.observaciones || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VACACIONES */}
      {tab === 'vacaciones' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={() => setShowModalVac(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              <Plus className="w-4 h-4" /> Nueva solicitud
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>{['Empleado','Departamento','Tipo','Desde','Hasta','Días','Estado','Acciones'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {permisos.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">No hay solicitudes registradas</td></tr>
                )}
                {permisos.map((p:any) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{p.empleado_nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.departamento || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.tipo}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{(p.fecha_inicio||'').slice(0,10)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{(p.fecha_fin||'').slice(0,10)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{p.dias_solicitados}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.estado==='Aprobado' ? 'bg-emerald-100 text-emerald-700' :
                        p.estado==='Rechazado' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'}`}>{p.estado}</span>
                    </td>
                    <td className="px-4 py-3">
                      {p.estado === 'Pendiente' && (
                        <div className="flex gap-1">
                          <button onClick={() => aprobarPermiso(p.id,'Aprobado')}
                            className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded hover:bg-emerald-200">Aprobar</button>
                          <button onClick={() => aprobarPermiso(p.id,'Rechazado')}
                            className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Rechazar</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal marcaje */}
      {showMarcaje && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Registrar marcaje</h3>
              <button onClick={() => setShowMarcaje(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={guardarMarcaje} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
                <select required value={marcajeForm.id_empleado} onChange={e=>setMarcajeForm({...marcajeForm,id_empleado:e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Seleccione empleado</option>
                  {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha</label>
                  <input type="date" value={marcajeForm.fecha} onChange={e=>setMarcajeForm({...marcajeForm,fecha:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                  <select value={marcajeForm.estado} onChange={e=>setMarcajeForm({...marcajeForm,estado:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    {['Presente','Ausente','Vacaciones','Licencia'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora entrada</label>
                  <input type="time" value={marcajeForm.hora_entrada} onChange={e=>setMarcajeForm({...marcajeForm,hora_entrada:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hora salida</label>
                  <input type="time" value={marcajeForm.hora_salida} onChange={e=>setMarcajeForm({...marcajeForm,hora_salida:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">⏰ Regla 1.1.4: tardanza = entrada después de las 08:15. Se calcula automáticamente.</p>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowMarcaje(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ausencia */}
      {showModalAus && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Registrar ausencia</h3>
              <button onClick={() => setShowModalAus(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={guardarAusencia} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
                <select required value={ausForm.id_empleado} onChange={e=>setAusForm({...ausForm,id_empleado:e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Seleccione</option>
                  {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
                <input required type="date" value={ausForm.fecha} onChange={e=>setAusForm({...ausForm,fecha:e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="just" checked={ausForm.justificado} onChange={e=>setAusForm({...ausForm,justificado:e.target.checked})} />
                <label htmlFor="just" className="text-sm text-slate-700">Ausencia justificada</label>
              </div>
              {ausForm.justificado && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de justificante</label>
                  <select value={ausForm.tipo_justificante} onChange={e=>setAusForm({...ausForm,tipo_justificante:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Seleccione</option>
                    {['Incapacidad médica','Duelo familiar','Permiso escrito','Calamidad doméstica'].map(t=><option key={t}>{t}</option>)}
                  </select>
                  <p className="text-xs text-blue-600 mt-1">⏱ Regla 1.1.3: justificante debe entregarse en 48h hábiles desde el regreso</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observaciones</label>
                <textarea value={ausForm.motivo} onChange={e=>setAusForm({...ausForm,motivo:e.target.value})} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModalAus(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal vacacion */}
      {showModalVac && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900">Solicitar permiso / vacaciones</h3>
              <button onClick={() => setShowModalVac(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={guardarVacacion} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
                <select required value={vacForm.id_empleado} onChange={e=>setVacForm({...vacForm,id_empleado:e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Seleccione</option>
                  {empleados.map(e=><option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select value={vacForm.tipo} onChange={e=>setVacForm({...vacForm,tipo:e.target.value})}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                  {['Vacaciones','Ausencia justificada','Permiso médico','Permiso personal','Duelo'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Desde *</label>
                  <input required type="date" value={(vacForm.fecha_inicio||'').slice(0,10)} onChange={e=>setVacForm({...vacForm,fecha_inicio:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Hasta *</label>
                  <input required type="date" value={(vacForm.fecha_fin||'').slice(0,10)} onChange={e=>setVacForm({...vacForm,fecha_fin:e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">📋 Reglas: mín. 5 días hábiles anticipación · máx. 15 días continuos · requiere aprobación del jefe inmediato</p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Motivo</label>
                <textarea value={vacForm.motivo} onChange={e=>setVacForm({...vacForm,motivo:e.target.value})} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModalVac(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Enviar solicitud</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
