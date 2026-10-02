import express from "express";
// PDF text extraction using pdfjs-dist (browser-compatible, no CJS issues)
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs") as any;
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as any[])
        .map((item: any) => item.str || "")
        .join(" ");
      fullText += pageText + "\n";
    }
    return fullText.trim();
  } catch (err: any) {
    console.error("pdfjs extraction error:", err.message);
    return "";
  }
}
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
app.use(express.json({ limit: "20mb" }));

// ── PostgreSQL connection ─────────────────────────────────────────────────────
import { Pool } from "pg";
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    "postgresql://postgres:123456a@localhost:5435/telcopanama_rrhh",
  max: 10,
});

// Set UTF-8 encoding on every new connection
pool.on("connect", (client) => {
  client.query("SET client_encoding = 'UTF8'");
});

async function query(sql: string, params?: any[]) {
  const client = await pool.connect();
  try {
    await client.query("SET client_encoding = 'UTF8'");
    const res = await client.query(sql, params);
    return res;
  } finally {
    client.release();
  }
}

// ── Groq AI helper ────────────────────────────────────────────────────────────
async function analyzeWithGroq(prompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: "system", content: "Eres un especialista en RRHH de TelcoPanamá S.A. Respondes SIEMPRE con JSON válido sin texto adicional ni backticks." },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (res.status === 401) throw new Error("API_KEY_INVALID");
  if (res.status === 429) throw new Error("RATE_LIMIT");
  if (!res.ok) throw new Error(`Groq error ${res.status}`);

  const data = await res.json() as any;
  const text = data.choices?.[0]?.message?.content || "";
  return text.replace(/```json|```/gi, "").trim();
}

