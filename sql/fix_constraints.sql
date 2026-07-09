SET client_encoding = 'UTF8';

-- ============================================================
-- TELCOPANAMÁ S.A. - Seed completo v4 (con tildes y ñ)
-- Usar docker cp + psql -f para preservar UTF-8
-- docker cp seed_empleados.sql telecom-postgres:/tmp/seed.sql
-- docker exec telecom-postgres psql -U postgres -d telcopanama_rrhh -f /tmp/seed.sql
-- ============================================================

-- ── 1. CARGOS ────────────────────────────────────────────────
INSERT INTO cargos (titulo, id_departamento, nivel, salario_min, salario_max) VALUES
('Director General',                  1,'Directivo',     8000,15000),
('Director de Operaciones',           1,'Directivo',     7000,12000),
('Gerente de RRHH',                   2,'Gerencial',     4000,6000),
('Coordinador de RRHH',               2,'Jefatura',      2500,3800),
('Analista de RRHH',                  2,'Profesional',   1800,2800),
('Asistente de RRHH',                 2,'Administrativo',1000,1600),
('Gerente de TI',                     3,'Gerencial',     5000,8000),
('Arquitecto de Soluciones',          3,'Profesional',   4000,6500),
('Desarrollador Senior',              3,'Profesional',   3500,5500),
('Desarrollador Junior',              3,'Profesional',   2000,3200),
('Administrador de Sistemas',         3,'Técnico',       2500,4000),
('Analista de Ciberseguridad',        3,'Profesional',   3000,5000),
('Gerente de Operaciones',            4,'Gerencial',     5000,8000),
('Supervisor de Red',                 4,'Jefatura',      3000,4500),
('Técnico de Red Senior',             4,'Técnico',       2200,3500),
('Técnico de Red',                    4,'Técnico',       1500,2500),
('Operador NOC',                      4,'Técnico',       1600,2600),
('Gerente Comercial',                 5,'Gerencial',     5000,8000),
('Jefe de Ventas',                    5,'Jefatura',      3500,5500),
('Ejecutivo de Ventas Senior',        5,'Profesional',   2500,4500),
('Ejecutivo de Ventas',               5,'Profesional',   1500,3000),
('Promotor de Ventas',                5,'Operativo',     1000,1800),
('Gerente de Atención al Cliente',    6,'Gerencial',     4500,7000),
('Supervisor de Call Center',         6,'Jefatura',      2800,4200),
('Agente de Soporte Nivel 1',         6,'Operativo',     1000,1800),
('Agente de Soporte Nivel 2',         6,'Profesional',   1500,2500),
('Gerente de Marketing',              7,'Gerencial',     5000,8000),
('Especialista en Marketing Digital', 7,'Profesional',   2500,4000),
('Diseñador Gráfico',                 7,'Profesional',   1800,3000),
('Gerente Financiero',                8,'Gerencial',     6000,9000),
('Contador Senior',                   8,'Profesional',   3000,5000),
('Analista Financiero',               8,'Profesional',   2000,3500),
('Asistente Contable',                8,'Administrativo',1000,1800),
('Abogado Senior',                    9,'Profesional',   4000,7000),
('Analista Legal',                    9,'Profesional',   2500,4000),
('Gerente de Proyectos',             10,'Gerencial',     5000,8000),
('Ingeniero de Red Junior',          10,'Profesional',   2000,3500),
('Ingeniero de Red Senior',          10,'Profesional',   3500,5500),
('Analista de Inventario',           11,'Profesional',   1800,2800),
('Asistente de Almacén',             11,'Operativo',     1000,1600),
('Jefe de Logística',                11,'Jefatura',      3000,4500),
('Analista de Seguridad',            12,'Profesional',   2500,4000),
('Jefe de Seguridad',                12,'Jefatura',      3500,5000),
('Oficial de Seguridad',             12,'Operativo',     1200,2000);

