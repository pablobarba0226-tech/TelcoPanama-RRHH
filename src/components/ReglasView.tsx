import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, BookOpen, Users, Clock, GraduationCap, LogOut, Star, Umbrella, Shield, FileText } from 'lucide-react';

interface Regla {
  id: string;
  titulo: string;
  descripcion: string;
  detalle?: string[];
}

interface Seccion {
  id: string;
  titulo: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  reglas: Regla[];
}

const SECCIONES: Seccion[] = [
  {
    id: 'reclutamiento',
    titulo: 'Reclutamiento y Selección',
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    reglas: [
      { id: '1.1.1', titulo: 'Apertura de convocatoria', descripcion: 'Toda convocatoria debe estar aprobada por el Gerente de RRHH antes de publicarse.', detalle: ['Se requiere justificación de la vacante','Debe incluir descripción del cargo, requisitos y salario referencial','El departamento solicitante debe firmar la solicitud de personal'] },
      { id: '1.1.2', titulo: 'Análisis de CV con IA', descripcion: 'El sistema de IA evalúa CVs con base en keywords semánticas definidas en la convocatoria.', detalle: ['Score ≥ 60% → candidato pasa a revisión manual','Score < 60% → descartado automáticamente','Candidatos descartados con score ≥ 60% ingresan al Pool de Talentos'] },
      { id: '1.1.3', titulo: 'Pool de Talentos', descripcion: 'Candidatos con buen perfil que no fueron seleccionados para una vacante específica quedan disponibles para futuras convocatorias.', detalle: ['El pool es prioritario para nuevas vacantes similares','Los datos se conservan por 12 meses','El candidato puede ser contactado directamente desde el sistema'] },
      { id: '1.1.4', titulo: 'Proceso de entrevistas', descripcion: 'Todo candidato aprobado por IA debe pasar por al menos una entrevista presencial o virtual.', detalle: ['El resultado de la entrevista debe documentarse en el sistema','Se puede agendar hasta 3 entrevistas por candidato','El evaluador debe registrar fortalezas, debilidades y recomendación'] },
      { id: '1.1.5', titulo: 'Notificación de resultado', descripcion: 'El candidato debe ser notificado del resultado en un máximo de 5 días hábiles post-entrevista.', detalle: ['El motivo de descarte debe quedar documentado (Regla 1.1.8)','Los candidatos aprobados pasan automáticamente a registro de empleado','El sistema genera el código EMP-XXXX automáticamente'] },
    ]
  },
  {
    id: 'personal',
    titulo: 'Gestión de Personal',
    icon: FileText,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    reglas: [
      { id: '1.1.6', titulo: 'Registro obligatorio de empleado', descripcion: 'Todo empleado debe tener registrados al menos 6 campos obligatorios antes de activar su expediente.', detalle: ['Nombres y apellidos completos','Número de cédula panameña','Departamento asignado','Fecha de ingreso','Salario base','Tipo de contrato'] },
      { id: '1.1.7', titulo: 'Proceso de inducción', descripcion: 'Todo empleado nuevo debe completar el proceso de inducción en los primeros 30 días.', detalle: ['6 ítems del checklist deben completarse en orden','El supervisor debe firmar la finalización','Empleados con inducción < 100% aparecen en alertas'] },
      { id: '1.1.8', titulo: 'Inducción técnica al puesto', descripcion: 'Además de la inducción general, cada departamento debe realizar una inducción técnica específica al cargo.', detalle: ['Duración mínima: 2 días','Debe incluir presentación de herramientas y sistemas del área','El jefe inmediato es responsable de esta inducción'] },
    ]
  },
  {
    id: 'asistencia',
    titulo: 'Control de Asistencia',
    icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    reglas: [
      { id: '2.1.1', titulo: 'Horario estándar', descripcion: 'El horario laboral estándar es de 08:00 a 17:00, lunes a viernes.', detalle: ['Entrada después de las 08:00 se registra como tardanza','Más de 15 minutos de tardanza requiere justificación','Registro de salida antes de las 16:45 requiere autorización'] },
      { id: '2.1.2', titulo: 'Threshold de tardanzas', descripcion: 'Más de 3 tardanzas injustificadas en un mes activa una alerta automática.', detalle: ['1-2 tardanzas: registro en expediente','3 tardanzas: alerta a supervisor','5+ tardanzas: proceso disciplinario'] },
      { id: '2.1.3', titulo: 'Threshold de ausencias', descripcion: 'Más de 2 ausencias injustificadas en el mes activan una alerta crítica.', detalle: ['Toda ausencia debe justificarse antes de las 10:00 AM del mismo día','Ausencias médicas requieren certificado del seguro social','Ausencias no justificadas se descuentan del salario'] },
    ]
  },
  {
    id: 'vacaciones',
    titulo: 'Vacaciones y Permisos',
    icon: Umbrella,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    reglas: [
      { id: '3.1.1', titulo: 'Acumulación de vacaciones', descripcion: 'Las vacaciones se acumulan según la fórmula: (30 días ÷ 11 meses) × Meses Trabajados.', detalle: ['30 días de vacaciones por cada 11 meses trabajados','Acumulación mensual: 2.727 días por mes','No se pueden tomar vacaciones en los primeros 90 días de contrato'] },
      { id: '3.1.2', titulo: 'Alerta de vacaciones pendientes', descripcion: 'Empleados con más de 15 días de vacaciones acumuladas sin tomar aparecen en alerta en el reporte de vacaciones.', detalle: ['Entre 10-15 días: zona de riesgo (alerta amarilla)','Más de 15 días: estado crítico (alerta roja)','El costo pasivo se calcula como: (salario/30) × días pendientes'] },
      { id: '3.1.3', titulo: 'Solicitud de permisos', descripcion: 'Todo permiso debe solicitarse con al menos 5 días hábiles de anticipación.', detalle: ['Excepciones médicas: notificar el mismo día con certificado','Permisos por duelo: hasta 5 días sin descuento de vacaciones','Permisos personales: se descuentan del saldo de vacaciones'] },
    ]
  },
  {
    id: 'desarrollo',
    titulo: 'Capacitación y Desarrollo',
    icon: GraduationCap,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    reglas: [
      { id: '4.1.1', titulo: 'Aprobación de capacitaciones', descripcion: 'Toda capacitación debe ser aprobada por RRHH antes de realizarse.', detalle: ['El departamento solicitante envía propuesta con costo y justificación','RRHH aprueba o rechaza en máximo 3 días hábiles','Capacitaciones externas con costo > $500 requieren aprobación gerencial'] },
      { id: '4.1.2', titulo: 'Nota mínima de aprobación', descripcion: 'La nota mínima para aprobar una capacitación es de 71/100.', detalle: ['Nota ≥ 71: aprobado, se registra en expediente del empleado','Nota < 71: reprobado, se genera recomendación de refuerzo','Nota ≥ 90: excelente desempeño, se anota en evaluación'] },
      { id: '4.1.3', titulo: 'Evaluaciones de desempeño', descripcion: 'Las evaluaciones se realizan por cuatrimestre: C1 (Ene-Abr), C2 (May-Ago), C3 (Sep-Dic).', detalle: ['6 competencias evaluadas en escala 1-5','Promedio < 2.5 activa plan de mejora obligatorio','Promedio ≥ 4.0 registra al empleado como candidato a ascenso','El empleado y supervisor deben firmar la evaluación'] },
      { id: '4.1.4', titulo: 'Plan de mejora', descripcion: 'Todo empleado con promedio de evaluación < 2.5 debe tener un plan de mejora documentado.', detalle: ['El plan debe definirse en máximo 5 días tras la evaluación','Incluye: acciones concretas, plazos y responsables','Seguimiento mensual por parte del supervisor directo','Si en 2 cuatrimestres consecutivos < 2.5, se inicia proceso disciplinario'] },
    ]
  },
  {
    id: 'salida',
    titulo: 'Proceso de Salida',
    icon: LogOut,
    color: 'text-red-600',
    bg: 'bg-red-50',
    reglas: [
      { id: '5.1.1', titulo: 'Preaviso de renuncia', descripcion: 'El empleado que renuncia voluntariamente debe dar un preaviso mínimo de 15 días calendario.', detalle: ['El preaviso debe entregarse por escrito al supervisor y RRHH','Si no se cumple, la empresa puede descontar el equivalente del salario','Excepciones: acoso laboral documentado, enfermedad grave'] },
      { id: '5.1.2', titulo: 'Cierre de accesos', descripcion: 'El cierre de todos los accesos del empleado debe realizarse el mismo día de la baja efectiva.', detalle: ['Acceso al sistema ERP/RRHH','Correo corporativo','VPN y accesos remotos','Tarjetas de acceso físico','El responsable de TI firma el cierre en el sistema'] },
      { id: '5.1.3', titulo: 'Entrega de activos', descripcion: 'Todo activo asignado al empleado debe devolverse y quedar documentado con firma de conformidad.', detalle: ['Laptop / computadora','Carnet de identificación','Teléfono corporativo','Llaves y tarjetas de acceso','Sin devolución documentada: la empresa puede iniciar proceso de cobro por reposición'] },
      { id: '5.1.4', titulo: 'Entrevista de salida', descripcion: 'RRHH debe realizar una entrevista de salida para documentar las razones de la desvinculación.', detalle: ['Es voluntaria para el empleado','Los resultados alimentan el análisis de rotación','Se analizan mensualmente para identificar patrones de fuga de talento'] },
    ]
  },
  {
    id: 'alertas',
    titulo: 'Thresholds y Alertas Automáticas',
    icon: Shield,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    reglas: [
      { id: '6.1.1', titulo: 'Alertas de asistencia', descripcion: 'El sistema genera alertas automáticas cuando se superan los umbrales de ausentismo.', detalle: ['> 3 tardanzas/mes → alerta warning','> 2 ausencias injustificadas/mes → alerta critical','Tasa de asistencia departamental < 85% → alerta al gerente'] },
      { id: '6.1.2', titulo: 'Alertas de desempeño', descripcion: 'Las evaluaciones bajas generan alertas automáticas al supervisor.', detalle: ['Promedio evaluación < 2.5 → alerta critical','% entrega de proyectos < 70% → alerta warning','Sin evaluación en el período → alerta info'] },
      { id: '6.1.3', titulo: 'Alertas de vacaciones', descripcion: 'El sistema alerta cuando los saldos de vacaciones superan los umbrales.', detalle: ['Días pendientes > 10 → zona de riesgo (amarillo)','Días pendientes > 15 → estado crítico (rojo)','El costo pasivo acumulado se reporta mensualmente a gerencia financiera'] },
    ]
  },
];

