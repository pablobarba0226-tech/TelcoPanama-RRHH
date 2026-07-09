-- ============================================================
-- RESET DATOS TELCOPANAMÁ — preserva departamentos y plantillas
-- Get-Content reset_database.sql | docker exec -i telecom-postgres psql -U postgres -d telcopanama_rrhh
-- ============================================================

-- Solo borrar datos de empleados y transacciones (NO config tables)
TRUNCATE TABLE
  alertas_generadas,
  registros_asistencia,
  solicitudes_permiso,
  saldos_vacaciones,
  participantes_capacitacion,
  capacitaciones,
  evaluaciones_desempeno,
  salidas_empleados,
  induccion_empleado,
  empleados,
  cargos
RESTART IDENTITY CASCADE;

-- Re-insertar departamentos si fueron borrados por cascade
INSERT INTO departamentos (nombre, codigo, descripcion)
SELECT * FROM (VALUES
  ('Dirección General',           'DIR',  'Alta dirección y gobierno corporativo'),
  ('Recursos Humanos',            'RRHH', 'Gestión del talento humano'),
  ('Tecnología e Infraestructura','TI',   'Redes, sistemas y TI'),
  ('Operaciones de Red',          'OPED', 'Operación y mantenimiento de red'),
  ('Ventas y Comercial',          'VEN',  'Fuerza de ventas y canal comercial'),
  ('Atención al Cliente',         'ATC',  'Soporte y servicio postventa'),
  ('Marketing y Producto',        'MKT',  'Estrategia de producto y marketing'),
  ('Finanzas y Contabilidad',     'FIN',  'Gestión financiera y contable'),
  ('Legal y Cumplimiento',        'LEG',  'Asesoría legal y cumplimiento regulatorio'),
  ('Proyectos e Ingeniería',      'ING',  'Gestión de proyectos de expansión de red'),
  ('Logística y Almacén',         'LOG',  'Gestión de inventarios y cadena de suministro'),
  ('Seguridad Corporativa',       'SEG',  'Seguridad física y de la información')
) AS d(nombre, codigo, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM departamentos WHERE codigo = d.codigo);

-- Re-insertar plantillas e items de inducción si fueron borrados
INSERT INTO plantillas_induccion (nombre, descripcion)
SELECT 'Inducción Estándar TelcoPanamá', 'Proceso de bienvenida para todos los empleados nuevos'
WHERE NOT EXISTS (SELECT 1 FROM plantillas_induccion LIMIT 1);

INSERT INTO items_induccion (id_plantilla, nombre, orden)
SELECT 1, nombre, orden FROM (VALUES
  ('Presentación de políticas internas y reglamento', 1),
  ('Recorrido de instalaciones y seguridad', 2),
  ('Entrega de equipos y herramientas de trabajo', 3),
  ('Asignación de accesos y credenciales del sistema', 4),
  ('Inducción técnica al puesto', 5),
  ('Presentación al equipo de trabajo', 6)
) AS t(nombre, orden)
WHERE NOT EXISTS (SELECT 1 FROM items_induccion LIMIT 1);

-- Verificar
SELECT 'departamentos'         AS tabla, COUNT(*) FROM departamentos
UNION ALL SELECT 'empleados',             COUNT(*) FROM empleados
UNION ALL SELECT 'saldos_vacaciones',     COUNT(*) FROM saldos_vacaciones
UNION ALL SELECT 'registros_asistencia',  COUNT(*) FROM registros_asistencia
UNION ALL SELECT 'plantillas_induccion',  COUNT(*) FROM plantillas_induccion
UNION ALL SELECT 'items_induccion',       COUNT(*) FROM items_induccion;