-- ── 2. EMPLEADOS (300) ───────────────────────────────────────
DO $$
DECLARE
  i             INT;
  nom           TEXT;
  ape1          TEXT;
  ape2          TEXT;
  genero        TEXT;
  dept_id       INT;
  cargo_id      INT;
  f_ingreso     DATE;
  salario       NUMERIC;
  emp_code      TEXT;
  estado_emp    TEXT;
  modalidad_emp TEXT;
  contrato_emp  TEXT;

  nombres_m TEXT[] := ARRAY[
    'Carlos','Luis','Miguel','José','Juan','Pedro','Jorge','Andrés','Ricardo','Fernando',
    'Roberto','Eduardo','Santiago','Diego','Adrián','Héctor','Sergio','Daniel','Mario','Javier',
    'Pablo','Felipe','Manuel','Óscar','Raúl','Iván','Marcos','Alejandro','Nicolás','Sebastián',
    'Samuel','David','Gabriel','Tomás','Esteban','Víctor','Jaime','Hugo','Alberto','Rodrigo'
  ];
  nombres_f TEXT[] := ARRAY[
    'María','Ana','Laura','Sofía','Patricia','Carmen','Isabel','Diana','Andrea','Mónica',
    'Lucía','Valeria','Paola','Sandra','Adriana','Elena','Rosa','Gloria','Beatriz','Claudia',
    'Natalia','Carolina','Jimena','Yanira','Isabella','Alejandra','Daniela','Fernanda','Paulina','Emma',
    'Irene','Pilar','Silvia','Marta','Rebeca','Alicia','Julia','Teresa','Lorena','Paula'
  ];
  apellidos TEXT[] := ARRAY[
    'García','Rodríguez','Martínez','López','González','Pérez','Sánchez','Ramírez','Torres','Flores',
    'Rivera','Gómez','Díaz','Morales','Jiménez','Romero','Álvarez','Mendoza','Ramos','Castro',
    'Ortiz','Reyes','Herrera','Medina','Aguilar','Vega','Cisneros','Salazar','Guerrero','Espinoza',
    'Ibarra','Vargas','Delgado','Cabrera','Montes','Campos','Miranda','Soto','Navarro','Fuentes',
    'Guevara','Pacheco','Valencia','Serrano','Maldonado','Castillo','Cruz','Moreno','Ruiz','Núñez'
  ];
  dept_ids   INT[] := ARRAY[1,2,3,4,5,6,7,8,9,10,11,12];
  cargo_base INT[] := ARRAY[1,3,7,13,18,23,27,30,34,36,39,42];
  cargo_cnt  INT[] := ARRAY[2,4,6,5,5,4,3,4,2,3,3,3];
BEGIN
  FOR i IN 1..300 LOOP
    genero   := CASE WHEN (i % 3) = 0 THEN 'Femenino' ELSE 'Masculino' END;
    nom      := CASE WHEN genero = 'Masculino'
                     THEN nombres_m[1 + ((i*7) % array_length(nombres_m,1))]
                     ELSE nombres_f[1 + ((i*5) % array_length(nombres_f,1))]
                END;
    ape1     := apellidos[1 + ((i*11) % array_length(apellidos,1))];
    ape2     := apellidos[1 + ((i*17) % array_length(apellidos,1))];
    dept_id  := dept_ids[1 + ((i-1) % 12)];
    cargo_id := cargo_base[1+((i-1)%12)] + ((i*2) % cargo_cnt[1+((i-1)%12)]);
    f_ingreso := DATE '2025-07-01' + ((i*7) % 362)::INT;
    salario   := 1200 + ((i*97) % 3800);
    emp_code  := 'EMP-' || LPAD(i::TEXT,4,'0');

    estado_emp    := CASE WHEN i>295 THEN 'Inactivo' WHEN i>290 THEN 'Vacaciones' ELSE 'Activo' END;
    modalidad_emp := CASE (i%3) WHEN 0 THEN 'Presencial' WHEN 1 THEN 'Híbrido' ELSE 'Remoto' END;
    contrato_emp  := CASE (i%5) WHEN 0 THEN 'Definido' WHEN 1 THEN 'Temporal' ELSE 'Indefinido' END;

    INSERT INTO empleados (
      codigo_empleado, nombre, apellido, cedula,
      correo_corporativo, correo_personal, telefono,
      fecha_nacimiento, genero, nacionalidad,
      id_departamento, id_cargo, fecha_ingreso,
      tipo_contrato, jornada, salario_base, estado, modalidad,
      hora_entrada, hora_salida
    ) VALUES (
      emp_code, nom, ape1||' '||ape2,
      (4+(i%9))::TEXT||'-'||LPAD((100000+i*137)::TEXT,6,'0')||'-'||(i%9)::TEXT,
      LOWER(TRANSLATE(nom,'áéíóúñÁÉÍÓÚÑüÜ','aeiounAEIOUNuU'))||'.'||
        LOWER(TRANSLATE(ape1,'áéíóúñÁÉÍÓÚÑüÜ','aeiounAEIOUNuU'))||i::TEXT||'@telcopanama.com.pa',
      LOWER(TRANSLATE(nom,'áéíóúñÁÉÍÓÚÑüÜ','aeiounAEIOUNuU'))||(1000+i)::TEXT||'@gmail.com',
      '6'||LPAD((100+i*3)::TEXT,3,'0')||'-'||LPAD((1000+i*7)::TEXT,4,'0'),
      DATE '1975-01-01' + ((i*173+1000) % 10950),
      genero, 'Panameña',
      dept_id, cargo_id, f_ingreso,
      contrato_emp, 'Completa', salario,
      estado_emp, modalidad_emp,
      '08:00'::TIME, '17:00'::TIME
    );
  END LOOP;
  RAISE NOTICE 'Empleados insertados OK';