export default function ReglasView() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ reclutamiento: true });
  const [expandedRegla, setExpandedRegla] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));
  const toggleRegla = (id: string) => setExpandedRegla(p => p === id ? null : id);

  const filtered = SECCIONES.map(sec => ({
    ...sec,
    reglas: sec.reglas.filter(r =>
      !search ||
      r.id.includes(search.toLowerCase()) ||
      r.titulo.toLowerCase().includes(search.toLowerCase()) ||
      r.descripcion.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(sec => sec.reglas.length > 0);

  const totalReglas = SECCIONES.reduce((s, sec) => s + sec.reglas.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reglamento Interno</h2>
          <p className="text-sm text-slate-500 mt-0.5">TelcoPanamá S.A. — Compendio de políticas y reglas de la empresa · {totalReglas} reglas</p>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-blue-700">Manual RRHH v2.0</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar regla por número, título o descripción... (ej: 1.1.6, vacaciones, tardanza)"
          className="flex-1 text-sm outline-none text-slate-700 placeholder:text-slate-400" />
        {search && (
          <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
        )}
      </div>

      {/* Summary badges */}
      <div className="flex gap-2 flex-wrap">
        {SECCIONES.map(sec => {
          const Icon = sec.icon;
          return (
            <button key={sec.id} onClick={() => { setSearch(''); toggle(sec.id); document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                ${expanded[sec.id] ? `${sec.bg} ${sec.color} border-current` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
              <Icon className="w-3.5 h-3.5" />
              {sec.titulo}
            </button>
          );
        })}
      </div>

      {/* Sections */}
      {filtered.map(sec => {
        const Icon = sec.icon;
        return (
          <div key={sec.id} id={sec.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Section header */}
            <button onClick={() => toggle(sec.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${expanded[sec.id] ? sec.bg : 'hover:bg-slate-50'}`}>
              <div className={`w-9 h-9 rounded-lg ${sec.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`w-5 h-5 ${sec.color}`} />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold ${expanded[sec.id] ? sec.color : 'text-slate-800'}`}>{sec.titulo}</h3>
                <p className="text-xs text-slate-400">{sec.reglas.length} reglas</p>
              </div>
              {expanded[sec.id]
                ? <ChevronDown className={`w-5 h-5 ${sec.color}`} />
                : <ChevronRight className="w-5 h-5 text-slate-400" />}
            </button>

            {/* Rules */}
            {expanded[sec.id] && (
              <div className="divide-y divide-slate-100">
                {sec.reglas.map(regla => (
                  <div key={regla.id} className="px-5 py-0">
                    <button onClick={() => toggleRegla(regla.id)}
                      className="w-full flex items-start gap-4 py-4 text-left hover:bg-slate-50 -mx-5 px-5 transition-colors">
                      {/* Rule number badge */}
                      <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${sec.bg} ${sec.color} border border-current/20`}>
                        {regla.id}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800">{regla.titulo}</p>
                        <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{regla.descripcion}</p>
                      </div>
                      {regla.detalle && (
                        expandedRegla === regla.id
                          ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                          : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                      )}
                    </button>

                    {/* Detail */}
                    {expandedRegla === regla.id && regla.detalle && (
                      <div className={`mb-4 ml-16 rounded-xl p-4 ${sec.bg} border border-current/10`}>
                        <ul className="space-y-2">
                          {regla.detalle.map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className={`${sec.color} font-bold shrink-0 mt-0.5`}>•</span>
                              <span className="text-slate-700">{d}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No se encontraron reglas para "{search}"</p>
          <button onClick={() => setSearch('')} className="mt-2 text-blue-500 text-sm hover:underline">Limpiar búsqueda</button>
        </div>
      )}
    </div>
  );
}
