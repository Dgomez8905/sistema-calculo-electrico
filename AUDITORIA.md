# AUDITORÍA FUNCIONAL Y DE SEGURIDAD — PLAN MONPIX vs. REBT Cloud Suite

> **Fecha de revisión:** 14/11/2026
> **Repositorio auditado:** `sistema-calculo-electrico` (Next.js 16 + TypeScript + Tailwind CSS 4 + Supabase Postgres)
> **Referencia funcional:** Especificación **PLAN MONPIX** (herramienta integral de obra a oficina para instaladores electricistas en España según REBT RD 842/2002 e ITC-BT-01 a BT-52).

---

## 1. Mapa de Arquitectura y Dependencias

```text
src/app/page.tsx (Shell Multi-Tenant + Navegación + Expediente Activo + Buscador Global)
 ├── src/lib/electrical-calculations.ts (Motor base ITC-BT-19, 21, 22, 25, 10, 04, 05, 18)
 ├── src/lib/monpix-engine.ts           (Motor extendido MONPIX: paso a paso ITC, R·S·T, CGP/CPM, consumo, 19 CCAA, RAG REBT, VeriFactu, parsers voz/texto)
 ├── src/lib/monpix-store.ts            (Almacenamiento persistente aislado por tenant_id + user_id + Backup JSON + Sync Supabase)
 ├── Módulos ya existentes (conservados al 100% sin cambios disruptivos):
 │    ├── LandingAndAuthView.tsx        (Acceso multi-usuario, PIN y recuperación)
 │    ├── DashboardsView.tsx            (Dashboard técnico + Dashboard administrativo RBAC)
 │    ├── SectionHistoryRegistry.tsx    (Historial CRUD aislado por usuario/empresa)
 │    └── MtdCanariasOfficialForm.tsx   (Memoria Técnica de Diseño 11 páginas A4)
 └── Nuevos módulos MONPIX integrados:
      ├── CalculadorasObraView.tsx      (Sección/Iz paso a paso, I↔P, Tubos ITC-21, Reparto R·S·T, Enlace CGP/CPM/Fusibles, VE ITC-52, Consumo)
      ├── UnifilarCuadroView.tsx        (Unifilar desde foto/voz/expediente con revisión obligatoria, Cuadro DIN montado, SVG CAD y PDF A3 con cajetín)
      ├── PresupuestosPlanoView.tsx     (Calculadora de viviendas por puntos/series, Lector de planos con medición, Mis precios con coste/margen oculto en PDF, Material CSV)
      ├── TramitesOcaCatastroView.tsx   (Boletín/Trámites 19 CCAA + 28 tipos, Checklist e Inspecciones OCA, Referencia Catastral + Geolocalización)
      ├── OficinaGastosView.tsx         (Presupuestos PDF/WhatsApp/Email, Facturas correlativas + VeriFactu SHA-256/QR, Avisos, Clientes, Gastos OCR/validación NIF y Rentabilidad/Obra)
      ├── TareasEquipoView.tsx          (Tareas voz/WhatsApp con revisión, Avisos push navegador, Mi Equipo, Fichajes inmodificables con auditoría y Partes con firma)
      ├── AprenderSimuladorView.tsx     (Guías prácticas, Simulador "Monta el cuadro de un piso" y Test de Examen REBT)
      └── AsistenteMonpixFloating.tsx   (Botón flotante de voz y chat "Pregunta al Reglamento" con citas ITC y acciones confirmadas)
```

---

## 2. Comparativa Funcional (Qué teníamos vs. Qué se ha aplicado)