END;
$$;

-- ── 3. SUPERVISORES ──────────────────────────────────────────
UPDATE empleados e
SET id_supervisor = (
  SELECT e2.id FROM empleados e2
  WHERE e2.id_departamento = e.id_departamento AND e2.id != e.id
  ORDER BY e2.fecha_ingreso ASC LIMIT 1
)
WHERE e.id > 1;

-- ── 4. VACACIONES (30/11 × meses trabajados) ─────────────────
INSERT INTO saldos_vacaciones (id_empleado, dias_acumulados, dias_tomados)
SELECT
  id,
  ROUND(FLOOR((CURRENT_DATE - fecha_ingreso)/30.0) * (30.0/11.0), 2),
  ROUND(FLOOR((CURRENT_DATE - fecha_ingreso)/30.0) * (30.0/11.0)
    * CASE (id%5) WHEN 0 THEN 0.30 WHEN 1 THEN 0.10 WHEN 2 THEN 0.00
                  WHEN 3 THEN 0.50 ELSE 0.20 END, 2)
FROM empleados WHERE estado != 'Inactivo'
ON CONFLICT (id_empleado) DO UPDATE SET
  dias_acumulados = EXCLUDED.dias_acumulados,
  dias_tomados    = EXCLUDED.dias_tomados;

-- ── 5. ASISTENCIA (Jul 2025 - Jul 2026, variada) ─────────────
DO $$
DECLARE
  emp      RECORD;
  dia      DATE;
  dow      INT;
  r        INT;
  entrada  TIME;
  salida   TIME;
  estado_a TEXT;
  tardanza INT;
BEGIN
  FOR emp IN
    SELECT id, fecha_ingreso FROM empleados
    WHERE estado IN ('Activo','Vacaciones')
  LOOP
    dia := GREATEST(emp.fecha_ingreso, DATE '2025-07-01');
    WHILE dia <= DATE '2026-07-08' LOOP
      dow := EXTRACT(DOW FROM dia)::INT;
      IF dow NOT IN (0,6) THEN
        r := ((emp.id * 31 + EXTRACT(DOY FROM dia)::INT * 7) % 100)::INT;

        IF r < 78 THEN
          estado_a := 'Presente';
          entrada  := TIME '07:45' + (((emp.id*3 + EXTRACT(DOY FROM dia)::INT) % 31)||' minutes')::INTERVAL;
          salida   := TIME '17:00' + (((emp.id   + EXTRACT(DOY FROM dia)::INT * 2) % 60)||' minutes')::INTERVAL;
          tardanza := 0;
        ELSIF r < 90 THEN
          estado_a := 'Tardanza';
          tardanza := 5 + ((emp.id*7 + EXTRACT(DOY FROM dia)::INT*3) % 55);
          entrada  := TIME '08:00' + (tardanza||' minutes')::INTERVAL;
          salida   := TIME '17:00' + (((emp.id + EXTRACT(DOY FROM dia)::INT) % 45)||' minutes')::INTERVAL;
        ELSIF r < 97 THEN
          estado_a := 'Ausente';
          entrada  := NULL; salida := NULL; tardanza := 0;
        ELSE
          estado_a := 'Vacaciones';
          entrada  := NULL; salida := NULL; tardanza := 0;
        END IF;

        INSERT INTO registros_asistencia
          (id_empleado, fecha, hora_entrada, hora_salida, estado, minutos_tardanza, justificado)
        VALUES (
          emp.id, dia, entrada, salida, estado_a, tardanza,
          CASE WHEN estado_a IN ('Ausente','Tardanza') AND (r%3)=0 THEN TRUE ELSE FALSE END
        ) ON CONFLICT DO NOTHING;
      END IF;
      dia := dia + 1;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Asistencia generada OK';