// ════════════════════════════════════════════════════════════════════════════
// EMPRESA
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/empresa", async (_req, res) => {
  try {
    const r = await query("SELECT * FROM empresa LIMIT 1");
    res.json(r.rows[0] || {});
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// DEPARTAMENTOS
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/departamentos", async (_req, res) => {
  try {
    const r = await query(`
      SELECT d.*, COUNT(e.id) AS total_empleados
      FROM departamentos d
      LEFT JOIN empleados e ON e.id_departamento = d.id AND e.estado = 'Activo'
      WHERE d.activo = TRUE
      GROUP BY d.id ORDER BY d.nombre`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ORGANIGRAMA
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/cargos", async (req, res) => {
  try {
    const { dept } = req.query;
    const params: any[] = [];
    let where = "WHERE c.activo = TRUE";
    if (dept) { params.push(dept); where += ` AND c.id_departamento = $${params.length}`; }
    const r = await query(`
      SELECT c.*, d.nombre AS departamento_nombre
      FROM cargos c
      LEFT JOIN departamentos d ON d.id = c.id_departamento
      ${where}
      ORDER BY c.id_departamento, c.titulo`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


app.get("/api/organigrama", async (_req, res) => {
  try {
    const r = await query(`
      SELECT e.id, e.nombre || ' ' || e.apellido AS nombre,
             c.titulo AS cargo, d.nombre AS departamento,
             e.id_supervisor, e.foto_url,
             e.estado, e.modalidad
      FROM empleados e
      LEFT JOIN cargos c ON c.id = e.id_cargo
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      WHERE e.estado IN ('Activo','Vacaciones')
      ORDER BY e.id_supervisor NULLS FIRST, e.id`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// EMPLEADOS
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/empleados", async (req, res) => {
  try {
    const { dept, estado, search, page = 1, limit = 50 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let where = ["1=1"];
    const params: any[] = [];

    if (dept) { params.push(dept); where.push(`e.id_departamento = $${params.length}`); }
    if (estado) { params.push(estado); where.push(`e.estado = $${params.length}`); }
    if (search) {
      params.push(`%${search}%`);
      where.push(`(e.nombre ILIKE $${params.length} OR e.apellido ILIKE $${params.length} OR e.cedula ILIKE $${params.length})`);
    }

    params.push(Number(limit), offset);
    const r = await query(`
      SELECT e.id, e.codigo_empleado, e.nombre, e.apellido, e.cedula,
             e.correo_corporativo, e.telefono, e.genero,
             e.fecha_ingreso::DATE AS fecha_ingreso,
             e.tipo_contrato, e.jornada, e.salario_base, e.estado, e.modalidad,
             e.hora_entrada, e.hora_salida, e.id_departamento, e.id_cargo, e.id_supervisor,
             d.nombre AS departamento_nombre, c.titulo AS cargo_titulo,
             s.nombre || ' ' || s.apellido AS supervisor_nombre,
             COALESCE(sv.dias_acumulados - sv.dias_tomados, 0) AS dias_pendientes
      FROM empleados e
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      LEFT JOIN empleados s ON s.id = e.id_supervisor
      LEFT JOIN saldos_vacaciones sv ON sv.id_empleado = e.id
      WHERE ${where.join(" AND ")}
      ORDER BY e.apellido, e.nombre
      LIMIT $${params.length - 1} OFFSET $${params.length}`, params);

    const count = await query(`SELECT COUNT(*) FROM empleados e WHERE ${where.join(" AND ")}`,
      params.slice(0, -2));
    res.json({ data: r.rows, total: Number(count.rows[0].count) });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/empleados/:id", async (req, res) => {
  try {
    const r = await query(`
      SELECT e.id, e.codigo_empleado, e.nombre, e.apellido, e.cedula,
             e.correo_corporativo, e.telefono, e.genero,
             e.fecha_ingreso::DATE AS fecha_ingreso,
             e.tipo_contrato, e.jornada, e.salario_base, e.estado, e.modalidad,
             e.hora_entrada, e.hora_salida, e.id_departamento, e.id_cargo, e.id_supervisor,
             d.nombre AS departamento_nombre, c.titulo AS cargo_titulo,
             sv.dias_acumulados, sv.dias_tomados,
      COALESCE(sv.dias_acumulados - sv.dias_tomados, 0) AS dias_pendientes
      FROM empleados e
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      LEFT JOIN saldos_vacaciones sv ON sv.id_empleado = e.id
      WHERE e.id = $1`, [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "No encontrado" });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/empleados", async (req, res) => {
  try {
    const b = req.body;

    // Sanitize: empty strings → null, numeric strings → numbers
    const str  = (v: any) => (v === '' || v == null) ? null : String(v);
    const num  = (v: any) => (v === '' || v == null) ? null : Number(v);
    const date = (v: any) => (v === '' || v == null) ? null : String(v);

    // Auto-generate employee code
    const count = await query("SELECT COUNT(*) FROM empleados");
    const code = `EMP-${String(Number(count.rows[0].count) + 1).padStart(4, "0")}`;

    const r = await query(`
      INSERT INTO empleados (
        codigo_empleado, nombre, apellido, cedula,
        correo_corporativo, correo_personal, telefono,
        fecha_nacimiento, genero,
        id_departamento, id_cargo, id_supervisor,
        fecha_ingreso, tipo_contrato, jornada,
        salario_base, estado, modalidad,
        hora_entrada, hora_salida, nacionalidad
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        $10,$11,$12,$13,$14,$15,
        $16,$17,$18,$19,$20,$21
      ) RETURNING *`,
      [
        code,
        str(b.nombre),
        str(b.apellido),
        str(b.cedula),
        str(b.correo_corporativo),
        str(b.correo_personal),
        str(b.telefono),
        date(b.fecha_nacimiento),
        str(b.genero),
        num(b.id_departamento),
        num(b.id_cargo),
        num(b.id_supervisor),
        date(b.fecha_ingreso) || new Date().toISOString().slice(0, 10),
        str(b.tipo_contrato) || 'Indefinido',
        str(b.jornada) || 'Completa',
        num(b.salario_base) ?? 0,
        str(b.estado) || 'Activo',
        str(b.modalidad) || 'Presencial',
        str(b.hora_entrada) || '08:00',
        str(b.hora_salida)  || '17:00',
        str(b.nacionalidad) || 'Panameña',
      ]);

    // Crear saldo vacaciones
    await query(
      `INSERT INTO saldos_vacaciones(id_empleado, dias_acumulados, dias_tomados)
       VALUES ($1, 0, 0) ON CONFLICT DO NOTHING`,
      [r.rows[0].id]);

    // Crear checklist de inducción
    const items = await query("SELECT id FROM items_induccion WHERE id_plantilla = 1");
    for (const item of items.rows) {
      await query(
        `INSERT INTO induccion_empleado (id_empleado, id_item) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [r.rows[0].id, item.id]);
    }
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/empleados/:id", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      UPDATE empleados SET nombre=$1, apellido=$2, id_departamento=$3, id_cargo=$4,
        id_supervisor=$5, salario_base=$6, estado=$7, modalidad=$8, tipo_contrato=$9,
        jornada=$10, hora_entrada=$11, hora_salida=$12, actualizado_en=NOW()
      WHERE id=$13 RETURNING *`,
      [b.nombre, b.apellido, b.id_departamento, b.id_cargo, b.id_supervisor,
       b.salario_base, b.estado, b.modalidad, b.tipo_contrato, b.jornada,
       b.hora_entrada, b.hora_salida, req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/salidas/:id — actualizar accesos, activos, firmado
app.patch("/api/salidas/:id", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      UPDATE salidas_empleados SET
        accesos_cerrados  = COALESCE($1, accesos_cerrados),
        activos_firmado   = COALESCE($2, activos_firmado),
        activos_devueltos = COALESCE($3::jsonb, activos_devueltos),
        motivo            = COALESCE($4, motivo),
        fecha_cierre_accesos = CASE WHEN $1 = TRUE AND fecha_cierre_accesos IS NULL THEN CURRENT_DATE ELSE fecha_cierre_accesos END
      WHERE id = $5 RETURNING *`,
      [b.accesos_cerrados !== undefined ? b.accesos_cerrados : null,
       b.activos_firmado  !== undefined ? b.activos_firmado  : null,
       b.activos_devueltos ? JSON.stringify(b.activos_devueltos) : null,
       b.motivo || null,
       req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Inducción empleado ────────────────────────────────────────────────────────
app.get("/api/empleados/:id/induccion", async (req, res) => {
  try {
    const r = await query(`
      SELECT ii.id AS id_item, ii.nombre, ii.descripcion, ii.obligatorio,
             ie.completado, ie.fecha_completado::DATE::TEXT AS fecha_completado, ie.observaciones
      FROM items_induccion ii
      LEFT JOIN induccion_empleado ie ON ie.id_item = ii.id AND ie.id_empleado = $1
      WHERE ii.id_plantilla = 1
      ORDER BY ii.orden`, [req.params.id]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/empleados/:id/induccion/:itemId", async (req, res) => {
  try {
    const { completado, observaciones } = req.body;
    await query(`
      INSERT INTO induccion_empleado (id_empleado, id_item, completado, fecha_completado, observaciones)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (id_empleado, id_item) DO UPDATE
      SET completado=$3, fecha_completado=$4, observaciones=$5`,
      [req.params.id, req.params.itemId, completado,
       completado ? new Date().toISOString().split("T")[0] : null, observaciones]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Historial del empleado ────────────────────────────────────────────────────
app.get("/api/empleados/:id/historial", async (req, res) => {
  try {
    const [eval_, caps, ausencias, vacac] = await Promise.all([
      query(`SELECT 'evaluacion' AS tipo,
               anio::text || CASE WHEN cuatrimestre IS NOT NULL THEN ' C' || cuatrimestre ELSE '' END AS descripcion,
               promedio::text AS valor, creado_en AS fecha
             FROM evaluaciones_desempeno WHERE id_empleado=$1 ORDER BY creado_en DESC LIMIT 10`, [req.params.id]),
      query(`SELECT 'capacitacion' AS tipo, c.titulo AS descripcion, pc.nota_evaluacion::text AS valor, pc.fecha_completado AS fecha
             FROM participantes_capacitacion pc JOIN capacitaciones c ON c.id=pc.id_capacitacion
             WHERE pc.id_empleado=$1 ORDER BY pc.fecha_completado DESC LIMIT 10`, [req.params.id]),
      query(`SELECT 'ausencia' AS tipo, estado AS descripcion, justificado::text AS valor, fecha
             FROM registros_asistencia WHERE id_empleado=$1 AND estado IN ('Ausente','Tardanza')
             ORDER BY fecha DESC LIMIT 20`, [req.params.id]),
      query(`SELECT 'vacacion' AS tipo, tipo AS descripcion, estado AS valor, fecha_inicio::date AS fecha
             FROM solicitudes_permiso WHERE id_empleado=$1 ORDER BY fecha_inicio DESC LIMIT 10`, [req.params.id]),
    ]);
    const all = [...eval_.rows, ...caps.rows, ...ausencias.rows, ...vacac.rows]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    res.json(all);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// ── Asistencia individual de empleado ────────────────────────────────────────
app.get("/api/empleados/:id/asistencia", async (req, res) => {
  try {
    const { meses = "3" } = req.query;
    const [registros, resumen] = await Promise.all([
      query(`
        SELECT ra.fecha::DATE::TEXT AS fecha, ra.hora_entrada::TEXT, ra.hora_salida::TEXT,
               ra.estado, ra.minutos_tardanza, ra.justificado, ra.observaciones
        FROM registros_asistencia ra
        WHERE ra.id_empleado=$1
          AND ra.fecha >= CURRENT_DATE - INTERVAL '1 month' * $2
        ORDER BY ra.fecha DESC
        LIMIT 90`, [req.params.id, meses]),
      query(`
        SELECT
          COUNT(*) FILTER(WHERE ra.estado='Presente')   AS presentes,
          COUNT(*) FILTER(WHERE ra.estado='Tardanza')   AS tardanzas,
          COUNT(*) FILTER(WHERE ra.estado='Ausente')    AS ausentes,
          COUNT(*) FILTER(WHERE ra.estado='Vacaciones') AS vacaciones,
          ROUND(AVG(ra.minutos_tardanza) FILTER(WHERE ra.estado='Tardanza'),1) AS promedio_tardanza,
          COUNT(*) FILTER(WHERE ra.estado='Tardanza' AND NOT ra.justificado) AS tardanzas_injustificadas,
          COUNT(*) FILTER(WHERE ra.estado='Ausente'  AND NOT ra.justificado) AS ausencias_injustificadas,
          COUNT(*) AS total_registros
        FROM registros_asistencia ra
        WHERE ra.id_empleado=$1
          AND ra.fecha >= CURRENT_DATE - INTERVAL '1 month' * $2`,
        [req.params.id, meses])
    ]);
    res.json({ registros: registros.rows, resumen: resumen.rows[0] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Vacaciones individuales ───────────────────────────────────────────────────
app.get("/api/empleados/:id/vacaciones", async (req, res) => {
  try {
    const [saldo, solicitudes, emp] = await Promise.all([
      query(`SELECT * FROM saldos_vacaciones WHERE id_empleado=$1`, [req.params.id]),
      query(`
        SELECT id, tipo, fecha_inicio::DATE, fecha_fin::DATE,
               dias_solicitados, motivo, estado, creado_en::DATE AS solicitado_en
        FROM solicitudes_permiso
        WHERE id_empleado=$1
        ORDER BY fecha_inicio DESC`, [req.params.id]),
      query(`SELECT salario_base, fecha_ingreso::DATE FROM empleados WHERE id=$1`, [req.params.id])
    ]);
    const sal = saldo.rows[0] || { dias_acumulados: 0, dias_tomados: 0, dias_pendientes: 0 };
    const salario = Number(emp.rows[0]?.salario_base || 0);
    const diasPendientes = Number(sal.dias_pendientes || 0);
    // Cost calculation: salary/30 * pending days
    const costoVacaciones = salario > 0 ? ((salario / 30) * diasPendientes).toFixed(2) : null;
    // Years of service
    const fechaIngreso = emp.rows[0]?.fecha_ingreso;
    const aniosServicio = fechaIngreso
      ? Math.floor((Date.now() - new Date(fechaIngreso).getTime()) / (365.25 * 24 * 3600 * 1000))
      : null;
    res.json({
      saldo: sal,
      solicitudes: solicitudes.rows,
      costoVacaciones,
      aniosServicio,
      salarioDiario: salario > 0 ? (salario / 30).toFixed(2) : null
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Capacitaciones de empleado ────────────────────────────────────────────────
app.get("/api/empleados/:id/capacitaciones", async (req, res) => {
  try {
    const r = await query(`
      SELECT c.id, c.titulo, c.tipo, c.modalidad, c.duracion_horas, c.proveedor,
             c.fecha_inicio::DATE::TEXT AS fecha_inicio,
             c.fecha_fin::DATE::TEXT    AS fecha_fin,
             pc.estado AS estado_participante,
             pc.nota_evaluacion,
             CASE WHEN pc.nota_evaluacion IS NOT NULL THEN pc.nota_evaluacion >= 71
                  ELSE pc.aprobado END AS aprobado,
             pc.fecha_completado::DATE::TEXT AS fecha_completado,
             pc.observaciones
      FROM participantes_capacitacion pc
      JOIN capacitaciones c ON c.id = pc.id_capacitacion
      WHERE pc.id_empleado = $1
      ORDER BY c.fecha_inicio DESC NULLS LAST`, [req.params.id]);
    // Summary
    const completadas = r.rows.filter((x: any) => x.estado_participante === 'Completado');
    const aprobadas   = r.rows.filter((x: any) => x.aprobado === true);
    const horasTotales = completadas.reduce((s: number, x: any) => s + Number(x.duracion_horas || 0), 0);
    const notaPromedio = completadas.filter((x: any) => x.nota_evaluacion).length
      ? (completadas.reduce((s: number, x: any) => s + Number(x.nota_evaluacion || 0), 0)
         / completadas.filter((x: any) => x.nota_evaluacion).length).toFixed(1)
      : null;
    res.json({
      capacitaciones: r.rows,
      resumen: { total: r.rows.length, completadas: completadas.length, aprobadas: aprobadas.length, horasTotales, notaPromedio }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Evaluaciones de empleado ──────────────────────────────────────────────────
app.get("/api/empleados/:id/evaluaciones", async (req, res) => {
  try {
    const r = await query(`
      SELECT ev.*,
             ev.creado_en::DATE AS fecha,
             e2.nombre || ' ' || e2.apellido AS evaluador_nombre
      FROM evaluaciones_desempeno ev
      LEFT JOIN empleados e2 ON e2.id = ev.id_evaluador
      WHERE ev.id_empleado=$1
      ORDER BY ev.creado_en DESC`, [req.params.id]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ASISTENCIA
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/asistencia", async (req, res) => {
  try {
    const { fecha, dept, semana } = req.query;
    let where = ["1=1"];
    const params: any[] = [];

    if (semana === "true") {
      where.push(`ra.fecha >= CURRENT_DATE - INTERVAL '7 days'`);
    } else if (fecha) {
      params.push(fecha);
      where.push(`ra.fecha = $${params.length}`);
    } else {
      where.push(`ra.fecha = CURRENT_DATE - INTERVAL '1 day'`);
    }
    if (dept) { params.push(dept); where.push(`e.id_departamento = $${params.length}`); }

    const r = await query(`
      SELECT ra.id, ra.id_empleado,
             ra.fecha::DATE::TEXT        AS fecha,
             ra.hora_entrada::TEXT       AS hora_entrada,
             ra.hora_salida::TEXT        AS hora_salida,
             ra.estado, ra.minutos_tardanza, ra.justificado, ra.observaciones,
             e.nombre || ' ' || e.apellido AS empleado_nombre,
             d.nombre AS departamento, c.titulo AS cargo
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      WHERE ${where.join(" AND ")}
      ORDER BY d.nombre, e.apellido`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/asistencia", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      INSERT INTO registros_asistencia (id_empleado,fecha,hora_entrada,hora_salida,estado,
        minutos_tardanza,justificado,tipo_justificante,observaciones)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id_empleado,fecha) DO UPDATE SET
        hora_entrada=$3,hora_salida=$4,estado=$5,minutos_tardanza=$6,
        justificado=$7,tipo_justificante=$8,observaciones=$9
      RETURNING *`,
      [b.id_empleado, b.fecha, b.hora_entrada, b.hora_salida, b.estado,
       b.minutos_tardanza || 0, b.justificado || false,
       b.tipo_justificante, b.observaciones]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Resumen diario / semanal
app.get("/api/asistencia/resumen", async (req, res) => {
  try {
    const { dept } = req.query;
    const rParams: any[] = [];
    let deptFilter2 = "";
    if (dept) { rParams.push(dept); deptFilter2 = `AND e.id_departamento = $${rParams.length}`; }
    const r = await query(`
      SELECT ra.fecha::DATE::TEXT AS fecha,
             COUNT(*) AS total,
             COUNT(*) FILTER(WHERE ra.estado='Presente') AS presentes,
             COUNT(*) FILTER(WHERE ra.estado='Tardanza') AS tardanzas,
             COUNT(*) FILTER(WHERE ra.estado='Ausente')  AS ausentes,
             COUNT(*) FILTER(WHERE ra.estado='Vacaciones') AS vacaciones,
             ROUND(COUNT(*) FILTER(WHERE ra.estado IN ('Presente','Tardanza'))::numeric/NULLIF(COUNT(*),0)*100,1) AS pct
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      WHERE ra.fecha >= CURRENT_DATE - INTERVAL '30 days' ${deptFilter2}
      GROUP BY ra.fecha ORDER BY ra.fecha DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// VACACIONES / PERMISOS
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/permisos", async (req, res) => {
  try {
    const { estado, dept, fecha } = req.query;
    let where = ["1=1"];
    const params: any[] = [];
    if (estado) { params.push(estado); where.push(`sp.tipo = $${params.length}`); }
    if (dept)   { params.push(dept);   where.push(`e.id_departamento = $${params.length}`); }
    if (fecha)  { params.push(fecha);  where.push(`sp.fecha_inicio::DATE <= $${params.length}::date AND sp.fecha_fin::DATE >= $${params.length}::date`); }
    const r = await query(`
      SELECT sp.id, sp.tipo, sp.estado,
             sp.fecha_inicio::DATE::TEXT AS fecha_inicio,
             sp.fecha_fin::DATE::TEXT    AS fecha_fin,
             sp.dias_solicitados, sp.motivo,
             sp.creado_en::DATE::TEXT    AS creado_en,
             e.id AS id_empleado,
             e.nombre || ' ' || e.apellido AS empleado_nombre,
             d.nombre AS departamento,
             a.nombre || ' ' || a.apellido AS aprobador_nombre
      FROM solicitudes_permiso sp
      JOIN empleados e ON e.id = sp.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN empleados a ON a.id = sp.aprobado_por
      WHERE ${where.join(" AND ")}
      ORDER BY sp.fecha_inicio DESC`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/permisos", async (req, res) => {
  try {
    const b = req.body;
    // Check saldo vacaciones
    if (b.tipo === "Vacaciones") {
      const sv = await query("SELECT dias_pendientes FROM saldos_vacaciones WHERE id_empleado=$1", [b.id_empleado]);
      const dias = b.fecha_fin && b.fecha_inicio
        ? Math.ceil((new Date(b.fecha_fin).getTime() - new Date(b.fecha_inicio).getTime()) / 86400000) + 1
        : 0;
      if (!sv.rows.length || sv.rows[0].dias_pendientes < dias)
        return res.status(400).json({ error: "Saldo de vacaciones insuficiente" });
    }
    const r = await query(`
      INSERT INTO solicitudes_permiso (id_empleado, tipo, fecha_inicio, fecha_fin, motivo, estado)
      VALUES ($1,$2,$3,$4,$5,'Pendiente') RETURNING *`,
      [b.id_empleado, b.tipo, b.fecha_inicio, b.fecha_fin, b.motivo]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/permisos/:id/aprobar", async (req, res) => {
  try {
    const { estado, aprobado_por, comentario } = req.body;
    const perm = await query("SELECT * FROM solicitudes_permiso WHERE id=$1", [req.params.id]);
    if (!perm.rows.length) return res.status(404).json({ error: "No encontrado" });
    const p = perm.rows[0];
    await query(`UPDATE solicitudes_permiso SET estado=$1,aprobado_por=$2,
      comentario_rrhh=$3,fecha_aprobacion=NOW() WHERE id=$4`,
      [estado, aprobado_por, comentario, req.params.id]);
    // Descontar días si vacaciones aprobadas
    if (estado === "Aprobado" && p.tipo === "Vacaciones") {
      await query(`UPDATE saldos_vacaciones SET dias_tomados = dias_tomados + $1
        WHERE id_empleado = $2`, [p.dias_solicitados, p.id_empleado]);
    }
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// CAPACITACIONES
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/capacitaciones", async (req, res) => {
  try {
    const { estado, dept } = req.query;
    let where = ["1=1"];
    const params: any[] = [];
    if (estado) { params.push(estado); where.push(`c.estado = $${params.length}`); }
    if (dept) { params.push(dept); where.push(`(c.id_departamento = $${params.length} OR c.id_departamento IS NULL)`); }
    const r = await query(`
      SELECT c.id, c.titulo, c.descripcion, c.proveedor, c.tipo, c.modalidad,
             c.duracion_horas, c.costo, c.estado, c.max_participantes,
             c.id_departamento, c.estado_aprobacion,
             c.fecha_inicio::DATE::TEXT AS fecha_inicio,
             c.fecha_fin::DATE::TEXT AS fecha_fin,
             d.nombre AS departamento_nombre,
             p.nombre || ' ' || p.apellido AS propuesto_nombre,
             COUNT(pc.id) AS inscritos,
             COUNT(pc.id) FILTER(WHERE pc.estado='Completado') AS completados,
             ROUND(AVG(pc.nota_evaluacion),1) AS nota_promedio
      FROM capacitaciones c
      LEFT JOIN departamentos d ON d.id = c.id_departamento
      LEFT JOIN empleados p ON p.id = c.propuesto_por
      LEFT JOIN participantes_capacitacion pc ON pc.id_capacitacion = c.id
      WHERE ${where.join(" AND ")}
      GROUP BY c.id, d.nombre, p.nombre, p.apellido
      ORDER BY c.fecha_inicio DESC NULLS LAST`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/capacitaciones", async (req, res) => {
  try {
    const b = req.body;
    // Sanitize: empty strings → null, numbers as proper types
    const n = (v: any) => (v === '' || v === undefined || v === null) ? null : v;
    const num = (v: any) => (v === '' || v === undefined || v === null) ? null : Number(v);
    const r = await query(`
      INSERT INTO capacitaciones (titulo,descripcion,proveedor,tipo,modalidad,duracion_horas,
        costo,fecha_inicio,fecha_fin,estado,max_participantes,id_departamento,estado_aprobacion)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [b.titulo, n(b.descripcion), n(b.proveedor), b.tipo || 'Interna', b.modalidad || 'Presencial',
       num(b.duracion_horas), num(b.costo) ?? 0,
       n(b.fecha_inicio), n(b.fecha_fin),
       b.estado || 'Programada', num(b.max_participantes),
       num(b.id_departamento), 'Pendiente']);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/capacitaciones/:id", async (req, res) => {
  try {
    const b = req.body;
    const n = (v: any) => (v === '' || v === undefined || v === null) ? null : v;
    const num = (v: any) => (v === '' || v === undefined || v === null) ? null : Number(v);
    const r = await query(`
      UPDATE capacitaciones SET titulo=$1,descripcion=$2,proveedor=$3,tipo=$4,modalidad=$5,
        duracion_horas=$6,costo=$7,fecha_inicio=$8,fecha_fin=$9,estado=$10,
        max_participantes=$11,id_departamento=$12,estado_aprobacion=$13
      WHERE id=$14 RETURNING *`,
      [b.titulo, n(b.descripcion), n(b.proveedor), b.tipo, b.modalidad,
       num(b.duracion_horas), num(b.costo) ?? 0,
       n(b.fecha_inicio), n(b.fecha_fin), b.estado || 'Programada',
       num(b.max_participantes), num(b.id_departamento),
       b.estado_aprobacion || 'Pendiente', req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Participantes
app.get("/api/capacitaciones/:id/participantes", async (req, res) => {
  try {
    const r = await query(`
      SELECT pc.*, e.nombre || ' ' || e.apellido AS empleado_nombre,
             d.nombre AS departamento
      FROM participantes_capacitacion pc
      JOIN empleados e ON e.id = pc.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      WHERE pc.id_capacitacion = $1`, [req.params.id]);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/capacitaciones/:id/participantes/departamento — inscribir empleados activos de un depto
app.post("/api/capacitaciones/:id/participantes/departamento", async (req, res) => {
  try {
    const { id_departamento } = req.body;
    if (!id_departamento) return res.status(400).json({ error: "id_departamento requerido" });

    // Get capacitación dates to check who works during that period
    const cap = await query(`SELECT fecha_inicio, fecha_fin, modalidad FROM capacitaciones WHERE id=$1`, [req.params.id]);
    const capData = cap.rows[0];

    // Only include employees who ARE working (Activo) in that dept
    // Exclude employees on vacation during the training period if dates are set
    let sql = `SELECT DISTINCT e.id, e.nombre, e.apellido FROM empleados e
      WHERE e.id_departamento=$1 AND e.estado='Activo'`;
    const params: any[] = [id_departamento];

    // If capacitación has dates, exclude employees on approved vacation leave during that period
    if (capData?.fecha_inicio && capData?.fecha_fin) {
      sql += ` AND NOT EXISTS (
        SELECT 1 FROM solicitudes_permiso sp
        WHERE sp.id_empleado=e.id AND sp.estado='Aprobado' AND sp.tipo='Vacaciones'
        AND sp.fecha_inicio::DATE <= $2::date AND sp.fecha_fin::DATE >= $3::date
      )`;
      params.push(capData.fecha_inicio, capData.fecha_fin);
    }

    const emps = await query(sql, params);
    let inserted = 0;
    for (const e of emps.rows) {
      await query(
        `INSERT INTO participantes_capacitacion (id_capacitacion, id_empleado)
         VALUES ($1,$2) ON CONFLICT (id_capacitacion,id_empleado) DO NOTHING`,
        [req.params.id, e.id]);
      inserted++;
    }
    const excluidos = await query(
      `SELECT COUNT(*) AS total FROM empleados WHERE id_departamento=$1 AND estado='Activo'`,
      [id_departamento]);
    const totalActivos = Number(excluidos.rows[0].total);
    res.json({
      inserted,
      total: totalActivos,
      excluidos_vacaciones: totalActivos - inserted,
      mensaje: `${inserted} empleados inscritos${totalActivos-inserted>0 ? ` (${totalActivos-inserted} excluidos por vacaciones durante el período)` : ''}`
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/capacitaciones/:id/participantes", async (req, res) => {
  try {
    const { empleados_ids } = req.body; // array of ids
    const results = [];
    for (const eid of empleados_ids) {
      const r = await query(`
        INSERT INTO participantes_capacitacion (id_capacitacion, id_empleado)
        VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING *`,
        [req.params.id, eid]);
      if (r.rows.length) results.push(r.rows[0]);
    }
    res.json(results);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/capacitaciones/:id/participantes/:empId", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      UPDATE participantes_capacitacion SET estado=$1,nota_evaluacion=$2,
        aprobado=$3,fecha_completado=$4,observaciones=$5
      WHERE id_capacitacion=$6 AND id_empleado=$7 RETURNING *`,
      [b.estado, b.nota_evaluacion, b.aprobado,
       b.fecha_completado, b.observaciones, req.params.id, req.params.empId]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// EVALUACIONES DE DESEMPEÑO
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/evaluaciones", async (req, res) => {
  try {
    const { dept, anio, cuatrimestre } = req.query;
    let where = ["1=1"];
    const params: any[] = [];
    if (dept)         { params.push(dept);         where.push(`e.id_departamento = $${params.length}`); }
    if (anio)         { params.push(anio);         where.push(`ev.anio = $${params.length}`); }
    if (cuatrimestre) { params.push(cuatrimestre); where.push(`ev.cuatrimestre = $${params.length}`); }
    const r = await query(`
      SELECT ev.*, e.nombre || ' ' || e.apellido AS empleado_nombre,
             d.nombre AS departamento, c.titulo AS cargo,
             ev2.nombre || ' ' || ev2.apellido AS evaluador_nombre
      FROM evaluaciones_desempeno ev
      JOIN empleados e ON e.id = ev.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      LEFT JOIN empleados ev2 ON ev2.id = ev.id_evaluador
      WHERE ${where.join(" AND ")}
      ORDER BY ev.creado_en DESC`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/evaluaciones", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      INSERT INTO evaluaciones_desempeno
        (id_empleado,id_evaluador,anio,cuatrimestre,tipo,
         puntaje_liderazgo,puntaje_trabajo_equipo,
         puntaje_comunicacion,puntaje_iniciativa,puntaje_tecnico,puntaje_cumplimiento,
         proyectos_asignados,proyectos_entregados,proyectos_a_tiempo,
         estado,plan_mejora,comentarios)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [b.id_empleado, b.id_evaluador,
       b.anio || new Date().getFullYear(), b.cuatrimestre || null,
       b.tipo || "Cuatrimestral",
       b.puntaje_liderazgo, b.puntaje_trabajo_equipo, b.puntaje_comunicacion,
       b.puntaje_iniciativa, b.puntaje_tecnico, b.puntaje_cumplimiento,
       b.proyectos_asignados || 0, b.proyectos_entregados || 0, b.proyectos_a_tiempo || 0,
       b.estado || "Borrador", b.plan_mejora, b.comentarios]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PUT /api/evaluaciones/:id — editar evaluación existente
app.put("/api/evaluaciones/:id", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      UPDATE evaluaciones_desempeno SET
        anio=$1, cuatrimestre=$2, tipo=$3,
        puntaje_liderazgo=$4, puntaje_trabajo_equipo=$5, puntaje_comunicacion=$6,
        puntaje_iniciativa=$7, puntaje_tecnico=$8, puntaje_cumplimiento=$9,
        proyectos_asignados=$10, proyectos_entregados=$11, proyectos_a_tiempo=$12,
        estado=$13, plan_mejora=$14, comentarios=$15,
        firma_empleado=$16, firma_supervisor=$17
      WHERE id=$18 RETURNING *`,
      [b.anio, b.cuatrimestre || null, b.tipo,
       b.puntaje_liderazgo, b.puntaje_trabajo_equipo, b.puntaje_comunicacion,
       b.puntaje_iniciativa, b.puntaje_tecnico, b.puntaje_cumplimiento,
       b.proyectos_asignados || 0, b.proyectos_entregados || 0, b.proyectos_a_tiempo || 0,
       b.estado, b.plan_mejora || null, b.comentarios || null,
       b.firma_empleado || false, b.firma_supervisor || false,
       req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/evaluaciones/:id/estado — cambio rápido de estado
app.patch("/api/evaluaciones/:id/estado", async (req, res) => {
  try {
    const { estado, plan_mejora, firma_empleado, firma_supervisor } = req.body;
    const r = await query(`
      UPDATE evaluaciones_desempeno SET
        estado = COALESCE($1, estado),
        plan_mejora = COALESCE($2, plan_mejora),
        firma_empleado = COALESCE($3, firma_empleado),
        firma_supervisor = COALESCE($4, firma_supervisor)
      WHERE id = $5 RETURNING *`,
      [estado || null, plan_mejora || null,
       firma_empleado !== undefined ? firma_empleado : null,
       firma_supervisor !== undefined ? firma_supervisor : null,
       req.params.id]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// RECLUTAMIENTO (con IA Groq)
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/vacantes", async (_req, res) => {
  try {
    const r = await query(`
      SELECT 
        v.id,
        v.titulo,
        v.descripcion,
        v.requisitos,
        v.palabras_clave,
        v.salario_ofrecido,
        v.modalidad,
        v.cantidad,
        v.fecha_apertura::DATE::TEXT AS fecha_apertura,
        v.fecha_cierre::DATE::TEXT AS fecha_cierre,
        v.estado,
        d.nombre AS departamento_nombre,
        COUNT(c.id)::int AS total_candidatos,
        COUNT(c.id) FILTER(WHERE c.estado='Contratado')::int AS contratados,
        COUNT(c.id) FILTER(WHERE c.estado='Aprobado')::int AS aprobados_count
      FROM vacantes v
      LEFT JOIN departamentos d ON d.id = v.id_departamento
      LEFT JOIN candidatos c ON c.id_vacante = v.id
      WHERE v.estado != 'Cancelada'
      GROUP BY v.id, d.id, d.nombre
      ORDER BY v.fecha_apertura DESC
    `);
    res.json(r.rows);
  } catch (e: any) { 
    res.status(500).json({ error: e.message }); 
  }
});

app.post("/api/vacantes", async (req, res) => {
  try {
    const b = req.body;

    // Convertir palabras_clave a array si viene como string
    const keywordsArray = Array.isArray(b.palabras_clave)
      ? b.palabras_clave
      : (b.palabras_clave ? b.palabras_clave.split(",").map((s: string) => s.trim()).filter(Boolean) : []);

    const r = await query(`
      INSERT INTO vacantes (
        titulo, id_departamento, descripcion, requisitos, palabras_clave,
        salario_ofrecido, salario_max, modalidad, cantidad,
        fecha_apertura, fecha_cierre, estado,
        supervisado_por, tipo_puesto, ubicacion, fecha_necesaria,
        resumen_puesto, funciones,
        formacion_academica, experiencia_requerida, habilidades,
        genero_requerido, edad_minima, edad_maxima,
        solicitado_por
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,
        CURRENT_DATE,$10,'Abierta',
        $11,$12,$13,$14,
        $15,$16,
        $17,$18,$19,
        $20,$21,$22,
        $23
      ) RETURNING *`,
      [
        b.titulo,
        b.id_departamento || null,
        b.descripcion || null,
        b.requisitos || null,
        keywordsArray,
        b.salario_ofrecido || null,
        b.salario_max || null,
        b.modalidad || 'Presencial',
        b.cantidad || 1,
        b.fecha_limite || b.fecha_cierre || null,   // acepta ambos nombres
        b.supervisado_por || null,
        b.tipo_puesto || null,
        b.ubicacion || null,
        b.fecha_necesaria || null,
        b.resumen_puesto || null,
        b.funciones ? JSON.stringify(b.funciones) : null,   // JSONB array
        b.formacion_academica || null,
        b.experiencia_requerida || null,
        b.habilidades || null,
        b.genero_requerido || null,
        b.edad_minima || null,
        b.edad_maxima || null,
        b.solicitado_por || null,
      ]
    );

    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/candidatos", async (req, res) => {
  try {
    const { vacante, estado } = req.query;
    let where = ["1=1"];
    const params: any[] = [];
    if (vacante) { params.push(vacante); where.push(`c.id_vacante = $${params.length}`); }
    if (estado) { params.push(estado); where.push(`c.estado = $${params.length}`); }
    const r = await query(`
      SELECT c.*, v.titulo AS vacante_titulo, v.palabras_clave AS vacante_keywords
      FROM candidatos c
      LEFT JOIN vacantes v ON v.id = c.id_vacante
      WHERE ${where.join(" AND ")}
      ORDER BY c.score_ia DESC NULLS LAST, c.fecha_recepcion DESC`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/candidatos/analizar", async (req, res) => {
  try {
    const { cvTexto, id_vacante, nombre_archivo, pdfBase64 } = req.body;

    // If PDF was sent as base64, extract text server-side using pdf-parse
    let textoFinal = cvTexto || "";
    if (pdfBase64) {
      try {
        const buffer = Buffer.from(pdfBase64, "base64");
        const parsed = await pdfParse(buffer);
        textoFinal = parsed.text;
      } catch (pdfErr) {
        console.error("pdf-parse error:", pdfErr);
        textoFinal = cvTexto || `[PDF no legible: ${nombre_archivo}]`;
      }
    }

    // Get vacancy keywords
    const vac = await query("SELECT * FROM vacantes WHERE id=$1", [id_vacante]);
    if (!vac.rows.length) return res.status(404).json({ error: "Vacante no encontrada" });
    const v = vac.rows[0];

    // Get all other departments for cross-department suggestion
    const depts = await query("SELECT id, nombre FROM departamentos WHERE activo=TRUE");
    const deptRef = v.departamento_id ?? v.id_departamento ?? v.departamento;
    const deptName =
      depts.rows.find((d) => String(d.id) === String(deptRef))?.nombre ??
      (typeof deptRef === "string" ? deptRef : null) ??
      "No especificado";
        // Build semantic equivalences for common keywords
      const reqPartes = [
        v.formacion_academica && `- Formación académica: ${v.formacion_academica}`,
        v.experiencia_requerida && `- Experiencia requerida: ${v.experiencia_requerida}`,
        v.habilidades && `- Habilidades y conocimientos: ${v.habilidades}`,
      ].filter(Boolean);
      
      const requisitosEstructurados = reqPartes.length
        ? `REQUISITOS MÍNIMOS:\n${reqPartes.join("\n")}`
        : "";
      const prompt = [
        "Eres un especialista senior en reclutamiento de TelcoPanamá S.A., empresa de telecomunicaciones en Panamá.",
        `Analiza este CV para la vacante: "${v.titulo}" (Departamento: ${deptName})`,
        "",
        `DESCRIPCIÓN / RESUMEN DEL PUESTO:`,
        v.resumen_puesto || v.descripcion || "No especificada",
        v.tipo_puesto ? `TIPO DE PUESTO: ${v.tipo_puesto}` : "",
        "",
        "══ REQUISITOS MÍNIMOS ══",
        requisitosEstructurados,
        "",
        "══ FUNCIONES ESENCIALES DEL CARGO ══",
        seccionFunciones,
        "",
        "══ PALABRAS CLAVE ADICIONALES ══",
        kwWithEquiv,
        "",
        "REGLA DE EVALUACIÓN:",
        "- Evalúa si el candidato cumple CADA UNO de los requisitos mínimos.",
        "- Para habilidades/conocimientos, aplica criterio semántico: variantes y equivalentes cuentan.",
        "- Penaliza fuertemente si NO cumple formación académica o experiencia mínima.",
        "- Si género es requerido y el CV lo indica diferente, mencionarlo en debilidades_ia.",
        "- El score_ia debe reflejar el PORCENTAJE de requisitos cumplidos (0-100).",
        "- ENTREVISTAR si score >= 70, REVISAR si 45-69, DESCARTAR si < 45.",
        "",
        `ARCHIVO: ${nombre_archivo || "CV"}`,
        `DEPARTAMENTOS DISPONIBLES: ${depts.rows.map((d: any) => d.nombre).join(", ")}`,
        "",
        "CV:",
        "---",
        (textoFinal?.slice(0, 6000) || "No proporcionado"),
        "---",
        "",
        "Responde ÚNICAMENTE con JSON válido sin backticks ni texto extra:",
        "{",
        '  "nombre": "primer nombre del candidato (OBLIGATORIO — si no está explícito, inferirlo del email o archivo)",',
        '  "apellido": "apellido del candidato o null si no se encuentra",',
        '  "correo": "email detectado en el CV o null",',
        '  "telefono": "teléfono detectado en el CV o null",',
        '  "cedula": "número de cédula detectado en el CV o null",',
        '  "score_ia": numero entero 0-100,',
        '  "palabras_clave_match": ["requisitos/habilidades que SÍ cumple el candidato"],',
        '  "palabras_clave_falta": ["requisitos/habilidades que le FALTAN al candidato"],',
        '  "resumen_ia": "2-3 oraciones del perfil y fit con el puesto",',
        '  "fortalezas_ia": ["fortaleza 1 (vincular con un requisito)", "fortaleza 2", "fortaleza 3"],',
        '  "debilidades_ia": ["requisito que no cumple 1", "requisito que no cumple 2"],',
        '  "recomendacion_ia": "ENTREVISTAR o REVISAR o DESCARTAR",',
        '  "alerta_otras_areas": true o false,',
        '  "areas_sugeridas": ["nombre departamento"] o []',
        "}",
    ].filter(s => s !== "").join("\n");

    const jsonText = await analyzeWithGroq(prompt);
    const analysis = JSON.parse(jsonText);

    // Ensure nombre is never null — fallback to filename or "Candidato sin nombre"
    if (!analysis.nombre) {
      analysis.nombre = nombre_archivo
        ? nombre_archivo.replace(/\.pdf$|\.docx?$|\.txt$/i, '').replace(/_/g, ' ')
        : 'Candidato sin nombre';
    }
    // Clean up nombre/apellido: if full name came in nombre field, split it
    if (analysis.nombre && !analysis.apellido) {
      const parts = String(analysis.nombre).trim().split(/\s+/);
      if (parts.length >= 2) {
        analysis.nombre = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
        analysis.apellido = parts.slice(Math.ceil(parts.length / 2)).join(' ');
      }
    }

    const r = await query(`
      INSERT INTO candidatos (id_vacante, nombre, apellido, correo, telefono, cedula,
        cv_texto, palabras_clave_match, palabras_clave_falta, score_ia,
        recomendacion_ia, resumen_ia, fortalezas_ia, debilidades_ia,
        alerta_otras_areas, areas_sugeridas, fuente, estado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'CV-IA','Recibido')
      RETURNING *`,
      [id_vacante, analysis.nombre, analysis.apellido || null, analysis.correo || null, analysis.telefono || null,
       analysis.cedula || null,
       textoFinal || cvTexto, analysis.palabras_clave_match, analysis.palabras_clave_falta,
       analysis.score_ia, analysis.recomendacion_ia, analysis.resumen_ia,
       analysis.fortalezas_ia, analysis.debilidades_ia,
       analysis.alerta_otras_areas || false, analysis.areas_sugeridas || []]);

    // Generate alert if suggested for another area
    if (analysis.alerta_otras_areas && analysis.areas_sugeridas?.length) {
      await query(`INSERT INTO alertas_generadas (tipo, titulo, descripcion, nivel)
        VALUES ('reclutamiento', $1, $2, 'info')`,
        [`Candidato con fit para otra área: ${analysis.nombre}`,
         `El candidato ${analysis.nombre} aplicó a ${v.titulo} pero la IA detecta fit para: ${analysis.areas_sugeridas.join(", ")}`]);
    }

    res.json(r.rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.put("/api/candidatos/:id/estado", async (req, res) => {
  try {
    const { estado, aprobado_por } = req.body;
    const r = await query(
      "UPDATE candidatos SET estado=$1 WHERE id=$2 RETURNING *",
      [estado, req.params.id]);
    const candidato = r.rows[0];

    // When Aprobado: create employee and optionally close vacancy
    if (estado === "Aprobado" && candidato) {
      // Get vacancy with cargo matching by title
      const vac = candidato.id_vacante
        ? await query(`SELECT v.*, d.nombre AS dept_nombre,
            (SELECT c.id FROM cargos c
             WHERE (LOWER(c.titulo) LIKE LOWER('%' || REGEXP_REPLACE(v.titulo,'\\s+','%','g') || '%')
               OR LOWER(v.titulo) LIKE LOWER('%' || REGEXP_REPLACE(c.titulo,'\\s+','%','g') || '%'))
             AND (c.id_departamento = v.id_departamento OR c.id_departamento IS NULL)
             ORDER BY c.id_departamento IS NULL LIMIT 1) AS cargo_id,
            (SELECT COUNT(*) FROM candidatos cc WHERE cc.id_vacante=v.id AND cc.estado='Aprobado') AS aprobados_actuales
            FROM vacantes v LEFT JOIN departamentos d ON d.id = v.id_departamento WHERE v.id=$1`,
            [candidato.id_vacante])
        : { rows: [] };
      const vacante = vac.rows[0];

      // Create employee if not exists
      const exists = candidato.cedula
        ? await query("SELECT id FROM empleados WHERE cedula=$1", [candidato.cedula])
        : { rows: [] };

      let empId: number | null = null;
      if (!exists.rows.length) {
        const count = await query("SELECT COUNT(*) FROM empleados");
        const code = "EMP-" + String(Number(count.rows[0].count) + 1).padStart(4, "0");
        const salario = vacante?.salario_ofrecido || 0;
        const inserted = await query(`
          INSERT INTO empleados (codigo_empleado, nombre, apellido, cedula,
            correo_corporativo, telefono, id_departamento, id_cargo,
            fecha_ingreso, tipo_contrato, jornada, salario_base, estado, modalidad)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,'Indefinido','Completa',$9,'Activo','Presencial')
          ON CONFLICT (cedula) DO NOTHING RETURNING id`,
          [code, candidato.nombre, candidato.apellido || "",
           candidato.cedula || code,
           candidato.correo || null, candidato.telefono || null,
           vacante?.id_departamento || null,
           vacante?.cargo_id || null, salario]);
        empId = inserted.rows[0]?.id || null;
      } else {
        empId = exists.rows[0].id;
        // Update cargo if empty
        if (vacante?.cargo_id) {
          await query("UPDATE empleados SET id_cargo=$1 WHERE id=$2 AND (id_cargo IS NULL OR id_cargo=0)",
            [vacante.cargo_id, empId]);
        }
      }

      // Check if vacancy is now full and close it
      if (vacante && vacante.cantidad) {
        const newCount = Number(vacante.aprobados_actuales) + 1; // +1 for current approval
        if (newCount >= Number(vacante.cantidad)) {
          await query("UPDATE vacantes SET estado='Cerrada' WHERE id=$1", [candidato.id_vacante]);
        }
      }
    }

    // When Descartado with score >= 60: keep in talent pool (don't delete cv_texto)
    // When Descartado with score < 60: remove cv_texto to save space
    if (estado === "Descartado" && candidato) {
      if ((candidato.score_ia || 0) < 60) {
        await query("UPDATE candidatos SET cv_texto=NULL WHERE id=$1", [req.params.id]);
      }
      // Score >= 60 keeps full record for future matches (talent pool)
    }

    res.json(candidato);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── Talent pool: candidates with score >= 60 available for other vacancies ──
app.get("/api/candidatos/pool", async (req, res) => {
  try {
    const { id_vacante } = req.query;
    // Get keywords of target vacancy
    let vacKeywords: string[] = [];
    if (id_vacante) {
      const vac = await query("SELECT palabras_clave FROM vacantes WHERE id=$1", [id_vacante]);
      vacKeywords = vac.rows[0]?.palabras_clave || [];
    }

    const r = await query(`
      SELECT c.*,
        v.titulo AS vacante_titulo,
        COALESCE(array_length(
          ARRAY(SELECT unnest(c.palabras_clave_match::text[])
                INTERSECT
                SELECT unnest($1::text[])), 1), 0) AS keywords_match_count
      FROM candidatos c
      LEFT JOIN vacantes v ON v.id = c.id_vacante
      WHERE c.score_ia >= 60
        AND c.estado = 'Descartado'
        AND ($2::int IS NULL OR c.id_vacante != $2)
      ORDER BY keywords_match_count DESC, c.score_ia DESC
      LIMIT 20`,
      [vacKeywords, id_vacante || null]);

    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// SALIDAS
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/salidas", async (req, res) => {
  try {
    const r = await query(`
      SELECT se.id, se.id_empleado, se.tipo, se.fecha_efectiva::DATE::TEXT AS fecha_efectiva,
             se.motivo, se.cumple_preaviso, se.dias_preaviso,
             se.activos_devueltos, se.activos_firmado, se.accesos_cerrados,
             se.fecha_cierre_accesos::DATE::TEXT AS fecha_cierre_accesos,
             se.creado_en,
             e.nombre || ' ' || e.apellido AS empleado_nombre,
             d.nombre AS departamento
      FROM salidas_empleados se
      JOIN empleados e ON e.id = se.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      ORDER BY se.fecha_efectiva DESC`);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/salidas", async (req, res) => {
  try {
    const b = req.body;
    const r = await query(`
      INSERT INTO salidas_empleados (id_empleado,tipo,fecha_efectiva,motivo,
        cumple_preaviso,dias_preaviso,activos_devueltos,activos_firmado,
        accesos_cerrados,fecha_cierre_accesos,procesado_por)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [b.id_empleado, b.tipo, b.fecha_efectiva, b.motivo, b.cumple_preaviso,
       b.dias_preaviso || 0, JSON.stringify(b.activos_devueltos || {}),
       b.activos_firmado || false, b.accesos_cerrados || false,
       b.accesos_cerrados ? b.fecha_efectiva : null, b.procesado_por]);
    // Mark employee as inactive
    await query("UPDATE empleados SET estado='Inactivo', fecha_salida=$1 WHERE id=$2",
      [b.fecha_efectiva, b.id_empleado]);
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// ALERTAS
// ════════════════════════════════════════════════════════════════════════════
app.get("/api/alertas", async (req, res) => {
  try {
    const { estado, tipo, nivel } = req.query;
    let where = ["1=1"];
    const params: any[] = [];
    if (estado) { params.push(estado); where.push(`ag.estado = $${params.length}`); }
    if (tipo) { params.push(tipo); where.push(`ag.tipo = $${params.length}`); }
    if (nivel) { params.push(nivel); where.push(`ag.nivel = $${params.length}`); }
    const r = await query(`
      SELECT ag.*, e.nombre || ' ' || e.apellido AS empleado_nombre,
             d.nombre AS departamento_nombre
      FROM alertas_generadas ag
      LEFT JOIN empleados e ON e.id = ag.id_empleado
      LEFT JOIN departamentos d ON d.id = ag.id_departamento
      WHERE ${where.join(" AND ")}
      ORDER BY ag.nivel DESC, ag.fecha_generada DESC
      LIMIT 100`, params);
    res.json(r.rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/alertas/generar", async (_req, res) => {
  try {
    await query("SELECT generar_alertas_automaticas()");
    res.json({ ok: true, mensaje: "Alertas generadas correctamente" });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/alertas/:id/estado", async (req, res) => {
  try {
    await query("UPDATE alertas_generadas SET estado=$1, visto_en=NOW() WHERE id=$2",
      [req.body.estado, req.params.id]);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// REPORTES — 5 DASHBOARDS
// ════════════════════════════════════════════════════════════════════════════

// R1: Asistencia día anterior
app.get("/api/reportes/asistencia-dia-anterior", async (req, res) => {
  try {
    const { dept, fecha } = req.query;

    // Find target date: use provided fecha, or last date with records
    let targetDate: string;
    if (fecha) {
      targetDate = String(fecha);
    } else {
      const lastDate = await query(`SELECT MAX(fecha)::TEXT AS ultima FROM registros_asistencia`);
      targetDate = lastDate.rows[0]?.ultima || new Date(Date.now() - 86400000).toISOString().slice(0,10);
    }

    const params: any[] = [targetDate];
    let deptClause = "";
    if (dept) { params.push(dept); deptClause = `AND e.id_departamento = $${params.length}`; }

    const r = await query(`
      SELECT ra.fecha::DATE::TEXT AS fecha, ra.estado,
             ra.hora_entrada::TEXT AS hora_entrada,
             ra.hora_salida::TEXT AS hora_salida,
             ra.minutos_tardanza, ra.justificado,
             e.id AS id_empleado,
             e.nombre || ' ' || e.apellido AS empleado,
             e.codigo_empleado, d.nombre AS departamento, c.titulo AS cargo
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      WHERE ra.fecha = $1 ${deptClause}
      ORDER BY d.nombre, e.apellido`, params);

    const sp: any[] = [targetDate];
    let sc = "";
    if (dept) { sp.push(dept); sc = `AND e.id_departamento = $${sp.length}`; }
    const summary = await query(`
      SELECT COUNT(*) AS total,
        COUNT(*) FILTER(WHERE ra.estado='Presente')   AS presentes,
        COUNT(*) FILTER(WHERE ra.estado='Tardanza')   AS tardanzas,
        COUNT(*) FILTER(WHERE ra.estado='Ausente')    AS ausentes,
        COUNT(*) FILTER(WHERE ra.estado='Vacaciones') AS vacaciones,
        ROUND(AVG(ra.minutos_tardanza) FILTER(WHERE ra.estado='Tardanza'),1) AS promedio_tardanza
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      WHERE ra.fecha = $1 ${sc}`, sp);

    res.json({ registros: r.rows, resumen: summary.rows[0], fecha_consultada: targetDate });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// R2: % asistencia, tardanzas e inasistencias último mes
app.get("/api/reportes/asistencia-mensual", async (req, res) => {
  try {
    const { dept } = req.query;
    const deptFilter = dept ? `AND e.id_departamento = ${dept}` : "";
    const por_empleado = await query(`
      SELECT e.id AS id_empleado, e.codigo_empleado, e.nombre || ' ' || e.apellido AS empleado,
             d.nombre AS departamento,
             COUNT(*) AS dias_laborables,
             COUNT(*) FILTER(WHERE ra.estado='Presente') AS presentes,
             COUNT(*) FILTER(WHERE ra.estado='Tardanza') AS tardanzas,
             COUNT(*) FILTER(WHERE ra.estado='Ausente' AND justificado=FALSE) AS ausencias_injust,
             COUNT(*) FILTER(WHERE ra.estado='Ausente' AND justificado=TRUE)  AS ausencias_just,
             ROUND(COUNT(*) FILTER(WHERE ra.estado IN ('Presente','Tardanza'))::numeric/NULLIF(COUNT(*),0)*100,1) AS pct_asistencia
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      WHERE ra.fecha >= DATE_TRUNC('month', CURRENT_DATE) ${deptFilter}
      GROUP BY e.id, e.codigo_empleado, e.nombre, e.apellido, d.nombre
      ORDER BY pct_asistencia ASC`);
    const por_dia = await query(`
      SELECT ra.fecha::DATE::TEXT AS fecha,
             COUNT(*) AS total,
             ROUND(COUNT(*) FILTER(WHERE ra.estado IN ('Presente','Tardanza'))::numeric/NULLIF(COUNT(*),0)*100,1) AS pct
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      WHERE ra.fecha >= DATE_TRUNC('month', CURRENT_DATE) ${deptFilter}
      GROUP BY ra.fecha ORDER BY ra.fecha`);
    res.json({ por_empleado: por_empleado.rows, por_dia: por_dia.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// R3: Capacitaciones y evaluaciones
app.get("/api/reportes/capacitaciones", async (req, res) => {
  try {
    const { dept } = req.query;
    const deptFilter = dept ? `AND (c.id_departamento = ${dept} OR c.id_departamento IS NULL)` : "";
    const caps = await query(`
      SELECT c.titulo, c.tipo, c.estado, c.duracion_horas,
             d.nombre AS departamento,
             COUNT(pc.id) AS inscritos,
             COUNT(*) FILTER(WHERE pc.estado='Completado') AS completados,
             COUNT(*) FILTER(WHERE pc.aprobado=TRUE) AS aprobados,
             ROUND(AVG(pc.nota_evaluacion),1) AS nota_promedio,
             ROUND(COUNT(*) FILTER(WHERE pc.aprobado=TRUE)::numeric/NULLIF(COUNT(*),0)*100,1) AS pct_aprobacion
      FROM capacitaciones c
      LEFT JOIN departamentos d ON d.id = c.id_departamento
      LEFT JOIN participantes_capacitacion pc ON pc.id_capacitacion = c.id
      WHERE 1=1 ${deptFilter}
      GROUP BY c.id, c.titulo, c.tipo, c.estado, c.duracion_horas, d.nombre
      ORDER BY c.fecha_inicio DESC NULLS LAST`);
    res.json({ capacitaciones: caps.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// R4: Métricas de personal
app.get("/api/reportes/metricas-personal", async (req, res) => {
  try {
    const { dept } = req.query;
    const deptFilter = dept ? `AND e.id_departamento = ${Number(dept)}` : "";

    // Empleados con métricas individuales
    const r = await query(`
      SELECT e.id AS id_empleado, e.codigo_empleado,
             e.nombre || ' ' || e.apellido AS empleado,
             d.nombre AS departamento, c.titulo AS cargo,
             ROUND(AVG(ev.promedio), 2)                AS promedio_evaluacion,
             ROUND(AVG(ev.promedio) * 20, 1)           AS puntaje_100,
             SUM(ev.proyectos_asignados)               AS proyectos_asignados,
             SUM(ev.proyectos_entregados)              AS proyectos_entregados,
             ROUND(SUM(ev.proyectos_entregados)::numeric /
               NULLIF(SUM(ev.proyectos_asignados),0)*100, 1) AS pct_entrega,
             COUNT(ra_tard.id)  AS tardanzas_mes,
             COUNT(ra_aus.id)   AS ausencias_mes
      FROM empleados e
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      LEFT JOIN evaluaciones_desempeno ev ON ev.id_empleado = e.id
      LEFT JOIN registros_asistencia ra_tard ON ra_tard.id_empleado = e.id
          AND ra_tard.fecha >= DATE_TRUNC('month', CURRENT_DATE)
          AND ra_tard.estado = 'Tardanza'
      LEFT JOIN registros_asistencia ra_aus ON ra_aus.id_empleado = e.id
          AND ra_aus.fecha >= DATE_TRUNC('month', CURRENT_DATE)
          AND ra_aus.estado = 'Ausente'
      WHERE e.estado = 'Activo' ${deptFilter}
      GROUP BY e.id, e.codigo_empleado, e.nombre, e.apellido, d.nombre, c.titulo
      ORDER BY promedio_evaluacion DESC NULLS LAST`);

    // Resumen por departamento
    const porDept = await query(`
      SELECT
        d.nombre AS departamento,
        COUNT(DISTINCT e.id) AS total_empleados,
        ROUND(AVG(ev.promedio), 2)       AS promedio_evaluacion,
        ROUND(AVG(ev.promedio) * 20, 1)  AS puntaje_100,
        COUNT(DISTINCT e.id) FILTER(WHERE ev.promedio >= 4.0) AS excelente,
        COUNT(DISTINCT e.id) FILTER(WHERE ev.promedio >= 3.0 AND ev.promedio < 4.0) AS bueno,
        COUNT(DISTINCT e.id) FILTER(WHERE ev.promedio >= 2.0 AND ev.promedio < 3.0) AS regular,
        COUNT(DISTINCT e.id) FILTER(WHERE ev.promedio < 2.0)  AS bajo,
        COUNT(DISTINCT e.id) FILTER(WHERE ev.promedio IS NULL) AS sin_evaluacion
      FROM empleados e
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN evaluaciones_desempeno ev ON ev.id_empleado = e.id
      WHERE e.estado = 'Activo' ${deptFilter}
      GROUP BY d.nombre
      ORDER BY promedio_evaluacion DESC NULLS LAST`);

    res.json({ empleados: r.rows, por_departamento: porDept.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// R5: Análisis entradas y salidas
app.get("/api/reportes/rotacion", async (req, res) => {
  try {
    const { dept } = req.query;
    const deptParam = dept ? [dept] : [];
    const deptFilter = dept ? "AND e.id_departamento = $1" : "";

    // Monthly ingress — from fecha_ingreso
    const mensual = await query(
      dept
        ? `SELECT to_char(DATE_TRUNC('month', fecha_ingreso), 'YYYY-MM') AS mes,
                 'Ingreso' AS tipo, COUNT(*) AS cantidad
           FROM empleados e WHERE e.id_departamento=$1
           GROUP BY 1
           UNION ALL
           SELECT to_char(DATE_TRUNC('month', se.fecha_efectiva), 'YYYY-MM'), 'Salida', COUNT(*)
           FROM salidas_empleados se
           JOIN empleados e ON e.id = se.id_empleado
           WHERE e.id_departamento=$1 GROUP BY 1
           ORDER BY 1 DESC LIMIT 24`
        : `SELECT to_char(DATE_TRUNC('month', fecha_ingreso), 'YYYY-MM') AS mes,
                 'Ingreso' AS tipo, COUNT(*) AS cantidad
           FROM empleados e GROUP BY 1
           UNION ALL
           SELECT to_char(DATE_TRUNC('month', se.fecha_efectiva), 'YYYY-MM'), 'Salida', COUNT(*)
           FROM salidas_empleados se
           JOIN empleados e ON e.id = se.id_empleado GROUP BY 1
           ORDER BY 1 DESC LIMIT 24`,
      deptParam);

    const motivos = await query(`
      SELECT se.tipo, COUNT(*) AS cantidad
      FROM salidas_empleados se
      JOIN empleados e ON e.id = se.id_empleado
      WHERE 1=1 ${deptFilter}
      GROUP BY se.tipo`, deptParam);

    const por_dept = await query(`
      SELECT d.nombre AS departamento,
             COUNT(DISTINCT e2.id) FILTER(WHERE e2.fecha_ingreso >= CURRENT_DATE - INTERVAL '6 months') AS ingresos_6m,
             COUNT(DISTINCT se.id) FILTER(WHERE se.fecha_efectiva::DATE >= CURRENT_DATE - INTERVAL '6 months') AS salidas_6m
      FROM departamentos d
      LEFT JOIN empleados e2 ON e2.id_departamento = d.id
      LEFT JOIN salidas_empleados se ON se.id_empleado = e2.id
      GROUP BY d.nombre
      ORDER BY ingresos_6m DESC`, []);

    // Last 12 months summary for the chart — pivot ingresos/salidas per month
    const meses = new Set(mensual.rows.map((r: any) => r.mes));
    const chart: any[] = [];
    for (const mes of Array.from(meses).sort().slice(-12)) {
      const ing = mensual.rows.find((r: any) => r.mes === mes && r.tipo === 'Ingreso');
      const sal = mensual.rows.find((r: any) => r.mes === mes && r.tipo === 'Salida');
      chart.push({ mes, ingresos: Number(ing?.cantidad || 0), salidas: Number(sal?.cantidad || 0) });
    }

    res.json({ mensual: mensual.rows, chart, motivos: motivos.rows, por_departamento: por_dept.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// R6: Reporte de vacaciones
app.get("/api/reportes/vacaciones", async (req, res) => {
  try {
    const { dept } = req.query;
    const deptFilter = dept ? `AND e.id_departamento = ${Number(dept)}` : "";

    // 1. Saldos por empleado (todos)
    const saldos = await query(`
      SELECT
        e.id AS id_empleado,
        e.nombre || ' ' || e.apellido AS empleado,
        d.nombre AS departamento,
        c.titulo AS cargo,
        e.fecha_ingreso::DATE::TEXT AS fecha_ingreso,
        EXTRACT(YEAR FROM AGE(CURRENT_DATE, e.fecha_ingreso))::INT AS anios_servicio,
        e.salario_base,
        COALESCE(sv.dias_acumulados, 0) AS dias_acumulados,
        COALESCE(sv.dias_tomados, 0)    AS dias_tomados,
        COALESCE(sv.dias_acumulados - sv.dias_tomados, 0) AS dias_pendientes,
        ROUND(e.salario_base / 30.0 * COALESCE(sv.dias_acumulados - sv.dias_tomados, 0), 2) AS costo_pendiente
      FROM empleados e
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      LEFT JOIN cargos c ON c.id = e.id_cargo
      LEFT JOIN saldos_vacaciones sv ON sv.id_empleado = e.id
      WHERE e.estado = 'Activo' ${deptFilter}
      ORDER BY (sv.dias_acumulados - sv.dias_tomados) DESC NULLS LAST`);

    // 2. Vacaciones tomadas en el año actual
    const tomadas = await query(`
      SELECT
        e.id AS id_empleado,
        e.nombre || ' ' || e.apellido AS empleado,
        d.nombre AS departamento,
        sp.tipo,
        sp.fecha_inicio::TEXT AS fecha_inicio,
        sp.fecha_fin::TEXT    AS fecha_fin,
        sp.dias_solicitados,
        sp.estado,
        sp.motivo
      FROM solicitudes_permiso sp
      JOIN empleados e ON e.id = sp.id_empleado
      LEFT JOIN departamentos d ON d.id = e.id_departamento
      WHERE sp.tipo = 'Vacaciones'
        AND EXTRACT(YEAR FROM sp.fecha_inicio::DATE) = EXTRACT(YEAR FROM CURRENT_DATE)
        AND sp.estado = 'Aprobado'
        ${deptFilter}
      ORDER BY sp.fecha_inicio DESC`);

    // 3. Alert: empleados con más de 15 días pendientes
    const alerta15 = saldos.rows.filter((r: any) => Number(r.dias_pendientes) > 15);

    // 4. Summary stats
    const totalPendientes = saldos.rows.reduce((s: number, r: any) => s + Number(r.dias_pendientes), 0);
    const totalCosto      = saldos.rows.reduce((s: number, r: any) => s + Number(r.costo_pendiente || 0), 0);
    const diasTomadosAnio = tomadas.rows.reduce((s: number, r: any) => s + Number(r.dias_solicitados || 0), 0);

    res.json({
      saldos: saldos.rows,
      tomadas: tomadas.rows,
      alerta15,
      resumen: {
        totalEmpleados: saldos.rows.length,
        totalPendientes: Math.round(totalPendientes),
        totalCosto: totalCosto.toFixed(2),
        diasTomadosAnio,
        empleadosAlerta: alerta15.length,
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// R7: Reporte de estados de asistencia (conteos por estado)
app.get("/api/reportes/estados-asistencia", async (req, res) => {
  try {
    const { dept, fecha } = req.query;
    const deptFilter = dept ? `AND e.id_departamento = ${Number(dept)}` : "";

    // Target date
    const lastDate = await query(`SELECT MAX(fecha)::DATE::TEXT AS ultima FROM registros_asistencia`);
    const targetDate = fecha ? String(fecha) : (lastDate.rows[0]?.ultima || new Date().toISOString().slice(0,10));

    // Conteo por estado en el día
    const porEstado = await query(`
      SELECT
        ra.estado,
        COUNT(*) AS cantidad,
        ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS porcentaje
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      WHERE ra.fecha = $1 ${deptFilter}
      GROUP BY ra.estado
      ORDER BY cantidad DESC`, [targetDate]);

    // Conteo de empleados activos sin registro hoy (no marcaron)
    const sinRegistro = await query(`
      SELECT COUNT(*) AS cantidad
      FROM empleados e
      WHERE e.estado = 'Activo'
        ${deptFilter}
        AND NOT EXISTS (
          SELECT 1 FROM registros_asistencia ra
          WHERE ra.id_empleado = e.id AND ra.fecha = $1
        )`, [targetDate]);

    // Tendencia últimos 30 días
    const tendencia = await query(`
      SELECT
        ra.fecha::DATE::TEXT AS fecha,
        COUNT(*) FILTER(WHERE ra.estado='Presente')   AS presentes,
        COUNT(*) FILTER(WHERE ra.estado='Tardanza')   AS tardanzas,
        COUNT(*) FILTER(WHERE ra.estado='Ausente')    AS ausentes,
        COUNT(*) FILTER(WHERE ra.estado='Vacaciones') AS vacaciones,
        ROUND(COUNT(*) FILTER(WHERE ra.estado='Presente') * 100.0 / NULLIF(COUNT(*),0), 1) AS pct_asistencia
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      WHERE ra.fecha >= $1::DATE - INTERVAL '30 days'
        AND ra.fecha <= $1::DATE
        ${deptFilter}
      GROUP BY ra.fecha
      ORDER BY ra.fecha ASC`, [targetDate]);

    // Por departamento en el día
    const porDepartamento = await query(`
      SELECT
        d.nombre AS departamento,
        COUNT(*) AS total,
        COUNT(*) FILTER(WHERE ra.estado='Presente')   AS presentes,
        COUNT(*) FILTER(WHERE ra.estado='Tardanza')   AS tardanzas,
        COUNT(*) FILTER(WHERE ra.estado='Ausente')    AS ausentes,
        COUNT(*) FILTER(WHERE ra.estado='Vacaciones') AS vacaciones,
        ROUND(COUNT(*) FILTER(WHERE ra.estado='Presente') * 100.0 / NULLIF(COUNT(*),0),1) AS pct_asistencia
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      JOIN departamentos d ON d.id = e.id_departamento
      WHERE ra.fecha = $1 ${deptFilter}
      GROUP BY d.nombre
      ORDER BY pct_asistencia ASC`, [targetDate]);

    // Empleados con más tardanzas en el mes actual
    const topTardanzas = await query(`
      SELECT
        e.nombre || ' ' || e.apellido AS empleado,
        d.nombre AS departamento,
        COUNT(*) AS tardanzas_mes,
        ROUND(AVG(ra.minutos_tardanza),0) AS promedio_min
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      JOIN departamentos d ON d.id = e.id_departamento
      WHERE ra.estado = 'Tardanza'
        AND ra.fecha >= DATE_TRUNC('month', CURRENT_DATE)
        ${deptFilter}
      GROUP BY e.id, e.nombre, e.apellido, d.nombre
      ORDER BY tardanzas_mes DESC
      LIMIT 10`, []);

    // Empleados con más ausencias en el mes actual
    const topAusencias = await query(`
      SELECT
        e.nombre || ' ' || e.apellido AS empleado,
        d.nombre AS departamento,
        COUNT(*) AS ausencias_mes,
        COUNT(*) FILTER(WHERE NOT ra.justificado) AS injustificadas
      FROM registros_asistencia ra
      JOIN empleados e ON e.id = ra.id_empleado
      JOIN departamentos d ON d.id = e.id_departamento
      WHERE ra.estado = 'Ausente'
        AND ra.fecha >= DATE_TRUNC('month', CURRENT_DATE)
        ${deptFilter}
      GROUP BY e.id, e.nombre, e.apellido, d.nombre
      ORDER BY ausencias_mes DESC
      LIMIT 10`, []);

    res.json({
      fecha_consultada: targetDate,
      por_estado: porEstado.rows,
      sin_registro: Number(sinRegistro.rows[0]?.cantidad || 0),
      tendencia: tendencia.rows,
      por_departamento: porDepartamento.rows,
      top_tardanzas: topTardanzas.rows,
      top_ausencias: topAusencias.rows,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});


// Resumen general para todos los reportes
app.get("/api/reportes/resumen-general", async (req, res) => {
  try {
    const dept = req.query.dept ? Number(req.query.dept) : null;

    // Run each query separately with parameterized dept filter
    const emps = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER(WHERE estado='Activo')::int AS activos,
        COUNT(*) FILTER(WHERE estado='Vacaciones')::int AS en_vacaciones,
        COUNT(*) FILTER(WHERE estado='Inactivo')::int AS inactivos
       FROM empleados
       WHERE ($1::int IS NULL OR id_departamento=$1)`,
      [dept]);

    // Last day with records
    const lastDay = await query(`SELECT MAX(fecha)::date::text AS ultima FROM registros_asistencia`);
    const ultimaFecha = lastDay.rows[0]?.ultima;

    const asist = await query(
      `SELECT
        COUNT(*) FILTER(WHERE ra.estado='Presente')::int AS presentes,
        COUNT(*) FILTER(WHERE ra.estado='Tardanza')::int AS tardanzas,
        COUNT(*) FILTER(WHERE ra.estado='Ausente')::int AS ausentes,
        COALESCE(ROUND(AVG(ra.minutos_tardanza) FILTER(WHERE ra.estado='Tardanza'),1),0) AS prom_tardanza,
        COALESCE(ROUND(COUNT(*) FILTER(WHERE ra.estado='Presente')::numeric / NULLIF(COUNT(*),0)*100,1),0) AS pct_asistencia
       FROM registros_asistencia ra
       JOIN empleados e ON e.id=ra.id_empleado
       WHERE ra.fecha=$1 AND ($2::int IS NULL OR e.id_departamento=$2)`,
      [ultimaFecha, dept]);

    const tard = await query(
      `SELECT
        COUNT(*) FILTER(WHERE ra.estado='Tardanza')::int AS tardanzas_mes,
        COUNT(*) FILTER(WHERE ra.estado='Ausente')::int AS ausencias_mes
       FROM registros_asistencia ra
       JOIN empleados e ON e.id=ra.id_empleado
       WHERE ra.fecha >= DATE_TRUNC('month', CURRENT_DATE)
         AND ($1::int IS NULL OR e.id_departamento=$1)`,
      [dept]);

    const caps = await query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER(WHERE estado='Completada')::int AS completadas,
        COUNT(*) FILTER(WHERE estado='En curso')::int AS en_curso,
        COUNT(*) FILTER(WHERE estado='Programada')::int AS programadas
       FROM capacitaciones`);

    const vacs = await query(
      `SELECT
        COUNT(*) FILTER(WHERE (sv.dias_acumulados - sv.dias_tomados) > 15)::int AS criticas,
        COALESCE(ROUND(AVG(sv.dias_acumulados - sv.dias_tomados),1), 0) AS promedio_pendientes,
        COALESCE(ROUND(SUM(e.salario_base / 30.0 * (sv.dias_acumulados - sv.dias_tomados)),2), 0) AS costo_pasivo
       FROM saldos_vacaciones sv
       JOIN empleados e ON e.id=sv.id_empleado
       WHERE ($1::int IS NULL OR e.id_departamento=$1)`,
      [dept]);

    const evals = await query(
      `SELECT COALESCE(ROUND(AVG(
        (ev.puntaje_liderazgo+ev.puntaje_trabajo_equipo+ev.puntaje_comunicacion+
         ev.puntaje_iniciativa+ev.puntaje_tecnico+ev.puntaje_cumplimiento)/6.0
       ),2), 0) AS promedio_global
       FROM evaluaciones_desempeno ev
       JOIN empleados e ON e.id=ev.id_empleado
       WHERE ($1::int IS NULL OR e.id_departamento=$1)`,
      [dept]);

    res.json({
      empleados: emps.rows[0],
      asistencia_hoy: { ...asist.rows[0], fecha: ultimaFecha },
      mes_actual: tard.rows[0],
      capacitaciones: caps.rows[0],
      vacaciones: vacs.rows[0],
      evaluaciones: evals.rows[0],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats dashboard
app.get("/api/stats", async (_req, res) => {
  try {
    const emps  = await query(`SELECT
      COUNT(*) FILTER(WHERE estado='Activo')::int       AS activos,
      COUNT(*) FILTER(WHERE estado='Vacaciones')::int   AS en_vacaciones,
      COUNT(*) FILTER(WHERE estado='Inactivo')::int     AS inactivos,
      COUNT(*) FILTER(WHERE estado IN ('Activo','Vacaciones'))::int AS total_activos
      FROM empleados`);
    const vacan = await query("SELECT COUNT(*) FROM vacantes WHERE estado='Abierta'");
    const caps  = await query("SELECT COUNT(*) FROM capacitaciones");
    const alertas = await query("SELECT COUNT(*) FROM alertas_generadas WHERE estado='Nueva'");
    const e = emps.rows[0];
    res.json({
      totalEmpleados:            e.total_activos,   // Activo + Vacaciones (personal vigente)
      empleadosActivos:          e.activos,
      empleadosVacaciones:       e.en_vacaciones,
      empleadosInactivos:        e.inactivos,
      vacantesAbiertas:          Number(vacan.rows[0].count),
      capacitacionesCompletadas: Number(caps.rows[0].count),
      alertasNuevas:             Number(alertas.rows[0].count),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ════════════════════════════════════════════════════════════════════════════
// VITE / STATIC
// ════════════════════════════════════════════════════════════════════════════
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`TelcoPanamá RRHH → puerto ${PORT}`));
}

startServer();
