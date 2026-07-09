import React, { useState, useEffect } from 'react';
import { Plus, X, AlertTriangle, CheckCircle2, Circle, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

const ACTIVOS_LIST: [string, string][] = [
  ['laptop',  '💻 Laptop / Computadora'],
  ['carnet',  '🪪 Carnet de identificación'],
  ['celular', '📱 Teléfono corporativo'],
  ['llaves',  '🔑 Llaves / Tarjetas de acceso'],
  ['otros',   '📦 Otros equipos'],
];

const TIPO_COLOR: Record<string, string> = {
  'Renuncia voluntaria': 'bg-blue-100 text-blue-700',
  'Despido':             'bg-red-100 text-red-700',
  'Término de contrato': 'bg-amber-100 text-amber-700',
  'Jubilación':          'bg-purple-100 text-purple-700',
  'Fallecimiento':       'bg-slate-100 text-slate-600',
  'Otro':                'bg-slate-100 text-slate-600',
};

function expedienteStatus(s: any) {
  const activos = s.activos_devueltos || {};
  const pendientes = ACTIVOS_LIST.filter(([k]) => activos[k] === false).map(([,l]) => l);
  const issues: string[] = [];
  if (!s.accesos_cerrados) issues.push('Accesos no cerrados');
  if (!s.activos_firmado)  issues.push('Acta sin firmar');
  if (pendientes.length)   issues.push(`Activos no devueltos: ${pendientes.map(l => l.split(' ').slice(1).join(' ')).join(', ')}`);
  return issues;
}

export default function ExitView() {
  const [salidas, setSalidas] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [paso, setPaso] = useState(1);
  const [msg, setMsg] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>({});

  const emptyForm = () => ({
    id_empleado: '', tipo: 'Renuncia voluntaria', fecha_efectiva: '', motivo: '',
    cumple_preaviso: true, dias_preaviso: 15,
    activos: { laptop: false, carnet: false, celular: false, llaves: false, otros: false },
    activos_firmado: false, accesos_cerrados: false, entrevista_salida: ''
  });
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    cargarSalidas();
    fetch('/api/empleados?limit=300').then(r => r.json()).then(d => setEmpleados(d.data || []));
  }, []);

  async function cargarSalidas() {
    const r = await fetch('/api/salidas');
    setSalidas(await r.json());
  }

  async function guardar() {
    if (paso < 3) { setPaso(paso + 1); return; }
    const payload = {
      id_empleado: form.id_empleado, tipo: form.tipo,
      fecha_efectiva: form.fecha_efectiva, motivo: form.motivo,
      cumple_preaviso: form.cumple_preaviso, dias_preaviso: form.dias_preaviso,
      activos_devueltos: form.activos,
      activos_firmado: form.activos_firmado,
      accesos_cerrados: form.accesos_cerrados,
      procesado_por: 1,
    };
    const r = await fetch('/api/salidas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (r.ok) {
      setShowModal(false); setPaso(1); cargarSalidas();
      const issues = expedienteStatus({ ...payload, activos_devueltos: form.activos });
      if (issues.length) {
        setMsg(`⚠️ Salida registrada con expediente INCOMPLETO: ${issues.join(' · ')}`);
      } else {
        setMsg('✅ Proceso de salida completado. Expediente en regla.');
      }
      setTimeout(() => setMsg(''), 7000);
    }
  }

  async function guardarEdicion(id: number) {
    await fetch(`/api/salidas/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    });
    setEditingId(null); setEditData({});
    cargarSalidas();
    setMsg('✅ Expediente actualizado.'); setTimeout(() => setMsg(''), 3000);
  }

  function iniciarEdicion(s: any) {
    setEditingId(s.id);
    setEditData({
      accesos_cerrados: s.accesos_cerrados,
      activos_firmado: s.activos_firmado,
      activos_devueltos: { ...(s.activos_devueltos || {}) },
      motivo: s.motivo || '',
    });
    setExpandedId(s.id);
  }

  const pasos = ['Datos de salida', 'Cierre de accesos', 'Entrega de activos'];

  // Summary KPIs
  const pendientesCount = salidas.filter(s => expedienteStatus(s).length > 0).length;

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`rounded-lg px-4 py-2.5 text-sm border font-medium ${msg.includes('⚠️') ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'}`}>
          {msg}
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Módulo de Salida</h2>
          <p className="text-sm text-slate-500 mt-0.5">Proceso formal de baja de empleados</p>
        </div>
        <button onClick={() => { setShowModal(true); setPaso(1); setForm(emptyForm()); }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Registrar salida
        </button>
      </div>

      {/* Reglas + alerta global */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '📋', title: 'Renuncia voluntaria', desc: 'Preaviso mínimo 15 días calendario (Regla 1.1.9)' },
          { icon: '🔒', title: 'Cierre de accesos', desc: 'Se ejecuta el mismo día de la baja (Regla 1.1.9)' },
          { icon: '📦', title: 'Entrega de activos', desc: 'Debe quedar documentada y firmada (Regla 1.1.9)' },
        ].map(r => (
          <div key={r.title} className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <span className="text-2xl">{r.icon}</span>
            <p className="font-semibold text-slate-800 text-sm mt-2">{r.title}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Alert: expedientes incompletos */}
      {pendientesCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-800">
              {pendientesCount} expediente{pendientesCount > 1 ? 's' : ''} con irregularidades (Regla 1.1.9)
            </p>
            <p className="text-xs text-red-600 mt-0.5">
              Activos no devueltos, accesos abiertos o actas sin firmar. Hacé clic en "Completar" para regularizar.
            </p>
          </div>
        </div>
      )}

      {/* Tabla historial */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Historial de salidas</h3>
          <span className="text-xs text-slate-400">{salidas.length} registros · Clic en fila para expandir</span>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-slate-200">
            {['Empleado','Departamento','Tipo','Fecha efectiva','Estado expediente','Accesos','Activos','Acción'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {salidas.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400 text-sm">No hay salidas registradas</td></tr>
            )}
            {salidas.map((s: any) => {
              const issues = expedienteStatus(s);
              const isExpanded = expandedId === s.id;
              const isEditing = editingId === s.id;
              const activos = s.activos_devueltos || {};
              const editActivos = editData.activos_devueltos || {};

              return (
                <React.Fragment key={s.id}>
                  <tr className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${issues.length ? 'bg-red-50' : ''}`}
                    onClick={() => setExpandedId(isExpanded ? null : s.id)}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{s.empleado_nombre}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.departamento}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TIPO_COLOR[s.tipo] || 'bg-slate-100 text-slate-600'}`}>{s.tipo}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">{s.fecha_efectiva}</td>
                    <td className="px-4 py-3">
                      {issues.length === 0 ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> En regla
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5" /> {issues.length} pendiente{issues.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-base">
                      {s.accesos_cerrados ? '✅' : <span className="text-red-500 font-bold">✗</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-base">
                      {s.activos_firmado ? '✅' : <span className="text-red-500 font-bold">✗</span>}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => iniciarEdicion(s)}
                        className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg font-medium">
                        <Edit2 className="w-3 h-3" /> {issues.length ? 'Completar' : 'Editar'}
                      </button>
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </td>
                  </tr>

                  {/* Fila expandida */}
                  {isExpanded && (
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <td colSpan={8} className="px-6 py-4">
                        {!isEditing ? (
                          // Vista de detalle
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Motivo</p>
                              <p className="text-sm text-slate-700">{s.motivo || '—'}</p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Activos devueltos</p>
                              <div className="space-y-1">
                                {ACTIVOS_LIST.map(([k, l]) => (
                                  <div key={k} className="flex items-center gap-2 text-xs">
                                    <span>{activos[k] ? '✅' : '⬜'}</span>
                                    <span className={activos[k] ? 'text-slate-600' : 'text-slate-400'}>{l}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Pendientes</p>
                              {issues.length === 0 ? (
                                <p className="text-xs text-emerald-600 font-semibold">✅ Expediente completo</p>
                              ) : (
                                <ul className="space-y-1">
                                  {issues.map(i => (
                                    <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                                      <span className="shrink-0">⚠️</span>{i}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Modo edición inline
                          <div className="space-y-4">
                            <p className="text-sm font-semibold text-slate-700">Completar / corregir expediente de {s.empleado_nombre}</p>

                            {/* Motivo */}
                            <div>
                              <label className="block text-xs font-medium text-slate-600 mb-1">Motivo</label>
                              <textarea value={editData.motivo || ''} rows={2}
                                onChange={e => setEditData({ ...editData, motivo: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              {/* Activos */}
                              <div>
                                <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Activos devueltos</p>
                                <div className="space-y-2">
                                  {ACTIVOS_LIST.map(([k, l]) => (
                                    <label key={k} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-all
                                      ${editActivos[k] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                      <input type="checkbox" checked={!!editActivos[k]}
                                        onChange={e => setEditData({
                                          ...editData,
                                          activos_devueltos: { ...editActivos, [k]: e.target.checked }
                                        })} className="w-4 h-4 accent-emerald-600" />
                                      {editActivos[k]
                                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        : <Circle className="w-4 h-4 text-slate-300" />}
                                      <span className="text-sm text-slate-700">{l}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Accesos y firma */}
                              <div className="space-y-3">
                                <p className="text-xs font-semibold text-slate-600 uppercase">Estado del proceso</p>
                                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all
                                  ${editData.accesos_cerrados ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                                  <input type="checkbox" checked={!!editData.accesos_cerrados}
                                    onChange={e => setEditData({ ...editData, accesos_cerrados: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-600" />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">🔒 Accesos cerrados</p>
                                    <p className="text-xs text-slate-500">Sistema, correo, VPN, tarjetas</p>
                                  </div>
                                </label>
                                <label className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-all
                                  ${editData.activos_firmado ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                  <input type="checkbox" checked={!!editData.activos_firmado}
                                    onChange={e => setEditData({ ...editData, activos_firmado: e.target.checked })}
                                    className="w-4 h-4 accent-emerald-600" />
                                  <div>
                                    <p className="text-sm font-semibold text-slate-700">✍️ Acta firmada</p>
                                    <p className="text-xs text-slate-500">Conformidad de entrega por ambas partes</p>
                                  </div>
                                </label>

                                {/* Alerta activos no devueltos */}
                                {ACTIVOS_LIST.some(([k]) => editActivos[k] === false) && !editData.activos_firmado && (
                                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                    <p className="text-xs font-bold text-red-700 mb-1">⚠️ Activos pendientes de devolución</p>
                                    <ul className="space-y-0.5">
                                      {ACTIVOS_LIST.filter(([k]) => editActivos[k] === false).map(([, l]) => (
                                        <li key={l} className="text-xs text-red-600">• {l}</li>
                                      ))}
                                    </ul>
                                    <p className="text-xs text-red-500 mt-1">Sin firma, la empresa puede iniciar proceso de cobro por reposición.</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex gap-3 pt-2 border-t border-slate-200">
                              <button onClick={() => { setEditingId(null); setEditData({}); }}
                                className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">
                                Cancelar
                              </button>
                              <button onClick={() => guardarEdicion(s.id)}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                                Guardar cambios
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal wizard nuevo */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-5 border-b border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-900">Proceso de salida</h3>
                <button onClick={() => { setShowModal(false); setPaso(1); }}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              {/* Stepper */}
              <div className="flex items-center gap-2">
                {pasos.map((p, i) => (
                  <React.Fragment key={p}>
                    <div className={`flex items-center gap-2 ${i < pasos.length - 1 ? 'flex-1' : ''}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                        ${paso > i + 1 ? 'bg-emerald-500 text-white' : paso === i + 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                        {paso > i + 1 ? '✓' : i + 1}
                      </div>
                      <span className={`text-xs font-medium hidden sm:block ${paso === i + 1 ? 'text-blue-600' : 'text-slate-400'}`}>{p}</span>
                    </div>
                    {i < pasos.length - 1 && <div className={`flex-1 h-0.5 ${paso > i + 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Paso 1 */}
              {paso === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Empleado *</label>
                    <select required value={form.id_empleado} onChange={e => setForm({ ...form, id_empleado: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                      <option value="">Seleccione empleado</option>
                      {empleados.map(e => <option key={e.id} value={e.id}>{e.nombre} {e.apellido}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de salida *</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                      {['Renuncia voluntaria','Despido','Término de contrato','Jubilación','Fallecimiento','Otro'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {form.tipo === 'Renuncia voluntaria' && (
                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">Regla 1.1.9: preaviso mínimo de 15 días calendario</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha efectiva *</label>
                    <input required type="date" value={form.fecha_efectiva} onChange={e => setForm({ ...form, fecha_efectiva: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Motivo *{form.tipo === 'Despido' && <span className="text-red-500 ml-1">(obligatorio con copia al expediente)</span>}
                    </label>
                    <textarea required value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                  </div>
                </div>
              )}

              {/* Paso 2 */}
              {paso === 2 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Verificar el cierre de todos los accesos del empleado antes de confirmar la baja.</p>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700">Regla 1.1.9: el cierre de accesos se ejecuta el mismo día de la baja.</p>
                  </div>
                  <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer border-2 transition-all
                    ${form.accesos_cerrados ? 'bg-emerald-50 border-emerald-400' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}>
                    <input type="checkbox" checked={form.accesos_cerrados}
                      onChange={e => setForm({ ...form, accesos_cerrados: e.target.checked })} className="w-5 h-5 accent-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">🔒 Accesos bloqueados</p>
                      <p className="text-xs text-slate-500">Sistema, correo corporativo, VPN, tarjetas de acceso físico</p>
                    </div>
                  </label>
                  {!form.accesos_cerrados && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                      ⚠️ El expediente quedará incompleto. Podés regularizarlo desde el historial.
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Entrevista de salida</label>
                    <textarea value={form.entrevista_salida} onChange={e => setForm({ ...form, entrevista_salida: e.target.value })} rows={3}
                      placeholder="¿Por qué se va? ¿Qué mejoraría de la empresa?..."
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                  </div>
                </div>
              )}

              {/* Paso 3 */}
              {paso === 3 && (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Confirmar la entrega de activos asignados al empleado.</p>
                  <div className="space-y-2">
                    {ACTIVOS_LIST.map(([k, l]) => (
                      <label key={k} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-all
                        ${(form.activos as any)[k] ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                        <input type="checkbox" checked={(form.activos as any)[k]}
                          onChange={e => setForm({ ...form, activos: { ...form.activos, [k]: e.target.checked } })} className="w-4 h-4" />
                        {(form.activos as any)[k]
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          : <Circle className="w-4 h-4 text-slate-300" />}
                        <span className="text-sm text-slate-700">{l}</span>
                      </label>
                    ))}
                  </div>
                  <label className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition-all
                    ${form.activos_firmado ? 'bg-blue-50 border-blue-400' : 'bg-slate-50 border-slate-200'}`}>
                    <input type="checkbox" checked={form.activos_firmado}
                      onChange={e => setForm({ ...form, activos_firmado: e.target.checked })} className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm font-semibold text-slate-800">✍️ Conformidad firmada por empleado y RRHH</span>
                  </label>
                  {/* Advertencia activos no devueltos */}
                  {Object.values(form.activos).some(v => !v) && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs font-bold text-red-700 mb-1">⚠️ Activos sin marcar como devueltos:</p>
                      <ul className="space-y-0.5">
                        {ACTIVOS_LIST.filter(([k]) => !(form.activos as any)[k]).map(([, l]) => (
                          <li key={l} className="text-xs text-red-600">• {l}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-red-500 mt-1.5 font-medium">
                        Sin devolución documentada, la empresa puede iniciar proceso de cobro por reposición. El expediente quedará marcado como incompleto.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2 border-t border-slate-100">
                {paso > 1 && (
                  <button onClick={() => setPaso(paso - 1)}
                    className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium">← Anterior</button>
                )}
                <button onClick={guardar}
                  disabled={paso === 1 && (!form.id_empleado || !form.fecha_efectiva || !form.motivo)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium text-white
                    ${paso === 3 ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:opacity-50`}>
                  {paso < 3 ? 'Siguiente →' : '✅ Completar proceso de salida'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