END;
$$;

-- ── 6. INDUCCIÓN ─────────────────────────────────────────────
INSERT INTO induccion_empleado (id_empleado, id_item, completado, fecha_completado)
SELECT
  e.id, i.id,
  CASE WHEN i.orden <= (3 + (e.id % 4)) THEN TRUE ELSE FALSE END,
  CASE WHEN i.orden <= (3 + (e.id % 4)) THEN e.fecha_ingreso + (i.orden*2) ELSE NULL END
FROM empleados e CROSS JOIN items_induccion i
ON CONFLICT DO NOTHING;

-- ── 7. CAPACITACIONES ────────────────────────────────────────
INSERT INTO capacitaciones (titulo, tipo, modalidad, duracion_horas, costo,
  fecha_inicio, fecha_fin, estado, id_departamento, estado_aprobacion) VALUES
('Seguridad en Redes Corporativas',    'Externa',       'Presencial',40,1200,'2025-08-10','2025-08-14','Completada', 3,'Aprobada'),
('Excel Avanzado para Finanzas',       'Interna',       'Presencial',16,   0,'2025-09-05','2025-09-06','Completada', 8,'Aprobada'),
('Atención al Cliente de Excelencia',  'Externa',       'Virtual',   24, 800,'2025-09-15','2025-09-17','Completada', 6,'Aprobada'),
('Liderazgo y Gestión de Equipos',     'Certificación', 'Presencial',32,2500,'2025-10-06','2025-10-09','Completada',NULL,'Aprobada'),
('Python para Análisis de Datos',      'Online',        'Virtual',   20, 500,'2025-10-20','2025-10-24','Completada', 3,'Aprobada'),
('Normas ISO 27001',                   'Externa',       'Presencial',16,1800,'2025-11-03','2025-11-04','Completada',12,'Aprobada'),
('Ventas Consultivas B2B',             'Interna',       'Presencial',12,   0,'2025-11-17','2025-11-18','Completada', 5,'Aprobada'),
('Gestión de Proyectos con PMI',       'Certificación', 'Híbrido',   40,3200,'2025-12-01','2025-12-05','Completada',10,'Aprobada'),
('Primeros Auxilios Corporativo',      'Externa',       'Presencial', 8, 400,'2026-01-12','2026-01-12','Completada',NULL,'Aprobada'),
('Marketing Digital y Redes Sociales', 'Online',        'Virtual',   20, 650,'2026-01-19','2026-01-23','Completada', 7,'Aprobada'),
('Contabilidad y NIIF',                'Externa',       'Presencial',24,1400,'2026-02-09','2026-02-11','Completada', 8,'Aprobada'),
('Fibra Óptica y Redes WAN',           'Técnico',       'Presencial',32,2000,'2026-02-23','2026-02-26','Completada', 4,'Aprobada'),
('Comunicación Efectiva',              'Interna',       'Virtual',    8,   0,'2026-03-09','2026-03-09','Completada',NULL,'Aprobada'),
('Ciberseguridad Avanzada',            'Certificación', 'Presencial',40,4500,'2026-03-16','2026-03-20','Completada', 3,'Aprobada'),
('Herramientas AWS Cloud',             'Online',        'Virtual',   30,1200,'2026-04-06','2026-04-10','Completada', 3,'Aprobada'),
('Negociación y Cierre de Ventas',     'Externa',       'Presencial',16, 900,'2026-04-20','2026-04-21','Completada', 5,'Aprobada'),
('Manejo de Inventarios y Logística',  'Interna',       'Presencial',12,   0,'2026-05-04','2026-05-05','Completada',11,'Aprobada'),
('Tableau y Power BI',                 'Online',        'Virtual',   20, 750,'2026-05-18','2026-05-22','Completada',NULL,'Aprobada'),
('Gestión del Cambio Organizacional',  'Externa',       'Presencial',16,1600,'2026-06-08','2026-06-09','En curso',  NULL,'Aprobada'),
('Desarrollo de Software Ágil',        'Certificación', 'Híbrido',   32,2800,'2026-06-22','2026-07-03','En curso',   3,'Aprobada');

