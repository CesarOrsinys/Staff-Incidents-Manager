# Staff Incidents Manager (SIM) 📋⚡

> **Digitalización y Gestión Ágil de Partes de Horas e Incidencias de Personal**  
> *Desarrollado bajo Arquitectura Hexagonal (Ports & Adapters), Repository Pattern e Internacionalización Estricta (i18n).*

---

## 🎯 1. Resumen Ejecutivo & Objetivos
**Staff Incidents Manager** digitaliza y moderniza el parte físico tradicional de "Horas e Incidencias". Permite a los equipos de gerencia y administración realizar un volcado masivo ultrarrápido desde papel, controlar asistencias, ausencias, vacaciones y sustituciones por trabajador, generando informes mensuales consolidados y exportables en **Excel (.xlsx)** y **PDF**.

---

## 🏛️ 2. Arquitectura de Software (Hexagonal & Repository Pattern)

El proyecto sigue una estricta separación de capas desacopladas mediante Inyección de Dependencias:

```
Staff-Incidents-Manager/
├── api/                           # Vercel Serverless Function entry point (/api/*)
│   └── index.ts
├── mock_data/                     # Mock Data JSON (Persistencia Fase 1)
│   ├── users.json                 # Gerencia y credenciales
│   ├── work_centers.json          # Centros de trabajo (ej. Edificio Juez Borrull)
│   ├── workers.json               # Personal y contratos
│   └── incidents.json             # Histórico de partes
├── server/                        # Backend Node.js / Express
│   ├── middleware/                # Autenticación JWT y RBAC de Gerencia
│   ├── routes/                    # Endpoints REST (auth, centers, workers, incidents, reports)
│   ├── app.ts                     # Configuración de Express
│   └── index.ts                   # Entrypoint local
├── src/
│   ├── core/
│   │   ├── domain/
│   │   │   ├── entities/          # WorkCenter, Worker, Incident, ManagerUser
│   │   │   ├── enums/             # IncidentType, ContractStatus
│   │   │   └── schemas/           # Validación estricta Zod (IncidentSchema)
│   │   ├── ports/                 # Interfaces (IWorkCenterRepository, IIncidentRepository, etc.)
│   │   └── usecases/              # RegisterIncident, GetMonthlyReport, ExportReport, Authenticate
│   ├── adapters/
│   │   └── infrastructure/
│   │       ├── repositories/      # JsonWorkCenterRepo, JsonWorkerRepo, JsonIncidentRepo, SupabaseIncidentRepo
│   │       ├── services/          # ExportService (XLSX & jsPDF)
│   │       └── di/                # RepositoryContainer (Dependency Injection)
│   ├── ui/
│   │   ├── components/            # IncidentFormComponent, MonthlyReportComponent, MasterDataComponent, AuthComponent
│   │   ├── i18n/                  # LanguageManager (100% paridad de claves: es, ca, en, fr, de)
│   │   ├── services/              # ToastService, LoaderService
│   │   └── state/                 # AppState
│   └── main.ts                    # Bootstrap UI
├── tests/
│   └── unit/                      # Suite de pruebas unitarias (Node Test Runner)
├── index.html                     # Frontend SPA Ultra-rápido y Responsivo
├── vercel.json                    # Despliegue en 1-click a Vercel
├── tsconfig.json
└── vite.config.ts
```

---

## ⚡ 3. Características Clave

### ⌨️ Formulario Optimizado para Teclado (Volcado Masivo)
- **Atajo `Enter ↵` instantáneo:** Permite guardar el registro y saltar automáticamente al siguiente trabajador sin perder el contexto de centro ni periodo mensual.
- **Autocompletado predictivo:** Datalist interactivo para seleccionar trabajadores con pocas teclas.
- **Campos condicionales dinámicos:**
  - Si el tipo es **Sustitución** (`SUBSTITUTION`), despliega automáticamente:
    - Selector de a quién cubre (`substitutedWorkerId`).
    - Horario (`startTime` y `endTime`) con cálculo de horas en vivo.
  - Si el tipo es **Horas Extra** (`OVERTIME`), despliega horario de inicio y fin.
  - Si es **Vacaciones**, **Asuntos Propios**, **Baja** o **Fin de Contrato**, oculta los campos horarios de forma limpia.
  - Selector dinámico de **día suelto** o **rango de fechas**.

### 📊 Módulo de Reportes & Exportación
- **Consolidación por trabajador:** Agrupa las incidencias del mes en una sola fila por trabajador, calculando totales de horas extra, horas de sustitución y días de ausencia.
- **Filtros en tiempo real:** Por centro de trabajo, mes, año, tipo de incidencia o búsqueda textual.
- **Exportación 1-click:**
  - **Excel (.xlsx):** Libro estructurado con hoja de resumen y hoja de detalle individual.
  - **PDF:** Documento formateado listo para imprimir o enviar a dirección.

### 🌐 Internacionalización Estricta (Zero Hardcoded Strings)
- Soporte para **5 idiomas**: Español (es), Valenciano/Catalán (ca), Inglés (en), Francés (fr) y Alemán (de).
- 100% de cobertura y paridad de claves verificada en pruebas automatizadas.

### 🔐 Seguridad & RBAC
- Acceso exclusivo para Gerencia mediante JWT y contraseñas cifradas.
- Credenciales preconfiguradas para pruebas inmediatas:
  - **Usuario:** `gerente`
  - **Contraseña:** `admin123`

---

## 🚀 4. Puesta en Marcha en Local

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Ejecutar entorno de desarrollo (Cliente + Servidor concurrentes)
```bash
npm run dev
```
- **Frontend (Vite):** `http://localhost:4000`
- **Backend API (Express):** `http://localhost:4001` (con proxy automático `/api` desde el puerto 4000)

### 3. Ejecutar suite de pruebas unitarias
```bash
npm test
```

### 4. Compilar para producción
```bash
npm run build
```

---

## ☁️ 5. Despliegue en Vercel

El proyecto incluye `vercel.json` y `api/index.ts` listos para desplegar:
1. Sube este repositorio a tu cuenta de GitHub.
2. En [Vercel](https://vercel.com/), haz clic en **"Add New Project"** y selecciona el repositorio `Staff-Incidents-Manager`.
3. Vercel detectará la configuración:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **API Serverless:** Gestionado automáticamente por `api/index.ts` para todas las rutas `/api/*`.
4. Añade la variable de entorno opcional:
   - `JWT_SECRET=tu_clave_secreta`
5. ¡Haz clic en **Deploy** y tu aplicación estará disponible globalmente!