| Bloque PLAN MONPIX | Estado previo en el proyecto | Acción aplicada |
|---|---|---|
| **2.1 / Admin / RBAC** | Multi-tenant `app_tenants` + `app_users` con PIN y matriz RBAC | Conservado intacto + modo claro/oscuro + PWA instalable |
| **2.2 / 2.4 Pregunta al reglamento + Voz** | No existía | Implementado asistente flotante y de panel con dictado por voz (`SpeechRecognition`), base normativa REBT citando ITC/apartado y acciones con confirmación |
| **2.3 Tareas y avisos** | No existía | Implementado gestor de tareas por obra, captura por voz y desde texto de WhatsApp con paso *"Revísalo y guárdalo"* y notificaciones del navegador |
| **2.5 / 2.11 / 2.12 Vivienda, Precios y Plano** | Solo cálculo eléctrico de circuitos C1–C13 | Añadida calculadora de presupuestos por puntos, series (Simon 27, Schneider New Unica, Niessen Zenit, Legrand Valena Next), marcas de cuadro, lector/medidor de planos, coste/margen privado y lista de material exportable a CSV/Excel |
| **2.6 / 2.7 Local y Recarga VE** | Clasificador básico ITC-BT-04 | Añadido asistente específico de Locales y selector completo de esquemas VE ITC-BT-52 (1a a 4b) + SPL y protecciones |
| **2.8 / 2.9 Calculadoras paso a paso + Enlace CGP/CPM + Fases R·S·T** | Tabla conjunta de circuitos sin desglose didáctico ni reparto R·S·T automático | Añadidas calculadoras independientes con explicación paso a paso e ITC, equilibrador automático R·S·T conectable al cuadro, normas de enlace CGP/CPM/fusibles y simulador *"¿Cuánto gasta mi casa?"* |
| **2.10 Esquema Unifilar + Cuadro DIN + SVG CAD / PDF A3** | Solo hoja 8 estática dentro de la MTD Canarias | Añadido generador unifilar independiente (desde foto, texto/voz con revisión previa o expediente), vista de carril DIN montado, exportación `.svg` para CAD e impresión A3 con cajetín normalizado |
| **2.13 / 2.14 / 2.15 / 2.16 CCAA (19), Trámites, OCA y Catastro** | Solo modelo Canarias e indicador booleano OCA | Añadidas las 19 CCAA + 28 tipos de instalación con enlaces y alerta de vigencia, checklist OCA (defectos Leves/Graves/Muy graves) y buscador de Referencia Catastral con geolocalización GPS |
| **2.17 / 2.18 Oficina, Facturación VeriFactu, Gastos y Rentabilidad** | Solo cifra global `presupuestoTotalEuros` en MTD | Añadido módulo completo de Presupuestos (PDF sin costes ni márgenes + WhatsApp/Email), Facturas correlativas con huella SHA-256 encadenada y QR VeriFactu (RD 1007/2023), Gastos con validación NIF y cuadre IVA/IGIC, Rentabilidad por obra y Coste/hora |
| **2.19 Mi Equipo, Fichajes y Partes** | No existía | Añadido panel diario de operarios, asignación de trabajos por WhatsApp, registro de jornada inmodificable con historial auditado de correcciones (quién, cuándo, motivo), exportación CSV mensual y partes con firma digital |
| **2.20 Aprender y Simulador** | No existía | Añadido simulador interactivo *"Monta el cuadro de un piso"* (con pistas y validación normativa REBT), guías de polímetro/obra y test de examen REBT |

---

## 3. Auditoría de Seguridad y Riesgos Detectados

| Nivel | Hallazgo en el código previo | Mitigación recomendada / aplicada |
|---|---|---|
| **Alto** | Políticas RLS abiertas (`using (true)`) en `app_tenants` y `app_users` para el rol `anon`, y PIN en texto plano (`access_pin`) pensado para entorno demo. | En la nueva migración `20261114000000_monpix_modules_schema.sql` se documentan índices por `(tenant_id, owner_user_id)` y aislamiento estricto en cliente y BD. Para paso a producción abierta se recomienda migrar el login por PIN a **Supabase Auth** (`auth.uid()`) y hashear credenciales. |
| **Medio** | Riesgo de exponer costes internos o márgenes del instalador al imprimir un presupuesto para el cliente. | Todos los generadores de vista previa e impresión PDF de Presupuestos y Unifilares segregan explícitamente `internalCost` / `marginPct` con clases `.no-print` y plantillas limpias de cliente. |
| **Medio** | Entradas generadas por reconocimiento de texto/voz o foto podrían guardar datos erróneos sin supervisión humana. | Se exige siempre el paso intermedio **"Revísalo y guárdalo"** antes de persistir tareas, circuitos de unifilar, partidas de presupuesto o tickets de gasto. |
| **Bajo** | Alteración retrospectiva de registros horarios laborales (RDL 8/2019). | Los fichajes creados en `monpix-store.ts` son inmutables en sus marcas originales; cualquier rectificación exige motivo obligatorio y añade una entrada inalterable en `correctionHistory` (autor, timestamp ISO y valores previo/nuevo). |