-- Participantes
DO $$
DECLARE
  cap    RECORD;
  emp_id INT;
  nota   NUMERIC;
  aprobado BOOLEAN;
  est    TEXT;
BEGIN
  FOR cap IN SELECT id, id_departamento, estado, fecha_fin FROM capacitaciones LOOP
    FOR emp_id IN
      SELECT e.id FROM empleados e
      WHERE (cap.id_departamento IS NULL OR e.id_departamento = cap.id_departamento)
        AND e.estado = 'Activo'
      ORDER BY (e.id * 37 + cap.id * 13) % 1000
      LIMIT (8 + (cap.id % 15))
    LOOP
      nota     := CASE WHEN (emp_id*7+cap.id*3)%10=0 THEN NULL
                       ELSE 55 + ((emp_id*11+cap.id*7) % 46) END;
      aprobado := CASE WHEN nota IS NOT NULL THEN nota >= 71 ELSE NULL END;
      est      := CASE
        WHEN cap.estado = 'En curso'     THEN 'Inscrito'
        WHEN (emp_id*cap.id) % 12 = 0   THEN 'Abandonó'
        WHEN (emp_id*cap.id) % 8  = 0   THEN 'No asistió'
        ELSE 'Completado' END;
      INSERT INTO participantes_capacitacion
        (id_capacitacion, id_empleado, estado, nota_evaluacion, aprobado, fecha_completado, observaciones)
      VALUES (
        cap.id, emp_id, est, nota, aprobado,
        CASE WHEN est='Completado' THEN cap.fecha_fin ELSE NULL END,
        CASE WHEN aprobado=FALSE THEN 'Requiere refuerzo en el tema'
             WHEN nota >= 90     THEN 'Excelente desempeño'
             ELSE NULL END
      ) ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END;
$$;

-- ── 8. EVALUACIONES CUATRIMESTRALES ──────────────────────────
DO $$
DECLARE
  emp          RECORD;
  evaluador_id INT;
  anio_e       INT;
  cuat_e       INT;
  p_lid NUMERIC; p_eq NUMERIC; p_com NUMERIC;
  p_ini NUMERIC; p_tec NUMERIC; p_cum NUMERIC;
  fecha_eval   DATE;
  mes_inicio   INT;
BEGIN
  FOR emp IN
    SELECT id, id_departamento, fecha_ingreso
    FROM empleados WHERE estado IN ('Activo','Vacaciones')
  LOOP
    SELECT id INTO evaluador_id FROM empleados
    WHERE id_departamento = emp.id_departamento AND id != emp.id
    ORDER BY fecha_ingreso ASC LIMIT 1;

    FOR anio_e IN 2025..2026 LOOP
      FOR cuat_e IN 1..3 LOOP
        mes_inicio := CASE cuat_e WHEN 1 THEN 1 WHEN 2 THEN 5 ELSE 9 END;
        fecha_eval := (anio_e::TEXT||'-'||LPAD(mes_inicio::TEXT,2,'0')||'-28')::DATE;

        CONTINUE WHEN fecha_eval < emp.fecha_ingreso + 60;
        CONTINUE WHEN fecha_eval > CURRENT_DATE - 30;

        p_lid := 1.5 + (((emp.id*7  + anio_e + cuat_e*3) % 8) * 0.5);
        p_eq  := 1.5 + (((emp.id*11 + anio_e + cuat_e*5) % 8) * 0.5);
        p_com := 1.5 + (((emp.id*13 + anio_e + cuat_e*7) % 8) * 0.5);
        p_ini := 1.5 + (((emp.id*17 + anio_e + cuat_e*2) % 8) * 0.5);
        p_tec := 2.0 + (((emp.id*19 + anio_e + cuat_e*4) % 7) * 0.5);
        p_cum := 1.5 + (((emp.id*23 + anio_e + cuat_e*6) % 8) * 0.5);

        INSERT INTO evaluaciones_desempeno (
          id_empleado, id_evaluador, anio, cuatrimestre, tipo,
          puntaje_liderazgo, puntaje_trabajo_equipo, puntaje_comunicacion,
          puntaje_iniciativa, puntaje_tecnico, puntaje_cumplimiento,
          proyectos_asignados, proyectos_entregados, proyectos_a_tiempo,
          estado, comentarios, plan_mejora, creado_en
        ) VALUES (
          emp.id, COALESCE(evaluador_id,1), anio_e, cuat_e, 'Cuatrimestral',
          p_lid, p_eq, p_com, p_ini, p_tec, p_cum,
          2+(emp.id%5), 1+(emp.id%4), (emp.id%3),
          CASE WHEN anio_e=2025 AND cuat_e=3 THEN 'Cerrado'
               WHEN anio_e=2026 AND cuat_e=1 THEN 'Firmado'
               ELSE 'Borrador' END,
          CASE WHEN (p_lid+p_eq+p_com+p_ini+p_tec+p_cum)/6.0 >= 4.0
                    THEN 'Excelente desempeño. Candidato a ascenso.'
               WHEN (p_lid+p_eq+p_com+p_ini+p_tec+p_cum)/6.0 >= 3.0
                    THEN 'Buen desempeño, continuar con objetivos establecidos.'
               ELSE 'Desempeño por debajo del estándar. Requiere atención inmediata.' END,
          CASE WHEN (p_lid+p_eq+p_com+p_ini+p_tec+p_cum)/6.0 < 2.5
               THEN 'Plan de mejora: capacitación en competencias débiles, seguimiento mensual con supervisor.'
               ELSE NULL END,
          fecha_eval::TIMESTAMPTZ
        ) ON CONFLICT ON CONSTRAINT uq_evaluacion_periodo DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Evaluaciones generadas OK';
