import React, { useState, useEffect, useRef } from 'react';
import { Upload, Sparkles, AlertCircle, FileText, Plus, X, Search, Trash2, Calendar } from 'lucide-react';

interface Vacante {
  id: number; titulo: string; departamento_nombre?: string; descripcion?: string;
  palabras_clave?: string[]; estado: string; total_candidatos?: number;
  cantidad?: number; aprobados_count?: number;
  fecha_apertura?: string; id_departamento?: number; salario_ofrecido?: number;
}
interface Candidato {
  id: number; nombre: string; apellido?: string; correo?: string; cedula?: string;
  telefono?: string; genero?: string; fuente?: string;
  vacante_titulo?: string; id_vacante?: number;
  score_ia?: number; recomendacion_ia?: string; resumen_ia?: string;
  fortalezas_ia?: string[]; debilidades_ia?: string[];
  palabras_clave_match?: string[]; palabras_clave_falta?: string[];
  alerta_otras_areas?: boolean; areas_sugeridas?: string[];
  estado: string; fecha_recepcion?: string;
  entrevista?: { fecha: string; hora: string; tipo: string; responsable: string };
  resultado?: { aprobado: boolean; fechaNotificacion: string };
  keywords_match_count?: number;
}

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const col = score >= 80 ? '#16a34a' : score >= 55 ? '#0d9488' : score >= 35 ? '#d97706' : '#dc2626';
  const r = (size - 8) / 2; const circ = 2 * Math.PI * r; const dash = (score / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="5" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth="5"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-bold"
        style={{ fontSize: size < 46 ? 10 : 12, color: col }}>{score}%</div>
    </div>
  );
}

const estadoBadge = (e: string) => ({
  Recibido: 'bg-blue-100 text-blue-700', 'En revisión': 'bg-amber-100 text-amber-700',
  Entrevistado: 'bg-purple-100 text-purple-700', Aprobado: 'bg-emerald-100 text-emerald-700',
  Descartado: 'bg-red-100 text-red-600', Contratado: 'bg-sky-100 text-sky-800',
}[e] || 'bg-slate-100 text-slate-500');

const recBadge = (r?: string) => ({
  ENTREVISTAR: 'bg-emerald-100 text-emerald-700',
  REVISAR: 'bg-amber-100 text-amber-700',
  DESCARTAR: 'bg-red-100 text-red-700',
}[r || ''] || 'bg-slate-100 text-slate-600');

const STEPS = ['Recibido', 'En revisión', 'Entrevistado', 'Resultado', 'Empleado'];
const STEP_MAP: Record<string, number> = {
  Recibido: 0, 'En revisión': 1, Entrevistado: 2, Aprobado: 3, Descartado: 3, Contratado: 4,
};

