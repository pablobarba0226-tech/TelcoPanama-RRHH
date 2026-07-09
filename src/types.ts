// ── TelcoPanamá RRHH — Types ──────────────────────────────────────────────────

export interface Empresa {
  nombre: string; mision: string; vision: string; valores: string;
  ruc: string; direccion: string; telefono: string; email: string;
}

export interface Departamento {
  id: number; nombre: string; codigo: string; descripcion?: string;
  total_empleados?: number;
}

export interface Cargo {
  id: number; titulo: string; id_departamento?: number; nivel?: string;
  salario_min?: number; salario_max?: number;
}

export interface Empleado {
  id: number; codigo_empleado: string; nombre: string; apellido: string;
  cedula: string; correo_corporativo?: string; correo_personal?: string;
  telefono?: string; fecha_nacimiento?: string; genero?: string;
  id_departamento?: number; departamento_nombre?: string;
  id_cargo?: number; cargo_titulo?: string;
  id_supervisor?: number; supervisor_nombre?: string;
  fecha_ingreso: string; fecha_salida?: string;
  tipo_contrato?: string; jornada?: string;
  salario_base: number; estado: string; modalidad?: string;
  hora_entrada?: string; hora_salida?: string;
  foto_url?: string;
  dias_pendientes?: number;
}

export interface ItemInduccion {
  id_item: number; nombre: string; descripcion?: string;
  obligatorio: boolean; completado: boolean;
  fecha_completado?: string; observaciones?: string;
}

export interface RegistroAsistencia {
  id: number; id_empleado: number; empleado_nombre?: string;
  departamento?: string; cargo?: string;
  fecha: string; hora_entrada?: string; hora_salida?: string;
  estado: 'Presente' | 'Ausente' | 'Tardanza' | 'Vacaciones' | 'Licencia' | 'Feriado';
  minutos_tardanza: number; justificado: boolean;
  tipo_justificante?: string; observaciones?: string;
}

export interface SolicitudPermiso {
  id: number; id_empleado: number; empleado_nombre?: string;
  departamento?: string; tipo: string;
  fecha_inicio: string; fecha_fin: string; dias_solicitados?: number;
  motivo?: string; estado: string;
  aprobado_por?: number; aprobador_nombre?: string;
  comentario_rrhh?: string; creado_en?: string;
}

export interface Vacante {
  id: number; titulo: string; id_departamento?: number;
  departamento_nombre?: string; descripcion?: string; requisitos?: string;
  palabras_clave?: string[]; salario_ofrecido?: number;
  modalidad?: string; cantidad?: number;
  fecha_apertura?: string; fecha_cierre?: string; estado: string;
  total_candidatos?: number; contratados?: number;
}

export interface Candidato {
  id: number; id_vacante?: number; vacante_titulo?: string;
  nombre: string; apellido?: string; correo?: string; telefono?: string;
  palabras_clave_match?: string[]; palabras_clave_falta?: string[];
  score_ia?: number; recomendacion_ia?: 'ENTREVISTAR' | 'REVISAR' | 'DESCARTAR';
  resumen_ia?: string; fortalezas_ia?: string[]; debilidades_ia?: string[];
  alerta_otras_areas?: boolean; areas_sugeridas?: string[];
  estado: string; fuente?: string; fecha_recepcion?: string;
}

export interface Capacitacion {
  id: number; titulo: string; descripcion?: string; proveedor?: string;
  tipo?: string; modalidad?: string; duracion_horas?: number; costo?: number;
  fecha_inicio?: string; fecha_fin?: string; estado: string;
  max_participantes?: number; id_departamento?: number; departamento_nombre?: string;
  inscritos?: number; completados?: number; nota_promedio?: number;
  estado_aprobacion?: string;
}

export interface Participante {
  id: number; id_capacitacion: number; id_empleado: number;
  empleado_nombre?: string; departamento?: string;
  estado: string; nota_evaluacion?: number; aprobado?: boolean;
  fecha_completado?: string; observaciones?: string;
}

export interface EvaluacionDesempeno {
  id: number; id_empleado: number; empleado_nombre?: string;
  departamento?: string; cargo?: string; id_evaluador?: number;
  evaluador_nombre?: string; periodo: string; tipo?: string;
  puntaje_liderazgo?: number; puntaje_trabajo_equipo?: number;
  puntaje_comunicacion?: number; puntaje_iniciativa?: number;
  puntaje_tecnico?: number; puntaje_cumplimiento?: number;
  proyectos_asignados?: number; proyectos_entregados?: number;
  promedio?: number; estado: string; plan_mejora?: string;
  firma_empleado?: boolean; firma_supervisor?: boolean; comentarios?: string;
}

export interface Alerta {
  id: number; tipo: string; titulo: string; descripcion?: string;
  nivel: 'info' | 'warning' | 'critical';
  empleado_nombre?: string; departamento_nombre?: string;
  valor_detectado?: number; umbral_configurado?: number;
  estado: string; fecha_generada: string;
}

export interface DashboardStats {
  totalEmpleados: number; vacantesAbiertas: number;
  capacitacionesCompletadas: number; alertasNuevas: number;
}

// Reporte types
export interface ReporteAsistenciaDia {
  registros: RegistroAsistencia[];
  resumen: { total: number; presentes: number; tardanzas: number; ausentes: number; vacaciones: number; promedio_tardanza: number; };
}

export interface ReporteAsistenciaMensual {
  por_empleado: Array<{ empleado: string; departamento: string; dias_laborables: number; presentes: number; tardanzas: number; ausencias_injust: number; pct_asistencia: number; }>;
  por_dia: Array<{ fecha: string; total: number; pct: number; }>;
}

export interface ReporteMetricasPersonal {
  empleados: Array<{ empleado: string; departamento: string; cargo: string; promedio_evaluacion?: number; proyectos_asignados?: number; proyectos_entregados?: number; pct_entrega?: number; tardanzas_mes?: number; ausencias_mes?: number; }>;
}

export interface ReporteRotacion {
  mensual: Array<{ mes: string; tipo: string; cantidad: number; }>;
  motivos: Array<{ tipo: string; cantidad: number; }>;
  por_departamento: Array<{ departamento: string; ingresos_6m: number; salidas_6m: number; }>;
}