END;
$$;

-- ── 9. SALIDAS ────────────────────────────────────────────────
INSERT INTO salidas_empleados
  (id_empleado, tipo, fecha_efectiva, motivo, cumple_preaviso, dias_preaviso,
   activos_devueltos, activos_firmado, accesos_cerrados, fecha_cierre_accesos)
SELECT e.id,
  CASE (e.id%5)
    WHEN 0 THEN 'Renuncia voluntaria'
    WHEN 1 THEN 'Término de contrato'
    WHEN 2 THEN 'Despido'
    WHEN 3 THEN 'Jubilación'
    ELSE 'Otro' END,
  e.fecha_ingreso + (180+(e.id%90)),
  CASE (e.id%5)
    WHEN 0 THEN 'El empleado decidió buscar nuevas oportunidades laborales.'
    WHEN 1 THEN 'Fin del período contractual establecido.'
    WHEN 2 THEN 'Incumplimiento reiterado de políticas internas.'
    WHEN 3 THEN 'Empleado alcanzó edad de jubilación.'
    ELSE 'Mutuo acuerdo entre las partes.' END,
  (e.id%3)!=0,
  CASE WHEN (e.id%3)!=0 THEN 15 ELSE 0 END,
  '{"laptop":true,"carnet":true,"celular":true,"llaves":false,"otros":true}'::jsonb,
  (e.id%4)!=0, TRUE,
  e.fecha_ingreso + (181+(e.id%90))
FROM empleados e WHERE e.estado='Inactivo';

-- ── 10. SOLICITUDES DE VACACIONES ────────────────────────────
INSERT INTO solicitudes_permiso (id_empleado, tipo, fecha_inicio, fecha_fin, motivo, estado)
SELECT sv.id_empleado, 'Vacaciones',
  DATE '2025-09-01' + ((sv.id_empleado*11)%200),
  DATE '2025-09-01' + ((sv.id_empleado*11)%200) + 5,
  'Vacaciones familiares planificadas', 'Aprobado'
FROM saldos_vacaciones sv
WHERE sv.dias_tomados > 0 AND sv.id_empleado%3=0
LIMIT 60;

-- ── VERIFICACIÓN FINAL ────────────────────────────────────────
SELECT
  (SELECT COUNT(*) FROM empleados)                  AS empleados,
  (SELECT COUNT(*) FROM registros_asistencia)       AS asistencias,
  (SELECT COUNT(*) FROM evaluaciones_desempeno)     AS evaluaciones,
  (SELECT COUNT(*) FROM capacitaciones)             AS capacitaciones,
  (SELECT COUNT(*) FROM participantes_capacitacion) AS participantes,
  (SELECT COUNT(*) FROM salidas_empleados)          AS salidas,
  (SELECT COUNT(*) FROM saldos_vacaciones)          AS saldos_vac;
