-- ============================================================
-- MIGRACIÓN: evaluaciones_desempeno
-- periodo (VARCHAR) → anio (SMALLINT) + cuatrimestre (SMALLINT)
-- Ejecutar en psql o DBeaver contra telcopanama_rrhh
-- ============================================================

-- 1. Agregar nuevas columnas
ALTER TABLE evaluaciones_desempeno
  ADD COLUMN IF NOT EXISTS anio          SMALLINT,
  ADD COLUMN IF NOT EXISTS cuatrimestre  SMALLINT CHECK (cuatrimestre BETWEEN 1 AND 4);

-- 2. Migrar datos existentes desde 'periodo'
UPDATE evaluaciones_desempeno SET
  anio = NULLIF(SPLIT_PART(periodo, '-', 1), '')::SMALLINT,
  cuatrimestre = CASE
    WHEN periodo LIKE '%-Q1' OR periodo LIKE '%-S1' OR periodo LIKE '%-C1' THEN 1
    WHEN periodo LIKE '%-Q2' OR periodo LIKE '%-S2' OR periodo LIKE '%-C2' THEN 2
    WHEN periodo LIKE '%-Q3' OR periodo LIKE '%-C3'                        THEN 3
    ELSE NULL
  END
WHERE periodo IS NOT NULL;

-- 3. Año por defecto donde no se pudo parsear
UPDATE evaluaciones_desempeno
  SET anio = EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT
  WHERE anio IS NULL;

-- 4. Actualizar constraint de tipo para incluir Cuatrimestral
ALTER TABLE evaluaciones_desempeno
  DROP CONSTRAINT IF EXISTS evaluaciones_desempeno_tipo_check;
ALTER TABLE evaluaciones_desempeno
  ADD CONSTRAINT evaluaciones_desempeno_tipo_check
  CHECK (tipo IN ('Mensual','Trimestral','Cuatrimestral','Semestral','Anual','Especial'));

-- 5. NOT NULL y default en anio
ALTER TABLE evaluaciones_desempeno
  ALTER COLUMN anio SET NOT NULL,
  ALTER COLUMN anio SET DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::SMALLINT;

-- 6. Actualizar default de tipo
ALTER TABLE evaluaciones_desempeno
  ALTER COLUMN tipo SET DEFAULT 'Cuatrimestral';

-- 7. Eliminar columna periodo
ALTER TABLE evaluaciones_desempeno DROP COLUMN IF EXISTS periodo;

-- 8. Unique constraint por empleado + año + cuatrimestre + tipo
ALTER TABLE evaluaciones_desempeno
  DROP CONSTRAINT IF EXISTS uq_evaluacion_periodo;
ALTER TABLE evaluaciones_desempeno
  ADD CONSTRAINT uq_evaluacion_periodo
  UNIQUE (id_empleado, anio, cuatrimestre, tipo);

-- Verificar
SELECT 'Migración completada. Columnas actuales:' AS status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'evaluaciones_desempeno' ORDER BY ordinal_position;

-- Verificar resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'evaluaciones_desempeno'
ORDER BY ordinal_position;