export default function RecruitmentView() {
  const [view, setView] = useState<'vacantes' | 'candidatos'>('vacantes');
  const [vacantes, setVacantes] = useState<Vacante[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [cargos, setCargos] = useState<any[]>([]);
  const [selectedVacante, setSelectedVacante] = useState<Vacante | null>(null);
  const [selectedCandidato, setSelectedCandidato] = useState<Candidato | null>(null);
  const [poolCandidatos, setPoolCandidatos] = useState<any[]>([]);
  const [showPool, setShowPool] = useState(false);

  // Modals
  const [showVacanteModal, setShowVacanteModal] = useState(false);
  const [showAnalyzeModal, setShowAnalyzeModal] = useState(false);
  const [showDescartarModal, setShowDescartarModal] = useState(false);
  const [showEntrevistaModal, setShowEntrevistaModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  // Vacante form
  const [vForm, setVForm] = useState({ titulo: '', id_departamento: '', descripcion: '', palabras_clave: '', salario_ofrecido: '', modalidad: 'Presencial', cantidad: '1' });
  // CV
  const [cvTexto, setCvTexto] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{done:number,total:number,current:string}|null>(null);
  const [inputType, setInputType] = useState<'pdf' | 'text'>('pdf');
  const [analyzeVacanteId, setAnalyzeVacanteId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Descarte
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [motivoError, setMotivoError] = useState('');
  // Entrevista
  const [entForm, setEntForm] = useState({ fecha: '', hora: '', tipo: 'Presencial', responsable: '' });
  // Resultado
  const [resForm, setResForm] = useState({ aprobado: '', fechaNotificacion: '' });

  // Convert to employee — full form same as Personal
  const emptyConvert = () => ({
    nombre: '', apellido: '', cedula: '', pasaporte: '',
    correo_corporativo: '', correo_personal: '', telefono: '', telefono_emergencia: '',
    contacto_emergencia: '', fecha_nacimiento: '', genero: '', estado_civil: '',
    nacionalidad: 'Panameña', id_departamento: '', id_cargo: '', id_supervisor: '',
    fecha_ingreso: new Date().toISOString().slice(0, 10),
    salario_base: '', tipo_contrato: 'Indefinido', jornada: 'Completa',
    estado: 'Activo', modalidad: 'Presencial',
  });
  const [convertForm, setConvertForm] = useState<Record<string, string>>(emptyConvert());
  const [convertErr, setConvertErr] = useState<Record<string, string>>({});
  const [convertTab, setConvertTab] = useState<'personal' | 'laboral' | 'emergencia'>('personal');

  useEffect(() => {
    cargarVacantes();
    fetch('/api/departamentos').then(r => r.json()).then(d => setDepartamentos(Array.isArray(d) ? d : []));
    fetch('/api/cargos').then(r => r.json()).then(d => setCargos(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedVacante) {
      fetch(`/api/candidatos?vacante=${selectedVacante.id}`).then(r => r.json()).then(d => setCandidatos(Array.isArray(d) ? d : []));
      fetch(`/api/candidatos/pool?id_vacante=${selectedVacante.id}`).then(r => r.json()).then(d => setPoolCandidatos(Array.isArray(d) ? d : []));
    } else if (view === 'candidatos') {
      fetch('/api/candidatos').then(r => r.json()).then(d => setCandidatos(Array.isArray(d) ? d : []));
      fetch('/api/candidatos/pool').then(r => r.json()).then(d => setPoolCandidatos(Array.isArray(d) ? d : []));
    }
  }, [selectedVacante, view]);

  async function cargarVacantes() {
    const r = await fetch('/api/vacantes');
    setVacantes(Array.isArray(await r.json()) ? await fetch('/api/vacantes').then(x => x.json()) : []);
  }

  async function cargarVacantesFresh() {
    const r = await fetch('/api/vacantes');
    const d = await r.json();
    setVacantes(Array.isArray(d) ? d : []);
  }

  async function guardarVacante(e: React.FormEvent) {
    e.preventDefault();
    const keywords = vForm.palabras_clave.split(',').map(k => k.trim()).filter(Boolean);
    const resp = await fetch('/api/vacantes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...vForm, palabras_clave: keywords, id_departamento: vForm.id_departamento || null })
    });
    if (!resp.ok) { const d = await resp.json(); setError('Error: ' + d.error); return; }
    setShowVacanteModal(false);
    setVForm({ titulo: '', id_departamento: '', descripcion: '', palabras_clave: '', salario_ofrecido: '', modalidad: 'Presencial', cantidad: '1' });
    await cargarVacantesFresh();
    showMsg('✅ Convocatoria creada correctamente.');
  }

  async function analizarBatch() {
    if (!analyzeVacanteId || pdfFiles.length === 0) return;
    setIsAnalyzing(true);
    setBatchProgress({ done: 0, total: pdfFiles.length, current: '' });
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setBatchProgress({ done: i, total: pdfFiles.length, current: file.name });
      const fd = new FormData();
      fd.append('pdf', file);
      fd.append('id_vacante', String(analyzeVacanteId));
      await fetch('/api/candidatos/analizar', { method: 'POST', body: fd }).catch(() => {});
    }
    setBatchProgress({ done: pdfFiles.length, total: pdfFiles.length, current: 'Completado' });
    await cargarVacantes();
    if (selectedVacante) {
      fetch(`/api/candidatos?vacante=${selectedVacante.id}`).then(r => r.json()).then(d => setCandidatos(Array.isArray(d) ? d : []));
    }
    setTimeout(() => {
      setShowAnalyzeModal(false);
      setBatchProgress(null);
      setPdfFiles([]);
      setBatchMode(false);
    }, 1500);
    setIsAnalyzing(false);
  }

  async function analizarCV(e: React.FormEvent) {
    e.preventDefault();
    if (!analyzeVacanteId) { setError('Seleccioná una vacante'); return; }
    setIsAnalyzing(true); setError('');
    try {
      let body: Record<string, any> = {
        id_vacante: analyzeVacanteId,
        nombre_archivo: pdfFile?.name || 'CV texto',
      };

      if (inputType === 'pdf' && pdfFile) {
        // Send PDF as base64 so the server can extract text with pdf-parse
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = () => reject(new Error('Error leyendo archivo'));
          reader.readAsDataURL(pdfFile);
        });
        body.pdfBase64 = base64;
      } else {
        body.cvTexto = cvTexto;
      }

      const r = await fetch('/api/candidatos/analizar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Error IA'); }
      const nuevo = await r.json();
      setCandidatos(prev => [nuevo, ...prev]);
      setShowAnalyzeModal(false); setCvTexto(''); setPdfFile(null);
      showMsg(`✅ CV analizado: ${nuevo.nombre} — Score: ${nuevo.score_ia}% — ${nuevo.recomendacion_ia}`);
    } catch (err: any) { setError(err.message); }
    finally { setIsAnalyzing(false); }
  }

  async function cambiarEstado(id: number, estado: string) {
    const r = await fetch(`/api/candidatos/${id}/estado`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    });
    const updated = await r.json();
    setCandidatos(prev => prev.map(c => c.id === id ? { ...c, estado } : c));
    if (selectedCandidato?.id === id) setSelectedCandidato(prev => prev ? { ...prev, estado } : null);
    return updated;
  }

  async function confirmarDescarte() {
    if (!motivoDescarte.trim()) { setMotivoError('Campo obligatorio (Regla 1.1.8)'); return; }
    if (!selectedCandidato) return;
    await cambiarEstado(selectedCandidato.id, 'Descartado');
    const score = selectedCandidato.score_ia || 0;
    setShowDescartarModal(false); setMotivoDescarte(''); setMotivoError('');
    showMsg(score >= 60
      ? `📁 Descartado. Score ${score}% — perfil guardado en pool de talentos.`
      : `🗑️ Descartado. Score ${score}% — CV eliminado del sistema.`);
  }

  async function guardarEntrevista(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCandidato) return;
    await cambiarEstado(selectedCandidato.id, 'Entrevistado');
    setSelectedCandidato(prev => prev ? { ...prev, estado: 'Entrevistado', entrevista: entForm } : null);
    setShowEntrevistaModal(false);
    showMsg('📅 Entrevista programada correctamente.');
  }

  async function guardarResultado(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCandidato || !resForm.aprobado || !resForm.fechaNotificacion) return;
    const aprobado = resForm.aprobado === 'true';
    const nuevoEstado = aprobado ? 'Aprobado' : 'Descartado';
    await cambiarEstado(selectedCandidato.id, nuevoEstado);
    setSelectedCandidato(prev => prev ? { ...prev, estado: nuevoEstado, resultado: { aprobado, fechaNotificacion: resForm.fechaNotificacion } } : null);
    setShowResModal(false);
    if (aprobado) showMsg('✅ Candidato aprobado. Podés registrarlo como empleado.');
  }

  async function confirmarConversion(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (!convertForm.nombre?.trim())   err.nombre = 'Requerido';
    if (!convertForm.apellido?.trim())  err.apellido = 'Requerido';
    if (!convertForm.cedula?.trim())    err.cedula = 'Requerido';
    if (!convertForm.id_departamento)   err.id_departamento = 'Requerido';
    if (!convertForm.fecha_ingreso)     err.fecha_ingreso = 'Requerido';
    if (!convertForm.salario_base)      err.salario_base = 'Requerido';
    setConvertErr(err);
    if (Object.keys(err).length) { setConvertTab('personal'); return; }
    if (!selectedCandidato) return;
    await fetch('/api/empleados', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(convertForm) });
    await cambiarEstado(selectedCandidato.id, 'Contratado');
    setShowConvertModal(false);
    showMsg('🏢 Empleado registrado en Personal. La inducción quedó pendiente en su perfil.');
  }

  function showMsg(m: string) { setMsg(m); setTimeout(() => setMsg(''), 6000); }

  const filtered = candidatos.filter(c => {
    const ms = !filterEstado || c.estado === filterEstado;
    const mq = !search || `${c.nombre} ${c.apellido || ''} ${c.vacante_titulo || ''}`.toLowerCase().includes(search.toLowerCase());
    return ms && mq;
  });
  const alertas5d = candidatos.filter(c => c.estado === 'Entrevistado' && c.fecha_recepcion &&
    (Date.now() - new Date(c.fecha_recepcion).getTime()) / 86400000 > 5);

  // ── CANDIDATE DETAIL ────────────────────────────────────────────────────────
  if (selectedCandidato) {
    const c = selectedCandidato;
    const paso = STEP_MAP[c.estado] ?? 0;
    return (
      <div className="space-y-4">
        {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}

        {/* Breadcrumb */}
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedCandidato(null)} className="text-sm text-slate-500 hover:text-blue-600">← Volver</button>
          <span className="text-slate-300">·</span>
          <h2 className="text-lg font-bold text-slate-900">{c.nombre} {c.apellido}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(c.estado)}`}>{c.estado}</span>
        </div>

        {/* AI Banner */}
        {c.resumen_ia && (
          <div className="bg-slate-900 rounded-xl p-4 text-white">
            <div className="flex items-start gap-4">
              {c.score_ia != null && <ScoreRing score={c.score_ia} size={64} />}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-semibold text-slate-400 uppercase">Análisis de IA — {c.vacante_titulo}</p>
                  {c.recomendacion_ia && <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${recBadge(c.recomendacion_ia)}`}>{c.recomendacion_ia}</span>}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.resumen_ia}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {c.palabras_clave_match?.map(k => <span key={k} className="bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded text-xs">{k}</span>)}
                  {c.palabras_clave_falta?.map(k => <span key={k} className="bg-red-900/60 text-red-300 px-2 py-0.5 rounded text-xs line-through">{k}</span>)}
                </div>
              </div>
            </div>
            {(c.fortalezas_ia?.length || c.debilidades_ia?.length) && (
              <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700">
                <div>
                  <p className="text-xs font-semibold text-emerald-400 mb-1 uppercase">💪 Fortalezas</p>
                  {c.fortalezas_ia?.map((f, i) => <p key={i} className="text-xs text-slate-300">• {f}</p>)}
                </div>
                <div>
                  <p className="text-xs font-semibold text-amber-400 mb-1 uppercase">⚠️ Áreas de mejora</p>
                  {c.debilidades_ia?.map((d, i) => <p key={i} className="text-xs text-slate-300">• {d}</p>)}
                </div>
              </div>
            )}
            {c.alerta_otras_areas && c.areas_sugeridas?.length && (
              <div className="mt-3 bg-purple-900/40 rounded-lg px-3 py-2">
                <p className="text-xs font-semibold text-purple-300">💡 Fit para otras áreas: <span className="font-normal text-purple-200">{c.areas_sugeridas.join(', ')}</span></p>
              </div>
            )}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl border border-slate-200 px-4 py-3">
          {c.estado !== 'Descartado' && c.estado !== 'Contratado' && (
            <>
              {['Recibido', 'En revisión'].filter(s => s !== c.estado).map(s => (
                <button key={s} onClick={() => cambiarEstado(c.id, s)}
                  className="text-xs text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 font-medium">
                  → {s}
                </button>
              ))}
              <button onClick={() => { setEntForm(c.entrevista || { fecha: '', hora: '', tipo: 'Presencial', responsable: '' }); setShowEntrevistaModal(true); }}
                className="text-xs text-blue-700 border border-blue-200 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {c.entrevista ? 'Editar entrevista' : 'Programar entrevista'}
              </button>
              {c.estado === 'Entrevistado' && (
                <button onClick={() => { setResForm({ aprobado: '', fechaNotificacion: '' }); setShowResModal(true); }}
                  className="text-xs text-purple-700 border border-purple-200 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 font-medium">
                  📋 Registrar resultado
                </button>
              )}
              {c.estado === 'Aprobado' && (
                <button onClick={() => {
                  setConvertForm({ ...emptyConvert(), nombre: c.nombre, apellido: c.apellido || '', cedula: c.cedula || '', correo_corporativo: c.correo || '', telefono: c.telefono || '', genero: c.genero || '' });
                  setConvertErr({}); setConvertTab('personal'); setShowConvertModal(true);
                }}
                  className="text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg font-medium">
                  🏢 Registrar como empleado
                </button>
              )}
              <button onClick={() => { setMotivoDescarte(''); setMotivoError(''); setShowDescartarModal(true); }}
                className="text-xs text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg font-medium ml-auto">
                Descartar
              </button>
            </>
          )}
          {(c.estado === 'Descartado' || c.estado === 'Contratado') && (
            <p className="text-sm text-slate-400 italic">
              {c.estado === 'Contratado' ? '✅ Empleado registrado en Personal' : '❌ Candidato descartado'}
            </p>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-4">
          {/* Left: info */}
          <div className="col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">👤 Información personal</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                {[['Nombres *', 'nombre', 'text'], ['Apellidos *', 'apellido', 'text'], ['Cédula *', 'cedula', 'text'], ['Correo *', 'correo', 'email'], ['Teléfono', 'telefono', 'text']].map(([lbl, key, type]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{lbl}</label>
                    <input type={type} value={(c as any)[key] || ''}
                      onChange={e => setSelectedCandidato(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Género</label>
                  <select value={c.genero || ''} onChange={e => setSelectedCandidato(prev => prev ? { ...prev, genero: e.target.value } : null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Seleccione</option>
                    {['Masculino', 'Femenino', 'Otro'].map(g => <option key={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">📋 Postulación</h3>
              </div>
              <div className="p-5 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cargo *</label>
                  <input value={c.vacante_titulo || ''} disabled className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Fuente *</label>
                  <select value={c.fuente || ''} onChange={e => setSelectedCandidato(prev => prev ? { ...prev, fuente: e.target.value } : null)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    <option value="">Seleccione</option>
                    {['LinkedIn', 'Referido', 'Bolsa de empleo', 'CV-IA', 'Sitio web', 'Otro'].map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Hoja de vida (CV) *</label>
                  <div className="border-2 border-dashed border-emerald-300 bg-emerald-50 rounded-xl p-4 text-center">
                    <FileText className="w-7 h-7 text-emerald-500 mx-auto mb-1" />
                    <p className="text-sm font-medium text-emerald-700">CV adjunto en sistema · Analizado por IA</p>
                    <p className="text-xs text-emerald-500 mt-0.5">{c.fecha_recepcion}</p>
                  </div>
                </div>
              </div>
            </div>
            {c.estado === 'Descartado' && (
              <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">❌ Motivo de descarte (Regla 1.1.8)</p>
                <p className="text-sm text-red-600">{(c as any).motivo_descarte || 'No documentado'}</p>
              </div>
            )}
          </div>

          {/* Right: process */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">🔄 Estado del proceso</h3>
              </div>
              <div className="p-4 space-y-2">
                {STEPS.map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
                      ${i < paso ? 'bg-emerald-500 text-white' : i === paso ? 'bg-blue-600 text-white ring-2 ring-blue-200' : 'bg-slate-100 text-slate-400'}`}>
                      {i < paso ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${i <= paso ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between">
                <h3 className="text-sm font-semibold text-slate-700">📅 Entrevista</h3>
                {c.estado !== 'Descartado' && c.estado !== 'Contratado' && (
                  <button onClick={() => { setEntForm(c.entrevista || { fecha: '', hora: '', tipo: 'Presencial', responsable: '' }); setShowEntrevistaModal(true); }}
                    className="text-xs text-blue-600 hover:underline">{c.entrevista ? 'Editar' : '+ Agregar'}</button>
                )}
              </div>
              <div className="p-4">
                {c.entrevista ? (
                  <div className="space-y-1.5">
                    {[['Fecha', c.entrevista.fecha], ['Hora', c.entrevista.hora], ['Tipo', c.entrevista.tipo], ['Responsable', c.entrevista.responsable]].map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-semibold text-slate-700">{v}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-400 text-center py-3">Sin entrevista programada</p>}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between">
                <h3 className="text-sm font-semibold text-slate-700">📋 Resultado</h3>
                {c.estado === 'Entrevistado' && (
                  <button onClick={() => { setResForm({ aprobado: '', fechaNotificacion: '' }); setShowResModal(true); }}
                    className="text-xs text-blue-600 hover:underline">+ Registrar</button>
                )}
              </div>
              <div className="p-4">
                {(c as any).resultado ? (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{(c as any).resultado.aprobado ? '✅' : '❌'}</span>
                      <span className={`font-bold text-sm ${(c as any).resultado.aprobado ? 'text-emerald-600' : 'text-red-600'}`}>
                        {(c as any).resultado.aprobado ? 'Aprobado' : 'No aprobado'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Notificación: <strong>{(c as any).resultado.fechaNotificacion}</strong></p>
                  </div>
                ) : c.estado === 'Aprobado' ? (
                  <p className="text-xs text-emerald-600 font-semibold text-center py-2">✅ Aprobado</p>
                ) : c.estado === 'Descartado' ? (
                  <p className="text-xs text-red-600 font-semibold text-center py-2">❌ No aprobado</p>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-3">Pendiente</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* MODALS for detail view */}
        {showDescartarModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Descartar candidato — Regla 1.1.8</h3>
                <button onClick={() => setShowDescartarModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-5 space-y-3">
                <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> Campo obligatorio (Regla 1.1.8)
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motivo de descarte *</label>
                  <textarea value={motivoDescarte} onChange={e => { setMotivoDescarte(e.target.value); setMotivoError(''); }} rows={3}
                    placeholder="Motivo de exclusión..."
                    className={`w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none ${motivoError ? 'border-red-400' : 'border-slate-200'}`} />
                  {motivoError && <p className="text-xs text-red-500 mt-0.5">{motivoError}</p>}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowDescartarModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
                  <button onClick={confirmarDescarte} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium">Confirmar descarte</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showEntrevistaModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Programar entrevista</h3>
                <button onClick={() => setShowEntrevistaModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={guardarEntrevista} className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fecha *</label>
                    <input required type="date" value={entForm.fecha} onChange={e => setEntForm({ ...entForm, fecha: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Hora *</label>
                    <input required type="time" value={entForm.hora} onChange={e => setEntForm({ ...entForm, hora: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                    <select value={entForm.tipo} onChange={e => setEntForm({ ...entForm, tipo: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                      {['Presencial', 'Virtual', 'Telefónica'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Responsable *</label>
                    <input required value={entForm.responsable} onChange={e => setEntForm({ ...entForm, responsable: e.target.value })}
                      placeholder="Entrevistador" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowEntrevistaModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">💾 Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showResModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center p-5 border-b border-slate-200">
                <h3 className="font-bold text-slate-900">Registrar resultado</h3>
                <button onClick={() => setShowResModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <form onSubmit={guardarResultado} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">Resultado *</label>
                  <div className="flex gap-3">
                    {[['true', '✅ Aprobado'], ['false', '❌ No aprobado']].map(([v, lbl]) => (
                      <button key={v} type="button" onClick={() => setResForm({ ...resForm, aprobado: v })}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all
                          ${resForm.aprobado === v ? (v === 'true' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700') : 'border-slate-200 text-slate-600'}`}>
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de notificación *</label>
                  <input required type="date" value={resForm.fechaNotificacion} onChange={e => setResForm({ ...resForm, fechaNotificacion: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <p className="text-xs bg-blue-50 text-blue-700 rounded-lg px-3 py-2">⏱ Regla 1.1.8: máximo 5 días hábiles tras la entrevista.</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowResModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
                  <button type="submit" disabled={!resForm.aprobado} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50">💾 Guardar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Convert to employee — full 3-tab form same as Personal */}
        {showConvertModal && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Registro de empleado</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Complete la información del nuevo empleado</p>
                </div>
                <button onClick={() => setShowConvertModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-emerald-600">✅</span>
                <p className="text-xs text-emerald-700 font-medium">Datos pre-llenados desde el análisis de IA. Completá la información laboral para activar el expediente.</p>
              </div>
              <div className="flex border-b border-slate-200 px-5 mt-3">
                {([['personal', '👤 Datos personales'], ['laboral', '💼 Información laboral'], ['emergencia', '📞 Contacto y emergencias']] as const).map(([id, lbl]) => (
                  <button key={id} onClick={() => setConvertTab(id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${convertTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    {lbl}
                  </button>
                ))}
              </div>
              <form onSubmit={confirmarConversion}>
                <div className="p-6">
                  {convertTab === 'personal' && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-3 gap-4">
                        {([['nombre', 'Nombres *'], ['apellido', 'Apellidos *'], ['cedula', 'Número de cédula *']] as const).map(([k, l]) => (
                          <div key={k}>
                            <label className="block text-xs font-medium text-slate-600 mb-1">{l}</label>
                            <input required value={convertForm[k] || ''} onChange={e => setConvertForm({ ...convertForm, [k]: e.target.value })}
                              className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${convertErr[k] ? 'border-red-400' : 'border-slate-200'}`} />
                            {convertErr[k] && <p className="text-xs text-red-500 mt-0.5">{convertErr[k]}</p>}
                          </div>
                        ))}
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de nacimiento</label>
                          <input type="date" value={convertForm.fecha_nacimiento || ''} onChange={e => setConvertForm({ ...convertForm, fecha_nacimiento: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Género</label>
                          <select value={convertForm.genero || ''} onChange={e => setConvertForm({ ...convertForm, genero: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">Seleccione</option>
                            {['Masculino', 'Femenino', 'Otro', 'Prefiero no decir'].map(g => <option key={g}>{g}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Estado civil</label>
                          <select value={convertForm.estado_civil || ''} onChange={e => setConvertForm({ ...convertForm, estado_civil: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">Seleccione</option>
                            {['Soltero/a', 'Casado/a', 'Unido/a', 'Divorciado/a', 'Viudo/a'].map(x => <option key={x}>{x}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Correo corporativo</label>
                          <input type="email" value={convertForm.correo_corporativo || ''} onChange={e => setConvertForm({ ...convertForm, correo_corporativo: e.target.value })}
                            placeholder="nombre@telcopanama.com.pa" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Correo personal</label>
                          <input type="email" value={convertForm.correo_personal || ''} onChange={e => setConvertForm({ ...convertForm, correo_personal: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono</label>
                          <input value={convertForm.telefono || ''} onChange={e => setConvertForm({ ...convertForm, telefono: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <p className="text-xs font-bold text-blue-700 mb-2">📋 Regla 1.1.7 — Campos obligatorios</p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[['nombre', 'Nombres'], ['apellido', 'Apellidos'], ['cedula', 'Cédula'], ['id_departamento', 'Departamento'], ['fecha_ingreso', 'Fecha de ingreso'], ['salario_base', 'Salario base'], ['tipo_contrato', 'Tipo de contrato']].map(([k, l]) => (
                            <div key={k} className="flex items-center gap-2 text-xs">
                              <span className={convertForm[k] ? 'text-emerald-600' : 'text-slate-300'}>{convertForm[k] ? '✓' : '○'}</span>
                              <span className={convertForm[k] ? 'text-slate-700' : 'text-slate-400'}>{l}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {convertTab === 'laboral' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-700">💼 Información laboral</h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Cargo</label>
                          <select value={convertForm.id_cargo || ''} onChange={e => setConvertForm({ ...convertForm, id_cargo: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            <option value="">Seleccione cargo</option>
                            {cargos.filter((ca: any) => !convertForm.id_departamento || ca.id_departamento === Number(convertForm.id_departamento)).map((ca: any) => (
                              <option key={ca.id} value={ca.id}>{ca.titulo}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Departamento *</label>
                          <select required value={convertForm.id_departamento || ''} onChange={e => setConvertForm({ ...convertForm, id_departamento: e.target.value })}
                            className={`w-full border rounded-lg px-3 py-2 text-sm outline-none ${convertErr.id_departamento ? 'border-red-400' : 'border-slate-200'}`}>
                            <option value="">Seleccione</option>
                            {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Fecha de ingreso *</label>
                          <input required type="date" value={convertForm.fecha_ingreso || ''} onChange={e => setConvertForm({ ...convertForm, fecha_ingreso: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de contrato *</label>
                          <select value={convertForm.tipo_contrato || 'Indefinido'} onChange={e => setConvertForm({ ...convertForm, tipo_contrato: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            {['Indefinido', 'Definido', 'Por obra', 'Temporal', 'Pasantía'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Salario base (USD) *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <input required type="number" value={convertForm.salario_base || ''} onChange={e => setConvertForm({ ...convertForm, salario_base: e.target.value })}
                              placeholder="0.00" className={`w-full border rounded-lg pl-7 pr-3 py-2 text-sm outline-none ${convertErr.salario_base ? 'border-red-400' : 'border-slate-200'}`} />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Jornada</label>
                          <select value={convertForm.jornada || 'Completa'} onChange={e => setConvertForm({ ...convertForm, jornada: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            {['Completa', 'Medio tiempo', 'Flexible', 'Nocturna'].map(j => <option key={j}>{j}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Modalidad</label>
                          <select value={convertForm.modalidad || 'Presencial'} onChange={e => setConvertForm({ ...convertForm, modalidad: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                            {['Presencial', 'Híbrido', 'Remoto'].map(m => <option key={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-2">Estado del registro</p>
                        <div className="flex gap-4">
                          {['Activo', 'En periodo de prueba', 'Inactivo'].map(st => (
                            <label key={st} className="flex items-center gap-2 cursor-pointer text-sm">
                              <input type="radio" checked={convertForm.estado === st} onChange={() => setConvertForm({ ...convertForm, estado: st })} className="accent-blue-600" />
                              {st}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  {convertTab === 'emergencia' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-700">📞 Contacto de emergencias</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del contacto</label>
                          <input value={convertForm.contacto_emergencia || ''} onChange={e => setConvertForm({ ...convertForm, contacto_emergencia: e.target.value })}
                            placeholder="Nombre completo" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">Teléfono de emergencia</label>
                          <input value={convertForm.telefono_emergencia || ''} onChange={e => setConvertForm({ ...convertForm, telefono_emergencia: e.target.value })}
                            placeholder="0000-0000" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    {(['personal', 'laboral', 'emergencia'] as const).map(t => (
                      <button key={t} type="button" onClick={() => setConvertTab(t)}
                        className={`w-2 h-2 rounded-full transition-colors ${convertTab === t ? 'bg-blue-600' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowConvertModal(false)} className="px-5 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium">Cancelar</button>
                    {convertTab !== 'emergencia' && (
                      <button type="button" onClick={() => setConvertTab(convertTab === 'personal' ? 'laboral' : 'emergencia')}
                        className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium">Siguiente →</button>
                    )}
                    <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">🏢 Guardar empleado</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── MAIN LIST VIEW ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {msg && <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg px-4 py-2 text-sm">{msg}</div>}
      {alertas5d.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center gap-2 text-sm text-amber-800">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <strong>Alerta — Regla 1.1.8:</strong>&nbsp;{alertas5d.length} candidato(s) llevan más de 5 días sin notificación.
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reclutamiento Inteligente</h2>
          <p className="text-sm text-slate-500 mt-0.5">Convocatorias, análisis de CVs con IA y gestión de candidatos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setShowAnalyzeModal(true); setAnalyzeVacanteId(null); setError(''); }}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Analizar CV con IA
          </button>
          <button onClick={() => setShowVacanteModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nueva convocatoria
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {[{ id: 'vacantes', label: 'Convocatorias' }, { id: 'candidatos', label: 'Candidatos' }].map(t => (
          <button key={t.id} onClick={() => { setView(t.id as any); setSelectedVacante(null); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${view === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
          </button>
        ))}
        {selectedVacante && (
          <button className="px-4 py-2.5 text-sm font-medium border-b-2 border-blue-600 text-blue-600 flex items-center gap-2">
            📋 {selectedVacante.titulo}
            <span onClick={() => { setSelectedVacante(null); setView('vacantes'); }} className="hover:text-red-500 cursor-pointer">×</span>
          </button>
        )}
      </div>

      {view === 'vacantes' && (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: 'Convocatorias abiertas', value: vacantes.filter(v => v.estado === 'Abierta').length, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'CVs recibidos (total)', value: vacantes.reduce((s, v) => s + (v.total_candidatos || 0), 0), color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Convocatorias cerradas', value: vacantes.filter(v => v.estado === 'Cerrada').length, color: 'text-slate-600', bg: 'bg-slate-50' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} rounded-xl p-4 border border-slate-100`}>
                <p className="text-xs text-slate-500">{k.label}</p>
                <p className={`text-3xl font-bold ${k.color} mt-1`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className="space-y-4">
            {vacantes.length === 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">No hay convocatorias creadas</p>
                <button onClick={() => setShowVacanteModal(true)} className="mt-3 text-blue-600 text-sm hover:underline">+ Crear primera convocatoria</button>
              </div>
            )}
            {vacantes.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 bg-gradient-to-r from-slate-800 to-slate-900">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg">{v.titulo}</h3>
                      <p className="text-slate-400 text-sm mt-0.5">{v.departamento_nombre} · {v.fecha_apertura}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.estado === 'Abierta' ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-slate-300'}`}>{v.estado}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {v.palabras_clave?.slice(0, 6).map(k => <span key={k} className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">{k}</span>)}
                    {(v.palabras_clave?.length || 0) > 6 && <span className="text-slate-500 text-xs">+{(v.palabras_clave?.length || 0) - 6}</span>}
                  </div>
                </div>
                <div className="p-4 flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{v.total_candidatos || 0}</p>
                    <p className="text-xs text-slate-400">CVs recibidos</p>
                  </div>
                  {v.salario_ofrecido && <div className="text-sm text-slate-500">${Number(v.salario_ofrecido).toLocaleString()}/mes</div>}
                  <div className="text-center">
                    <p className={`text-lg font-bold ${(v.aprobados_count||0)>=(v.cantidad||1)?'text-emerald-600':'text-purple-600'}`}>
                      {v.aprobados_count||0}/{v.cantidad||1}
                    </p>
                    <p className="text-xs text-slate-400">plazas cubiertas</p>
                  </div>
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => { setAnalyzeVacanteId(v.id); setShowAnalyzeModal(true); setError(''); }}
                      className="flex items-center gap-1 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-100">
                      <Sparkles className="w-3.5 h-3.5" /> Cargar CVs
                    </button>
                    <button onClick={() => { setSelectedVacante(v); setView('candidatos'); }}
                      className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-100">
                      Ver candidatos →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'candidatos' && (
        <div className="space-y-4">
          {selectedVacante && (
            <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-slate-400 text-sm">Convocatoria:</span>
              <span className="text-white font-semibold text-sm">{selectedVacante.titulo}</span>
              <div className="flex flex-wrap gap-1 ml-2">
                {selectedVacante.palabras_clave?.slice(0, 4).map(k => <span key={k} className="bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded text-xs">{k}</span>)}
              </div>
            </div>
          )}
          <div className="grid grid-cols-5 gap-3">
            {['Recibido', 'En revisión', 'Entrevistado', 'Aprobado', 'Descartado'].map(e => (
              <div key={e} className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                <p className="text-2xl font-bold text-slate-800">{candidatos.filter(c => c.estado === e).length}</p>
                <p className="text-xs text-slate-400 mt-0.5">{e}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 flex gap-3 flex-wrap items-center">
            <div className="flex items-center gap-2 flex-1 border border-slate-200 rounded-lg px-3 py-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar candidato..." className="flex-1 text-sm outline-none" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['Todos', 'Recibido', 'En revisión', 'Entrevistado', 'Aprobado', 'Descartado'].map(s => (
                <button key={s} onClick={() => setFilterEstado(s === 'Todos' ? '' : s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${(filterEstado === s || (s === 'Todos' && !filterEstado)) ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
            {poolCandidatos.length > 0 && (
              <button onClick={() => setShowPool(p => !p)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${showPool ? 'bg-amber-600 text-white border-amber-600' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                📁 Pool ({poolCandidatos.length})
              </button>
            )}
          </div>

          {showPool && poolCandidatos.length > 0 && (
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div className="p-4 bg-amber-50 border-b border-amber-100">
                <h3 className="font-semibold text-amber-800 text-sm">📁 Pool de talentos — candidatos con score ≥ 60% de otras convocatorias</h3>
              </div>
              <table className="w-full">
                <thead><tr className="border-b border-amber-100">
                  {['Candidato', 'Convocatoria anterior', 'Score', 'Keywords match', 'Acción'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-amber-700 uppercase">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {poolCandidatos.map((pc: any) => (
                    <tr key={pc.id} className="hover:bg-amber-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">{pc.nombre?.[0]}{pc.apellido?.[0]}</div>
                          <p className="text-sm font-semibold text-slate-800">{pc.nombre} {pc.apellido}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-slate-500">{pc.vacante_titulo || '—'}</td>
                      <td className="px-4 py-2.5 text-sm font-bold text-amber-600">{pc.score_ia}%</td>
                      <td className="px-4 py-2.5 text-sm font-semibold text-blue-600">{pc.keywords_match_count || 0} match</td>
                      <td className="px-4 py-2.5">
                        <button onClick={() => setSelectedCandidato(pc)} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 font-medium">Ver perfil →</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[35%]">Candidato</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[20%]">Cargo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[13%]">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[18%]">Score IA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-[14%]">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center">
                    <Sparkles className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No hay candidatos. Usá "Analizar CV con IA" para agregar.</p>
                  </td></tr>
                )}
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelectedCandidato(c)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {c.nombre[0]}{c.apellido?.[0] || ''}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{c.nombre} {c.apellido}</p>
                          <p className="text-xs text-slate-400 truncate">{c.correo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500 truncate">{c.vacante_titulo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{c.fecha_recepcion}</td>
                    <td className="px-4 py-3">
                      {c.score_ia != null ? (
                        <div className="flex items-center gap-2">
                          <ScoreRing score={c.score_ia} size={36} />
                          {c.recomendacion_ia && <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${recBadge(c.recomendacion_ia)}`}>{c.recomendacion_ia}</span>}
                        </div>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoBadge(c.estado)}`}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400 flex justify-between">
              <span>Mostrando {filtered.length} de {candidatos.length}</span>
              <span>Clic en una fila para ver el detalle</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva convocatoria */}
      {showVacanteModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-900">Nueva convocatoria</h3>
              <button onClick={() => setShowVacanteModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={guardarVacante} className="p-5 space-y-3">
              {error && <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700">{error}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nombre del puesto *</label>
                <input required value={vForm.titulo} onChange={e => setVForm({ ...vForm, titulo: e.target.value })}
                  placeholder="Ej. Desarrollador Full Stack"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                <select value={vForm.id_departamento} onChange={e => setVForm({ ...vForm, id_departamento: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                  <option value="">Seleccione</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descripción del puesto</label>
                <textarea value={vForm.descripcion} onChange={e => setVForm({ ...vForm, descripcion: e.target.value })} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Palabras clave (separadas por coma) *</label>
                <input required value={vForm.palabras_clave} onChange={e => setVForm({ ...vForm, palabras_clave: e.target.value })}
                  placeholder="Java, C++, Python, SQL..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-xs text-slate-400 mt-1">La IA buscará variantes semánticas (ej: SQL → PostgreSQL, MySQL)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Salario ofrecido (USD)</label>
                  <input type="number" value={vForm.salario_ofrecido} onChange={e => setVForm({ ...vForm, salario_ofrecido: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Plazas disponibles *</label>
                  <input type="number" required min="1" value={vForm.cantidad} onChange={e => setVForm({ ...vForm, cantidad: e.target.value })}
                    placeholder="1" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
                  <p className="text-xs text-slate-400 mt-1">Al cubrir todas las plazas se cierra automáticamente.</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Modalidad</label>
                  <select value={vForm.modalidad} onChange={e => setVForm({ ...vForm, modalidad: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none">
                    {['Presencial', 'Híbrido', 'Remoto'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowVacanteModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium">Crear convocatoria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal analizar CV */}
      {showAnalyzeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" />Analizar CV con IA</h3>
              <button onClick={() => { setShowAnalyzeModal(false); setError(''); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={analizarCV} className="p-5 space-y-4">
              {error && <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-700 flex gap-2"><AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}</div>}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Convocatoria *</label>
                <select required value={analyzeVacanteId || ''} onChange={e => setAnalyzeVacanteId(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Seleccione convocatoria</option>
                  {vacantes.filter(v => v.estado === 'Abierta').map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Formato del CV</label>
                <div className="flex bg-slate-100 p-1 rounded-lg mb-3">
                  {[['pdf', '📎 Subir archivo'], ['text', '✏️ Pegar texto']].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setInputType(k as any)}
                      className={`flex-1 text-sm py-1.5 font-medium rounded-md transition-colors ${inputType === k ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-600'}`}>{l}</button>
                  ))}
                </div>
                {inputType === 'pdf' ? (
                  <>
                  <div className="flex items-center gap-2 mb-2">
                    <button type="button" onClick={() => { setBatchMode(false); setPdfFiles([]); setPdfFile(null); }}
                      className={`px-3 py-1 text-xs rounded-lg font-medium border ${!batchMode ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      1 CV
                    </button>
                    <button type="button" onClick={() => { setBatchMode(true); setPdfFile(null); }}
                      className={`px-3 py-1 text-xs rounded-lg font-medium border ${batchMode ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      📦 Carga masiva (múltiples CVs)
                    </button>
                  </div>
                  <div onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center cursor-pointer hover:bg-slate-50">
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt"
                      multiple={batchMode} className="hidden"
                      onChange={e => {
                        if (batchMode) {
                          setPdfFiles(Array.from(e.target.files || []));
                        } else {
                          const f = e.target.files?.[0]; if (f) setPdfFile(f);
                        }
                      }} />
                    {batchMode ? (
                      pdfFiles.length > 0 ? (
                        <div className="space-y-2">
                          <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-lg font-bold mx-auto">{pdfFiles.length}</div>
                          <p className="text-sm font-medium text-slate-700">{pdfFiles.length} archivo{pdfFiles.length>1?'s':''} seleccionado{pdfFiles.length>1?'s':''}</p>
                          <div className="max-h-24 overflow-y-auto text-left bg-slate-50 rounded p-2 space-y-0.5">
                            {pdfFiles.map((f,i) => <p key={i} className="text-xs text-slate-500 truncate">· {f.name}</p>)}
                          </div>
                          <button type="button" onClick={ev => { ev.stopPropagation(); setPdfFiles([]); }}
                            className="text-xs text-red-500 flex items-center gap-1 mx-auto"><Trash2 className="w-3 h-3" />Limpiar</button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-purple-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 font-medium">Seleccioná múltiples CVs a la vez</p>
                          <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, TXT — sin límite</p>
                        </div>
                      )
                    ) : (
                      pdfFile ? (
                        <div className="space-y-2">
                          <FileText className="w-10 h-10 text-blue-500 mx-auto" />
                          <p className="text-sm font-medium text-slate-700">{pdfFile.name}</p>
                          <button type="button" onClick={ev => { ev.stopPropagation(); setPdfFile(null); }}
                            className="text-xs text-red-500 flex items-center gap-1 mx-auto"><Trash2 className="w-3 h-3" />Quitar</button>
                        </div>
                      ) : (
                        <div>
                          <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm text-slate-500 font-medium">Arrastrá o hacé clic</p>
                          <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, TXT</p>
                        </div>
                      )
                    )}
                  </div>
                  {/* Batch progress */}
                  {batchProgress && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                      <div className="flex justify-between text-xs text-purple-700 mb-1">
                        <span>Procesando {batchProgress.current}</span>
                        <span>{batchProgress.done}/{batchProgress.total}</span>
                      </div>
                      <div className="w-full bg-purple-100 rounded-full h-1.5">
                        <div className="bg-purple-600 h-1.5 rounded-full transition-all"
                          style={{width: `${(batchProgress.done/batchProgress.total)*100}%`}} />
                      </div>
                    </div>
                  )}
                  </>
                ) : (
                  <textarea value={cvTexto} onChange={e => setCvTexto(e.target.value)} rows={6}
                    placeholder="Pegá el contenido del CV aquí..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none resize-none" />
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowAnalyzeModal(false); setError(''); }} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
                {batchMode && inputType === 'pdf' ? (
                  <button type="button" onClick={analizarBatch}
                    disabled={isAnalyzing || pdfFiles.length === 0 || !analyzeVacanteId}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {isAnalyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</> : <><Sparkles className="w-4 h-4" />Analizar {pdfFiles.length} CV{pdfFiles.length>1?'s':''}</>}
                  </button>
                ) : (
                  <button type="submit" disabled={isAnalyzing || (!pdfFile && !cvTexto)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                    {isAnalyzing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analizando...</> : <><Sparkles className="w-4 h-4" />Analizar con IA</>}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
