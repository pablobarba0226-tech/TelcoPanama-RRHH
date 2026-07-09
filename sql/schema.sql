-- ============================================================
-- TELCOPANAMÁ S.A. — Sistema de Gestión de Recursos Humanos
-- Base de Datos PostgreSQL — Schema Completo
-- Versión 1.0 | 2025
-- ============================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas de texto

-- ============================================================
-- 1. EMPRESA Y ESTRUCTURA ORGANIZACIONAL
-- ============================================================

CREATE TABLE empresa (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(200) NOT NULL DEFAULT 'TelcoPanamá S.A.',
    ruc             VARCHAR(50) UNIQUE,
    mision          TEXT,
    vision          TEXT,
    valores         TEXT,
    direccion       TEXT,
    telefono        VARCHAR(30),
    email           VARCHAR(100),
    logo_url        TEXT,
    fecha_fundacion DATE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- Seed empresa
INSERT INTO empresa (nombre, ruc, mision, vision, valores, direccion, telefono, email, fecha_fundacion)
VALUES (
    'TelcoPanamá S.A.',
    '155-789-1-2020',
    'Conectar a los panameños con tecnología de telecomunicaciones de clase mundial, ofreciendo servicios de voz, datos e internet con la más alta calidad, confiabilidad y accesibilidad.',
    'Ser la empresa de telecomunicaciones líder en Panamá para 2030, reconocida por su innovación tecnológica, excelencia en servicio al cliente y su impacto positivo en el desarrollo digital del país.',
    'Innovación, Integridad, Excelencia en servicio, Trabajo en equipo, Responsabilidad social',
    'Área Bancaria, Calle 50, Torre TelcoPanamá, Piso 12, Ciudad de Panamá',
    '+507 300-5000',
    'contacto@telcopanama.com.pa',
    '2020-03-15'
);

-- ────────────────────────────────────────────────────────────
-- Departamentos
-- ────────────────────────────────────────────────────────────
CREATE TABLE departamentos (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    codigo          VARCHAR(20)  UNIQUE NOT NULL,
    descripcion     TEXT,
    presupuesto     NUMERIC(14,2),
    id_jefe         INTEGER,        -- FK a empleados (circular, se agrega después)
    id_padre        INTEGER REFERENCES departamentos(id) ON DELETE SET NULL,
    activo          BOOLEAN DEFAULT TRUE,
    creado_en       TIMESTAMPTZ DEFAULT NOW()
);

-- Departamentos TelcoPanamá
INSERT INTO departamentos (nombre, codigo, descripcion) VALUES
('Dirección General',           'DIR',    'Alta dirección y gobierno corporativo'),
('Recursos Humanos',            'RRHH',   'Gestión del talento humano'),
('Tecnología e Infraestructura','TI',     'Redes, sistemas y TI'),
('Operaciones de Red',          'OPED',   'Operación y mantenimiento de red'),
('Ventas y Comercial',          'VEN',    'Fuerza de ventas y canal comercial'),
('Atención al Cliente',         'ATC',    'Soporte y servicio postventa'),
('Marketing y Producto',        'MKT',    'Estrategia de producto y marketing'),
('Finanzas y Contabilidad',     'FIN',    'Gestión financiera y contable'),
('Legal y Cumplimiento',        'LEG',    'Asesoría legal y cumplimiento regulatorio'),
('Proyectos e Ingeniería',      'ING',    'Gestión de proyectos de expansión de red'),
('Logística y Almacén',         'LOG',    'Gestión de inventarios y cadena de suministro'),
('Seguridad Corporativa',       'SEG',    'Seguridad física y de la información');

-- ────────────────────────────────────────────────────────────
-- Cargos / Posiciones
-- ────────────────────────────────────────────────────────────
CREATE TABLE cargos (
    id                  SERIAL PRIMARY KEY,
    titulo              VARCHAR(150) NOT NULL,
    id_departamento     INTEGER REFERENCES departamentos(id),
    nivel               VARCHAR(50) CHECK (nivel IN ('Directivo','Gerencial','Jefatura','Profesional','Técnico','Operativo','Administrativo')),
    salario_min         NUMERIC(10,2),
    salario_max         NUMERIC(10,2),
    descripcion         TEXT,
    requisitos          TEXT,        -- Habilidades/certificaciones requeridas
    activo              BOOLEAN DEFAULT TRUE,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. EMPLEADOS (tabla central)
-- ============================================================

CREATE TABLE empleados (
    id                  SERIAL PRIMARY KEY,
    codigo_empleado     VARCHAR(20) UNIQUE NOT NULL,   -- EMP-0001
    nombre              VARCHAR(100) NOT NULL,
    apellido            VARCHAR(100) NOT NULL,
    cedula              VARCHAR(30)  UNIQUE NOT NULL,
    pasaporte           VARCHAR(30),
    correo_corporativo  VARCHAR(150) UNIQUE,
    correo_personal     VARCHAR(150),
    telefono            VARCHAR(30),
    telefono_emergencia VARCHAR(30),
    contacto_emergencia VARCHAR(150),
    fecha_nacimiento    DATE,
    genero              VARCHAR(20) CHECK (genero IN ('Masculino','Femenino','Otro','Prefiero no decir')),
    estado_civil        VARCHAR(30),
    nacionalidad        VARCHAR(60) DEFAULT 'Panameña',
    direccion           TEXT,
    foto_url            TEXT,

    -- Información laboral
    id_departamento     INTEGER REFERENCES departamentos(id),
    id_cargo            INTEGER REFERENCES cargos(id),
    id_supervisor       INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
    fecha_ingreso       DATE NOT NULL,
    fecha_salida        DATE,
    tipo_contrato       VARCHAR(50) CHECK (tipo_contrato IN ('Indefinido','Definido','Por obra','Temporal','Pasantía')),
    jornada             VARCHAR(30) CHECK (jornada IN ('Completa','Medio tiempo','Flexible','Nocturna')),
    salario_base        NUMERIC(10,2) NOT NULL DEFAULT 0,
    estado              VARCHAR(30) DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Vacaciones','Licencia','Suspendido')),
    modalidad           VARCHAR(30) CHECK (modalidad IN ('Presencial','Híbrido','Remoto')),

    -- Horario
    hora_entrada        TIME DEFAULT '08:00',
    hora_salida         TIME DEFAULT '17:00',

    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ DEFAULT NOW()
);

-- FK circular departamentos → empleados (jefe)
ALTER TABLE departamentos ADD CONSTRAINT fk_dept_jefe
    FOREIGN KEY (id_jefe) REFERENCES empleados(id) ON DELETE SET NULL;

-- ============================================================
-- 3. ORGANIGRAMA (relación jerárquica extendida)
-- ============================================================

CREATE TABLE organigrama (
    id              SERIAL PRIMARY KEY,
    id_empleado     INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    id_reporta_a    INTEGER REFERENCES empleados(id) ON DELETE SET NULL,
    nivel_jerarquico INTEGER DEFAULT 1,  -- 1=CEO, 2=Gerente, 3=Jefe, etc.
    activo          BOOLEAN DEFAULT TRUE,
    desde           DATE DEFAULT CURRENT_DATE,
    hasta           DATE
);

-- ============================================================
-- 4. RECLUTAMIENTO Y SELECCIÓN
-- ============================================================

CREATE TABLE vacantes (
    id                  SERIAL PRIMARY KEY,
    titulo              VARCHAR(150) NOT NULL,
    id_departamento     INTEGER REFERENCES departamentos(id),
    id_cargo            INTEGER REFERENCES cargos(id),
    descripcion         TEXT,
    requisitos          TEXT,
    palabras_clave      TEXT[],         -- Array de keywords para IA
    salario_ofrecido    NUMERIC(10,2),
    modalidad           VARCHAR(30),
    cantidad            INTEGER DEFAULT 1,
    fecha_apertura      DATE DEFAULT CURRENT_DATE,
    fecha_cierre        DATE,
    estado              VARCHAR(30) DEFAULT 'Abierta' CHECK (estado IN ('Abierta','En proceso','Cerrada','Cancelada')),
    creado_por          INTEGER REFERENCES empleados(id),
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE candidatos (
    id                  SERIAL PRIMARY KEY,
    id_vacante          INTEGER REFERENCES vacantes(id) ON DELETE SET NULL,
    nombre              VARCHAR(200) NOT NULL,
    apellido            VARCHAR(200),
    correo              VARCHAR(150),
    telefono            VARCHAR(30),
    cedula              VARCHAR(30),
    cv_url              TEXT,
    cv_texto            TEXT,           -- Texto extraído del CV para IA
    palabras_clave_match TEXT[],        -- Keywords encontradas en el CV
    palabras_clave_falta TEXT[],        -- Keywords ausentes
    score_ia            SMALLINT CHECK (score_ia BETWEEN 0 AND 100),
    recomendacion_ia    VARCHAR(30) CHECK (recomendacion_ia IN ('ENTREVISTAR','REVISAR','DESCARTAR')),
    resumen_ia          TEXT,
    fortalezas_ia       TEXT[],
    debilidades_ia      TEXT[],
    alerta_otras_areas  BOOLEAN DEFAULT FALSE,  -- IA sugiere fit para otro departamento
    areas_sugeridas     TEXT[],
    estado              VARCHAR(30) DEFAULT 'Recibido' CHECK (estado IN ('Recibido','En revisión','Entrevistado','Aprobado','Descartado','Contratado')),
    motivo_descarte     TEXT,
    fuente              VARCHAR(80),    -- LinkedIn, Referido, Bolsa de empleo, IA-CV, etc.
    fecha_recepcion     DATE DEFAULT CURRENT_DATE,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE entrevistas (
    id                  SERIAL PRIMARY KEY,
    id_candidato        INTEGER REFERENCES candidatos(id) ON DELETE CASCADE,
    id_entrevistador    INTEGER REFERENCES empleados(id),
    fecha               DATE NOT NULL,
    hora                TIME NOT NULL,
    tipo                VARCHAR(30) CHECK (tipo IN ('Presencial','Virtual','Telefónica')),
    estado              VARCHAR(30) DEFAULT 'Programada' CHECK (estado IN ('Programada','Realizada','Cancelada','No se presentó')),
    resultado           VARCHAR(30) CHECK (resultado IN ('Aprobado','No aprobado','Pendiente')),
    notas               TEXT,
    fecha_notificacion  DATE,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. INDUCCIÓN
-- ============================================================

CREATE TABLE plantillas_induccion (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    descripcion     TEXT,
    activo          BOOLEAN DEFAULT TRUE
);

CREATE TABLE items_induccion (
    id                  SERIAL PRIMARY KEY,
    id_plantilla        INTEGER REFERENCES plantillas_induccion(id) ON DELETE CASCADE,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    orden               INTEGER DEFAULT 1,
    obligatorio         BOOLEAN DEFAULT TRUE
);

-- Plantilla estándar TelcoPanamá
INSERT INTO plantillas_induccion (nombre, descripcion) VALUES
('Inducción Estándar TelcoPanamá', 'Proceso de bienvenida para todos los empleados nuevos');

INSERT INTO items_induccion (id_plantilla, nombre, orden) VALUES
(1, 'Presentación de políticas internas y reglamento', 1),
(1, 'Recorrido de instalaciones y seguridad', 2),
(1, 'Entrega de equipos y herramientas de trabajo', 3),
(1, 'Asignación de accesos y credenciales del sistema', 4),
(1, 'Inducción técnica al puesto', 5),
(1, 'Presentación al equipo de trabajo', 6);

CREATE TABLE induccion_empleado (
    id                  SERIAL PRIMARY KEY,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    id_item             INTEGER REFERENCES items_induccion(id),
    completado          BOOLEAN DEFAULT FALSE,
    fecha_completado    DATE,
    observaciones       TEXT,
    UNIQUE(id_empleado, id_item)
);

-- ============================================================
-- 6. CONTROL DIARIO — ASISTENCIA
-- ============================================================

CREATE TABLE registros_asistencia (
    id                  SERIAL PRIMARY KEY,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    fecha               DATE NOT NULL,
    hora_entrada        TIME,
    hora_salida         TIME,
    estado              VARCHAR(30) NOT NULL CHECK (estado IN ('Presente','Ausente','Tardanza','Vacaciones','Licencia','Feriado')),
    minutos_tardanza    INTEGER DEFAULT 0,
    justificado         BOOLEAN DEFAULT FALSE,
    tipo_justificante   VARCHAR(60) CHECK (tipo_justificante IN ('Incapacidad médica','Duelo familiar','Permiso escrito','Calamidad doméstica','Permiso sin goce','Otro')),
    justificante_url    TEXT,
    fecha_limite_just   DATE,   -- +48h hábiles para entregar justificante
    observaciones       TEXT,
    registrado_por      INTEGER REFERENCES empleados(id),
    creado_en           TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(id_empleado, fecha)
);

-- ============================================================
-- 7. VACACIONES Y AUSENCIAS
-- ============================================================

CREATE TABLE saldos_vacaciones (
    id                  SERIAL PRIMARY KEY,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE UNIQUE,
    dias_acumulados     NUMERIC(6,2) DEFAULT 0,   -- 2.5 días/mes
    dias_tomados        NUMERIC(6,2) DEFAULT 0,
    dias_pendientes     NUMERIC(6,2) GENERATED ALWAYS AS (dias_acumulados - dias_tomados) STORED,
    ultima_actualizacion DATE DEFAULT CURRENT_DATE
);

CREATE TABLE solicitudes_permiso (
    id                  SERIAL PRIMARY KEY,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    tipo                VARCHAR(30) CHECK (tipo IN ('Vacaciones','Ausencia justificada','Permiso médico','Permiso personal','Duelo','Otro')),
    fecha_inicio        DATE NOT NULL,
    fecha_fin           DATE NOT NULL,
    dias_solicitados    INTEGER GENERATED ALWAYS AS (fecha_fin - fecha_inicio + 1) STORED,
    motivo              TEXT,
    estado              VARCHAR(30) DEFAULT 'Pendiente' CHECK (estado IN ('Pendiente','Aprobado','Rechazado','Cancelado')),
    aprobado_por        INTEGER REFERENCES empleados(id),
    fecha_aprobacion    TIMESTAMPTZ,
    comentario_rrhh     TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. DESARROLLO — CAPACITACIONES
-- ============================================================

CREATE TABLE capacitaciones (
    id                  SERIAL PRIMARY KEY,
    titulo              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    proveedor           VARCHAR(150),
    tipo                VARCHAR(50) CHECK (tipo IN ('Interna','Externa','Online','Certificación','Taller','Seminario')),
    modalidad           VARCHAR(30) CHECK (modalidad IN ('Presencial','Virtual','Híbrido')),
    duracion_horas      NUMERIC(5,1),
    costo               NUMERIC(10,2) DEFAULT 0,
    fecha_inicio        DATE,
    fecha_fin           DATE,
    estado              VARCHAR(30) DEFAULT 'Programada' CHECK (estado IN ('Programada','En curso','Completada','Cancelada')),
    max_participantes   INTEGER,
    id_departamento     INTEGER REFERENCES departamentos(id),  -- NULL = global
    propuesto_por       INTEGER REFERENCES empleados(id),
    aprobado_por        INTEGER REFERENCES empleados(id),
    estado_aprobacion   VARCHAR(30) DEFAULT 'Pendiente' CHECK (estado_aprobacion IN ('Pendiente','Aprobada','Rechazada')),
    motivo_rechazo      TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE participantes_capacitacion (
    id                  SERIAL PRIMARY KEY,
    id_capacitacion     INTEGER REFERENCES capacitaciones(id) ON DELETE CASCADE,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    estado              VARCHAR(30) DEFAULT 'Inscrito' CHECK (estado IN ('Inscrito','Completado','Abandonó','No asistió')),
    nota_evaluacion     NUMERIC(4,1) CHECK (nota_evaluacion BETWEEN 0 AND 100),
    aprobado            BOOLEAN,
    certificado_url     TEXT,
    fecha_completado    DATE,
    observaciones       TEXT,
    UNIQUE(id_capacitacion, id_empleado)
);

-- ============================================================
-- 9. EVALUACIONES DE DESEMPEÑO
-- ============================================================

CREATE TABLE evaluaciones_desempeno (
    id                  SERIAL PRIMARY KEY,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    id_evaluador        INTEGER REFERENCES empleados(id),
    periodo             VARCHAR(20) NOT NULL,   -- '2025-S1', '2025-Q3', '2025-A'
    tipo                VARCHAR(30) DEFAULT 'Semestral' CHECK (tipo IN ('Mensual','Trimestral','Semestral','Anual','Especial')),
    -- Competencias (escala 1-5)
    puntaje_liderazgo   NUMERIC(3,1) CHECK (puntaje_liderazgo BETWEEN 1 AND 5),
    puntaje_trabajo_equipo NUMERIC(3,1) CHECK (puntaje_trabajo_equipo BETWEEN 1 AND 5),
    puntaje_comunicacion NUMERIC(3,1) CHECK (puntaje_comunicacion BETWEEN 1 AND 5),
    puntaje_iniciativa  NUMERIC(3,1) CHECK (puntaje_iniciativa BETWEEN 1 AND 5),
    puntaje_tecnico     NUMERIC(3,1) CHECK (puntaje_tecnico BETWEEN 1 AND 5),
    puntaje_cumplimiento NUMERIC(3,1) CHECK (puntaje_cumplimiento BETWEEN 1 AND 5),
    -- Proyectos
    proyectos_asignados INTEGER DEFAULT 0,
    proyectos_entregados INTEGER DEFAULT 0,
    proyectos_a_tiempo  INTEGER DEFAULT 0,
    -- Calculado
    promedio            NUMERIC(3,2) GENERATED ALWAYS AS (
        ROUND(COALESCE((puntaje_liderazgo + puntaje_trabajo_equipo + puntaje_comunicacion +
        puntaje_iniciativa + puntaje_tecnico + puntaje_cumplimiento) / 6.0, 0), 2)
    ) STORED,
    estado              VARCHAR(30) DEFAULT 'Borrador' CHECK (estado IN ('Borrador','Firmado','Cerrado')),
    plan_mejora         TEXT,           -- Si promedio < 2.5, requerido
    firma_empleado      BOOLEAN DEFAULT FALSE,
    firma_supervisor    BOOLEAN DEFAULT FALSE,
    comentarios         TEXT,
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. SALIDA DE EMPLEADOS
-- ============================================================

CREATE TABLE salidas_empleados (
    id                  SERIAL PRIMARY KEY,
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    tipo                VARCHAR(30) CHECK (tipo IN ('Renuncia voluntaria','Despido','Término de contrato','Jubilación','Fallecimiento','Otro')),
    fecha_efectiva      DATE NOT NULL,
    motivo              TEXT,
    cumple_preaviso     BOOLEAN DEFAULT TRUE,
    dias_preaviso       INTEGER DEFAULT 0,
    -- Activos
    activos_devueltos   JSONB DEFAULT '{}',   -- {"laptop": true, "carnet": true}
    activos_firmado     BOOLEAN DEFAULT FALSE,
    -- Cierre de accesos
    accesos_cerrados    BOOLEAN DEFAULT FALSE,
    fecha_cierre_accesos DATE,
    -- Documentos
    carta_salida_url    TEXT,
    entrevista_salida   TEXT,
    -- Admin
    procesado_por       INTEGER REFERENCES empleados(id),
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. ALERTAS Y THRESHOLDS PARA RRHH
-- ============================================================

CREATE TABLE configuracion_alertas (
    id                  SERIAL PRIMARY KEY,
    nombre              VARCHAR(100) NOT NULL,
    tipo                VARCHAR(60) NOT NULL,   -- 'asistencia', 'rendimiento', 'capacitacion', 'vacaciones'
    descripcion         TEXT,
    -- Thresholds configurables
    umbral_valor        NUMERIC(8,2),           -- Valor numérico del umbral
    umbral_tipo         VARCHAR(30) CHECK (umbral_tipo IN ('mayor_que','menor_que','igual_a','porcentaje')),
    periodo_evaluacion  VARCHAR(30) DEFAULT 'mensual' CHECK (periodo_evaluacion IN ('diario','semanal','mensual','trimestral')),
    activa              BOOLEAN DEFAULT TRUE,
    notificar_a         INTEGER[] DEFAULT '{}',  -- Array de IDs de empleados RRHH
    creado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE alertas_generadas (
    id                  SERIAL PRIMARY KEY,
    id_configuracion    INTEGER REFERENCES configuracion_alertas(id),
    id_empleado         INTEGER REFERENCES empleados(id) ON DELETE CASCADE,
    id_departamento     INTEGER REFERENCES departamentos(id),
    tipo                VARCHAR(60) NOT NULL,
    titulo              VARCHAR(200) NOT NULL,
    descripcion         TEXT,
    nivel               VARCHAR(20) DEFAULT 'warning' CHECK (nivel IN ('info','warning','critical')),
    valor_detectado     NUMERIC(8,2),
    umbral_configurado  NUMERIC(8,2),
    estado              VARCHAR(30) DEFAULT 'Nueva' CHECK (estado IN ('Nueva','Vista','En proceso','Resuelta','Ignorada')),
    visto_por           INTEGER REFERENCES empleados(id),
    visto_en            TIMESTAMPTZ,
    fecha_generada      TIMESTAMPTZ DEFAULT NOW()
);

-- Thresholds por defecto TelcoPanamá
INSERT INTO configuracion_alertas (nombre, tipo, descripcion, umbral_valor, umbral_tipo, periodo_evaluacion) VALUES
('Ausentismo frecuente',            'asistencia',       'Empleado con más de 3 ausencias injustificadas en el mes',         3,    'mayor_que',   'mensual'),
('Tardanzas acumuladas',            'asistencia',       'Empleado con más de 5 tardanzas en el mes',                        5,    'mayor_que',   'mensual'),
('Bajo rendimiento evaluación',     'rendimiento',      'Promedio de evaluación de desempeño menor a 2.5 sobre 5',          2.5,  'menor_que',   'trimestral'),
('Proyectos no entregados',         'rendimiento',      'Empleado que no entrega más del 30% de sus proyectos asignados',   30,   'menor_que',   'mensual'),
('Vacaciones pendientes excesivas', 'vacaciones',       'Empleado con más de 20 días de vacaciones acumuladas sin tomar',   20,   'mayor_que',   'mensual'),
('Capacitación incompleta',         'capacitacion',     'Empleado con capacitaciones obligatorias sin completar al 100%',   100,  'menor_que',   'trimestral'),
('Inducción incompleta',            'induccion',        'Empleado activo con proceso de inducción sin completar',           100,  'menor_que',   'diario'),
('Alta rotación departamental',     'rotacion',         'Departamento con más de 2 salidas en el último trimestre',         2,    'mayor_que',   'trimestral');

-- ============================================================
-- 12. REPORTES — DATOS PARA DASHBOARDS
-- ============================================================

-- Vista: Resumen de asistencia diaria
CREATE OR REPLACE VIEW v_asistencia_diaria AS
SELECT
    ra.fecha,
    d.nombre                                            AS departamento,
    COUNT(*)                                            AS total_empleados,
    COUNT(*) FILTER (WHERE ra.estado = 'Presente')      AS presentes,
    COUNT(*) FILTER (WHERE ra.estado = 'Tardanza')      AS tardanzas,
    COUNT(*) FILTER (WHERE ra.estado = 'Ausente')       AS ausentes,
    COUNT(*) FILTER (WHERE ra.estado = 'Vacaciones')    AS vacaciones,
    ROUND(COUNT(*) FILTER (WHERE ra.estado = 'Presente')::NUMERIC /
          NULLIF(COUNT(*),0) * 100, 1)                  AS pct_asistencia
FROM registros_asistencia ra
JOIN empleados e ON e.id = ra.id_empleado
JOIN departamentos d ON d.id = e.id_departamento
GROUP BY ra.fecha, d.nombre, d.id
ORDER BY ra.fecha DESC, d.nombre;

-- Vista: KPIs de asistencia mensual por empleado
CREATE OR REPLACE VIEW v_kpi_asistencia_mensual AS
SELECT
    e.id,
    e.codigo_empleado,
    e.nombre || ' ' || e.apellido                       AS nombre_completo,
    d.nombre                                            AS departamento,
    DATE_TRUNC('month', ra.fecha)                       AS mes,
    COUNT(*)                                            AS dias_laborables,
    COUNT(*) FILTER (WHERE ra.estado = 'Presente')      AS dias_presente,
    COUNT(*) FILTER (WHERE ra.estado = 'Tardanza')      AS tardanzas,
    COUNT(*) FILTER (WHERE ra.estado = 'Ausente'
                     AND ra.justificado = FALSE)        AS ausencias_injust,
    COUNT(*) FILTER (WHERE ra.estado = 'Ausente'
                     AND ra.justificado = TRUE)         AS ausencias_just,
    ROUND(COUNT(*) FILTER (WHERE ra.estado IN ('Presente','Tardanza'))::NUMERIC /
          NULLIF(COUNT(*),0) * 100, 1)                  AS pct_asistencia
FROM registros_asistencia ra
JOIN empleados e ON e.id = ra.id_empleado
JOIN departamentos d ON d.id = e.id_departamento
WHERE e.estado = 'Activo'
GROUP BY e.id, e.codigo_empleado, e.nombre, e.apellido, d.nombre, DATE_TRUNC('month', ra.fecha);

-- Vista: Resumen capacitaciones
CREATE OR REPLACE VIEW v_resumen_capacitaciones AS
SELECT
    c.id,
    c.titulo,
    c.tipo,
    c.estado,
    c.fecha_inicio,
    c.fecha_fin,
    c.duracion_horas,
    d.nombre                                            AS departamento,
    COUNT(pc.id)                                        AS inscritos,
    COUNT(*) FILTER (WHERE pc.estado = 'Completado')    AS completados,
    COUNT(*) FILTER (WHERE pc.aprobado = TRUE)          AS aprobados,
    ROUND(AVG(pc.nota_evaluacion), 1)                   AS nota_promedio,
    ROUND(COUNT(*) FILTER (WHERE pc.aprobado = TRUE)::NUMERIC /
          NULLIF(COUNT(*),0) * 100, 1)                  AS pct_aprobacion
FROM capacitaciones c
LEFT JOIN departamentos d ON d.id = c.id_departamento
LEFT JOIN participantes_capacitacion pc ON pc.id_capacitacion = c.id
GROUP BY c.id, c.titulo, c.tipo, c.estado, c.fecha_inicio, c.fecha_fin, c.duracion_horas, d.nombre;

-- Vista: Métricas de rendimiento por empleado
CREATE OR REPLACE VIEW v_metricas_rendimiento AS
SELECT
    e.id,
    e.codigo_empleado,
    e.nombre || ' ' || e.apellido                       AS nombre_completo,
    d.nombre                                            AS departamento,
    c.titulo                                            AS cargo,
    COUNT(ev.id)                                        AS evaluaciones_total,
    ROUND(AVG(ev.promedio), 2)                          AS promedio_evaluaciones,
    SUM(ev.proyectos_asignados)                         AS proyectos_asignados,
    SUM(ev.proyectos_entregados)                        AS proyectos_entregados,
    ROUND(SUM(ev.proyectos_entregados)::NUMERIC /
          NULLIF(SUM(ev.proyectos_asignados),0) * 100, 1) AS pct_proyectos_entregados,
    MAX(ev.creado_en)                                   AS ultima_evaluacion
FROM empleados e
JOIN departamentos d ON d.id = e.id_departamento
JOIN cargos c ON c.id = e.id_cargo
LEFT JOIN evaluaciones_desempeno ev ON ev.id_empleado = e.id AND ev.estado = 'Cerrado'
WHERE e.estado = 'Activo'
GROUP BY e.id, e.codigo_empleado, e.nombre, e.apellido, d.nombre, c.titulo;

-- Vista: Análisis entradas y salidas
CREATE OR REPLACE VIEW v_rotacion_mensual AS
WITH ingresos AS (
    SELECT DATE_TRUNC('month', fecha_ingreso) AS mes,
           id_departamento,
           COUNT(*) AS total_ingresos
    FROM empleados
    GROUP BY 1, 2
),
salidas AS (
    SELECT DATE_TRUNC('month', fecha_efectiva) AS mes,
           e.id_departamento,
           COUNT(*) AS total_salidas,
           COUNT(*) FILTER (WHERE se.tipo = 'Renuncia voluntaria') AS renuncias,
           COUNT(*) FILTER (WHERE se.tipo = 'Despido')             AS despidos
    FROM salidas_empleados se
    JOIN empleados e ON e.id = se.id_empleado
    GROUP BY 1, 2
)
SELECT
    COALESCE(i.mes, s.mes)                              AS mes,
    d.nombre                                            AS departamento,
    COALESCE(i.total_ingresos, 0)                       AS ingresos,
    COALESCE(s.total_salidas, 0)                        AS salidas,
    COALESCE(s.renuncias, 0)                            AS renuncias,
    COALESCE(s.despidos, 0)                             AS despidos
FROM ingresos i
FULL OUTER JOIN salidas s ON i.mes = s.mes AND i.id_departamento = s.id_departamento
JOIN departamentos d ON d.id = COALESCE(i.id_departamento, s.id_departamento)
ORDER BY mes DESC;

-- ============================================================
-- 13. FUNCIÓN — AUTO-GENERAR ALERTAS
-- ============================================================

CREATE OR REPLACE FUNCTION generar_alertas_automaticas()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Alerta: ausentismo frecuente (>3 ausencias injustificadas en el mes)
    FOR rec IN
        SELECT e.id AS id_empleado, e.id_departamento,
               e.nombre || ' ' || e.apellido AS nombre,
               COUNT(*) AS ausencias
        FROM registros_asistencia ra
        JOIN empleados e ON e.id = ra.id_empleado
        WHERE ra.estado = 'Ausente'
          AND ra.justificado = FALSE
          AND ra.fecha >= DATE_TRUNC('month', CURRENT_DATE)
          AND e.estado = 'Activo'
        GROUP BY e.id, e.id_departamento, e.nombre, e.apellido
        HAVING COUNT(*) > 3
    LOOP
        INSERT INTO alertas_generadas (id_empleado, id_departamento, tipo, titulo, descripcion, nivel, valor_detectado, umbral_configurado)
        VALUES (rec.id_empleado, rec.id_departamento, 'asistencia',
                'Ausentismo frecuente: ' || rec.nombre,
                rec.nombre || ' tiene ' || rec.ausencias || ' ausencias injustificadas este mes.',
                CASE WHEN rec.ausencias > 5 THEN 'critical' ELSE 'warning' END,
                rec.ausencias, 3)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Alerta: bajo rendimiento
    FOR rec IN
        SELECT e.id AS id_empleado, e.id_departamento,
               e.nombre || ' ' || e.apellido AS nombre,
               ROUND(AVG(ev.promedio), 2) AS promedio
        FROM evaluaciones_desempeno ev
        JOIN empleados e ON e.id = ev.id_empleado
        WHERE ev.estado = 'Cerrado'
          AND ev.creado_en >= NOW() - INTERVAL '6 months'
          AND e.estado = 'Activo'
        GROUP BY e.id, e.id_departamento, e.nombre, e.apellido
        HAVING AVG(ev.promedio) < 2.5
    LOOP
        INSERT INTO alertas_generadas (id_empleado, id_departamento, tipo, titulo, descripcion, nivel, valor_detectado, umbral_configurado)
        VALUES (rec.id_empleado, rec.id_departamento, 'rendimiento',
                'Bajo rendimiento: ' || rec.nombre,
                rec.nombre || ' tiene un promedio de evaluación de ' || rec.promedio || '/5 en los últimos 6 meses.',
                'warning', rec.promedio, 2.5)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Alerta: vacaciones acumuladas > 20 días
    FOR rec IN
        SELECT e.id AS id_empleado, e.id_departamento,
               e.nombre || ' ' || e.apellido AS nombre,
               sv.dias_pendientes
        FROM saldos_vacaciones sv
        JOIN empleados e ON e.id = sv.id_empleado
        WHERE sv.dias_pendientes > 20
          AND e.estado = 'Activo'
    LOOP
        INSERT INTO alertas_generadas (id_empleado, id_departamento, tipo, titulo, descripcion, nivel, valor_detectado, umbral_configurado)
        VALUES (rec.id_empleado, rec.id_departamento, 'vacaciones',
                'Vacaciones pendientes: ' || rec.nombre,
                rec.nombre || ' tiene ' || rec.dias_pendientes || ' días de vacaciones acumulados sin tomar.',
                'info', rec.dias_pendientes, 20)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

-- ============================================================
-- 14. ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX idx_empleados_departamento    ON empleados(id_departamento);
CREATE INDEX idx_empleados_estado          ON empleados(estado);
CREATE INDEX idx_empleados_supervisor      ON empleados(id_supervisor);
CREATE INDEX idx_asistencia_empleado_fecha ON registros_asistencia(id_empleado, fecha);
CREATE INDEX idx_asistencia_fecha          ON registros_asistencia(fecha);
CREATE INDEX idx_candidatos_vacante        ON candidatos(id_vacante);
CREATE INDEX idx_candidatos_estado         ON candidatos(estado);
CREATE INDEX idx_evaluaciones_empleado     ON evaluaciones_desempeno(id_empleado);
CREATE INDEX idx_alertas_estado            ON alertas_generadas(estado, fecha_generada);
CREATE INDEX idx_alertas_empleado          ON alertas_generadas(id_empleado);
CREATE INDEX idx_capacitaciones_estado     ON capacitaciones(estado);
CREATE INDEX idx_participantes_cap         ON participantes_capacitacion(id_capacitacion, id_empleado);

-- ============================================================
-- 15. SEED — 300 EMPLEADOS TELCOPANAMÁ
-- ============================================================
-- (Ejecutar seed_empleados.sql por separado para los 300 empleados)
-- Este script crea la estructura; el seed completo está en seed_empleados.sql
