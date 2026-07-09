# TelcoPanamá RRHH — Sistema de Gestión de Recursos Humanos

Empresa: TelcoPanamá S.A. | ~300 empleados | Sector: Telecomunicaciones

## Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Recharts
- **Backend**: Express + Node.js + TypeScript
- **Base de datos**: PostgreSQL 15+
- **IA**: Groq API (Llama 3.3 70B) — gratuita en console.groq.com

---

## Setup rápido

### 1. Requisitos
- Node.js 18+
- PostgreSQL 15+ corriendo localmente o en Railway/Supabase
- Cuenta Groq gratuita en [console.groq.com](https://console.groq.com)

### 2. Variables de entorno
Crear `.env` en la raíz:
```env
DATABASE_URL=postgresql://usuario:password@localhost:5432/telcopanama_rrhh
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama-3.3-70b-versatile
NODE_ENV=development
```

### 3. Crear base de datos
```bash
# Crear la DB
createdb telcopanama_rrhh

# Aplicar schema
psql telcopanama_rrhh -f sql/schema.sql

# Insertar 300 empleados de prueba
psql telcopanama_rrhh -f sql/seed_empleados.sql
```

### 4. Instalar dependencias y correr
```bash
npm install
npm run dev
```
La app corre en http://localhost:3000

---

## Módulos del sistema

| Módulo | Descripción |
|---|---|
| **Dashboard** | KPIs en tiempo real + alertas activas |
| **Organigrama** | Árbol jerárquico visual de la empresa |
| **Reclutamiento IA** | Vacantes + análisis de CVs con Groq |
| **Personal** | 300 empleados + inducción + historial |
| **Control Diario** | Asistencia filtrable por depto. + historial semanal |
| **Vacaciones** | Solicitudes + aprobaciones + saldos |
| **Capacitaciones** | Gestión completa + participantes + evaluaciones |
| **Evaluaciones** | Desempeño semestral + plan de mejora |
| **Salidas** | Proceso de baja completo en 3 pasos |
| **Reportes** | 5 dashboards con filtros + data detallada |
| **Alertas** | Thresholds automáticos para RRHH |

## Reportes disponibles
1. **Asistencia día anterior** — por empleado y departamento
2. **% Asistencia mensual** — tardanzas, inasistencias, tendencia
3. **Capacitaciones** — % realización, notas, aprobación
4. **Métricas de personal** — rendimiento, proyectos, puntualidad
5. **Rotación** — entradas/salidas mensuales, motivos, por depto.

## Thresholds de alerta configurados
| Tipo | Umbral | Nivel |
|---|---|---|
| Ausentismo | >3 ausencias injustificadas/mes | warning/critical |
| Tardanzas | >5 tardanzas/mes | warning |
| Bajo rendimiento | Promedio evaluación <2.5/5 | warning |
| Proyectos no entregados | <70% entrega | warning |
| Vacaciones acumuladas | >20 días pendientes | info |
| Capacitación incompleta | <100% obligatorias | warning |
| Inducción pendiente | Sin completar | info |
| Rotación alta | >2 salidas/trimestre por depto. | critical |

## Deploy en Railway
1. Crear proyecto en [railway.app](https://railway.app)
2. Agregar servicio PostgreSQL
3. Conectar repositorio GitHub
4. Agregar variables de entorno: `DATABASE_URL`, `GROQ_API_KEY`
5. Correr las migraciones: `npm run db:setup`
