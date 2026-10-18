# Plataforma de Eventos Científicos (SEP)

> Plataforma integral, multiinstitución, multievento y multilingüe para gestionar congresos científicos desde la convocatoria hasta la publicación de memorias y certificados.

**Estado:** ciclo principal implementado y demo local disponible: portal, convocatoria, trabajos/autorías, revisión, programa, inscripción, acreditación, certificados, comunicaciones, publicaciones, patrocinadores, logística/reservas, galería de pósteres, cobros multimoneda con verificación manual e indicadores. La validación integral por módulos y la activación de proveedores siguen pendientes. Consulte el [estado real del proyecto](docs/development/estado-del-proyecto.md) y la [guía de pruebas por módulo](docs/development/pruebas-por-modulo.md). **Idiomas:** español e inglés.

## Visión

Crear un sistema API-first, autohospedable, seguro y modular donde cada congreso tenga **dominio, imagen, programa, configuración y responsables independientes**, mientras participantes e investigadores conservan una identidad reutilizable y permisos propios por evento.

El producto gestiona el ciclo **planificación → ciencia → inscripción → programa y celebración → acreditación/certificación → memorias y preservación**. La web es el primer cliente; las mismas APIs permitirán una futura PWA móvil y aplicaciones Android/iOS.

## Funcionalidades previstas

| Área | Capacidades | Prioridad |
|---|---|---|
| Plataforma | Organizaciones, series/ediciones, dominios, marca, idiomas, CMS, RBAC/ABAC | P0 |
| Ciencia | Comités, CFP, envíos/versiones, autores, revisión ciega, dictámenes | P0 |
| Programa | Sesiones, salas, ponentes, agendas y conflictos | P0 |
| Registro | Inscripciones, categorías, modalidades y cupos | P0 |
| Acreditación | Credenciales QR, check-in, asistencia | P0 |
| Certificación | Plantillas, condiciones, emisión, QR y revocación | P0 |
| Pósteres | Galería navegable, visor, búsqueda, metadatos | P0 |
| Memorias | Edición, composición, PDF/HTML, identificadores y preservación | P0 |
| Comunicación/analítica | Emails, notificaciones, indicadores y exportaciones | P0 |
| Servicios | Pagos, streaming, patrocinios | P1 |
| Extensiones | Hospedaje, transportación, networking e IA asistiva | P2 |

**P0/P1/P2 son prioridades propuestas, no funcionalidades implementadas.** Ninguna pantalla o API debe anunciarse como terminada sin prueba y evidencia.

## Arquitectura propuesta

- **Estilo:** monolito modular, API-first y eventos de dominio; extracción posterior de servicios solo si se justifica.
- **Frontend:** Next.js + React + TypeScript, i18n, SSR, diseño responsive.
- **Backend:** NestJS + TypeScript + OpenAPI.
- **Datos:** PostgreSQL + Drizzle, elegido tras [prueba técnica de aislamiento](docs/architecture/prueba-orm.md) y [ADR-003](docs/adr/ADR-003-orm-aislamiento.md).
- **Identidad:** dos accesos independientes: RedUniv mediante Keycloak y Google mediante OpenID Connect directo. Integraciones implementadas; activación pendiente de registrar clientes y configurar credenciales. Véase [configuración de RedUniv y Google](docs/development/reduniv-y-google.md).
- **Asíncrono:** Redis + BullMQ y patrón Transactional Outbox.
- **Archivos:** manuscritos privados en PostgreSQL, con versiones y cuotas; S3 compatible previsto para ampliar almacenamiento. Véase [ADR-015](docs/adr/ADR-015-envios-versiones-archivos.md).
- **Operación:** Ubuntu, Nginx/HAProxy, systemd, métricas/logs; sin requisito inicial de Docker/Kubernetes.

```text
Web pública ─────┐
Admin web ───────┼─> API NestJS (módulos y políticas) ─> PostgreSQL
PWA check-in ────┤                   │                   ├─> Redis/colas
APK futura ─────┘                   └───────────────────> Objetos S3
```

## Estructura inicial del repositorio

El monorepo npm contiene la API NestJS, dos aplicaciones Next.js, componentes visuales, contratos, idiomas y un gateway exclusivo del servidor. Los workers siguen pendientes. La comparación de ORM permanece independiente en `tests/orm-spike/`.

```text
apps/
  public-web/       # Portal público configurable por dominio
  admin-web/        # Administración global y de eventos
  api/              # API y dominios de negocio
  checkin-pwa/      # Acreditación offline-first (fase posterior)
packages/
  contracts/        # DTOs/contratos versionados
  ui/               # Componentes de interfaz compartidos
  i18n/             # Catálogos de localización
  web-server/       # Gateway API, sesiones y contexto web; exclusivo del servidor
  configuration/    # Convenciones de entorno, lint, TS
  sdk-typescript/   # Cliente API generado
services/
  document-worker/  # PDF, credenciales, certificados y memorias
  media-worker/     # Previews, miniaturas y validación
infrastructure/     # Despliegue Linux, proxy, servicios y monitoreo
docs/
  architecture/     # C4, ADR, modelos
  adr/              # Decisiones de arquitectura
  api/              # Contratos y convenciones API
  development/      # Guías de trabajo y prompt maestro
  functional/       # Requisitos y flujos
  reference/        # Documentos originales en PDF y DOCX
tests/              # Contratos, seguridad, E2E
```

## Conceptos del dominio

`Organization`, `EventSeries`, `EventEdition`, `Event`, `Domain`, `Person`, `Membership`, `Submission`, `Authorship`, `Review`, `Decision`, `Session`, `Registration`, `Entitlement`, `Credential`, `CheckIn`, `Certificate`, `Poster`, `Proceedings` y `Publication`.

**Invariantes:** no mezclar persona con inscripción; no equiparar aceptación y publicación; no convertir QR en firma legal; no heredar permisos entre eventos; no confiar en tenant ID proporcionado por cliente; no exponer material de revisión confidencial.

## Principios innegociables

1. **Aislamiento multitenant verificable.** Cada acceso comprueba organización/evento en servidor; pruebas cruzadas obligatorias.
2. **Ciencia trazable.** Versiones, conflictos, revisores, estados, decisiones y cambios auditables.
3. **API-first.** Contratos OpenAPI versionados; UI y futura APK consumen la misma API.
4. **Diseño extensible.** Módulos con interfaces propias, sin acceder a tablas privadas de otros dominios.
5. **i18n real.** UI, CMS, correo, formularios, certificados y metadatos.
6. **Soberanía y baja conectividad.** Autohospedaje y experiencia móvil ligera; sincronización offline explícita donde aplique.
7. **Seguridad y privacidad.** Roles mínimos, MFA admin, control de archivos, auditoría, consentimiento, retención y exportación.
8. **Entregas verificables.** Tests, migraciones, documentación y criterios de aceptación con cada funcionalidad.

## Etapas del proyecto

- **Fase 0:** arquitectura, ADR, modelo, CI y prueba multitenant.
- **Fase 1:** organizaciones, dominios, identidad, i18n y sitios configurables.
- **Fase 2:** ciclo científico de convocatoria, revisión y programa.
- **Fase 3:** inscripción, credenciales, certificados, pósteres y memorias.
- **Fase 4:** patrocinadores y colaboradores implementados; pagos, ampliaciones híbridas y logística pendientes.
- **Fase 5:** cliente móvil, SDK, analítica y extensiones avanzadas.

### Primer hito demostrable

**Dos eventos en una instancia**, con dominios/temas independientes, un mismo usuario con roles diferentes y pruebas de que un operador de A no puede acceder a datos privados de B, ni mediante la API ni manipulando IDs.

## Desarrollo local

Entorno comprobado: Node.js 22.23.2, npm 10.9.2, TypeScript 6.0.3, NestJS 12.1.3 y PostgreSQL 18.4. Desde la raíz:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:web
npm run dev:demo
```

Los tests y la demo crean su propia instancia PostgreSQL con datos ficticios sin usar el servicio existente. Consultar la [guía local](docs/development/desarrollo-local.md) para configurar `SEP_PG_BIN`, obtener tokens efímeros y usar los hosts simulados. No se requiere Docker.

La API implementa salud, vista pública del evento publicado, lista/detalle de metadatos, creación de borradores y edición de nombres con auditoría. Las [operaciones y permisos](docs/api/fase-0.md) se describen en el [OpenAPI versionado](docs/api/openapi.json), disponible también en `/api/v1/openapi.json` y `/api/docs` al arrancar.

Resultado local: **31 tests aprobados (30 casos y 1 grupo)** sobre PostgreSQL y HTTP reales. Se comprueban cruces entre organizaciones/eventos, roles distintos, revocaciones, contexto falsificado, concurrencia, CMS, publicación y auditoría. El workflow de GitHub Actions verifica lint, tipos, compilación, contratos y pruebas de API y navegador; consultar su ejecución para el resultado remoto.

La demo imprime enlaces al portal público y al administrador, con perfiles para explorar los permisos. El CMS permite guardar contenido bilingüe y publicar cambios explícitamente. El administrador dispone de Personas, invitaciones por enlace y asignación de organizadores por evento; estos incrementos tienen validación funcional pendiente. El adaptador OIDC y el login institucional están implementados, ajustados al realm reduniv-institucional, con activación pendiente del cliente, secreto y orígenes registrados; ver la [guía de identidad](docs/development/identidad-institucional.md). Consulta el [alcance del incremento visual](docs/functional/fase-1.md). La autenticación de desarrollo requiere habilitación explícita y está bloqueada en producción. La validación OIDC, políticas de registro/MFA del proveedor, entrega de correo, dominios/TLS reales, administración completa y módulos científicos siguen pendientes. La Fase 1 permanece abierta. La [prueba comparativa de ORM](tests/orm-spike/README.md) conserva su evidencia anterior por separado.

## Documentación

**Mis trabajos** permite preparar borradores privados, declarar autores y afiliaciones, adjuntar PDF y enviar versiones inmutables. Incluye historial, retiro, correcciones y versión final. **Trabajos recibidos** permite al organizador consultar los envíos y comunicar dictámenes con plazos. No equivale a revisión por pares. Ver [guía del módulo](docs/development/trabajos-envios.md).

**Mi perfil** incorpora conexión autenticada con ORCID; cada evento puede exigirlo a la persona que realiza el envío inicial. La activación se configura por entorno; ORCID de producción sigue pendiente. Ver [configuración y alcance](docs/development/orcid.md).

**Gestión compartida** permite invitar al autor de correspondencia, aceptar acceso y revocarlo. El colaborador puede corregir contenido, gestionar PDF y reenviar dentro de los plazos; la autoría y el retiro quedan bajo control del remitente original. Ver [recorrido y límites](docs/development/gestion-compartida-trabajos.md).

**Autores registrados** incorpora perfil con afiliaciones y visibilidad voluntaria, búsqueda por nombre/institución/ORCID de producción y selección antes de recurrir a la declaración manual. Seleccionar una cuenta no confirma autoría ni concede acceso. Ver [guía de búsqueda](docs/development/busqueda-autores.md).

**Convocatoria científica** permite preparar áreas temáticas, tipos de contribución, requisitos y plazos, con borrador, publicación independiente y retirada. El portal muestra solo la versión publicada. Ver [Fase 2](docs/functional/fase-2.md); validación funcional completa aplazada. El acceso real con RedUniv/Google y el antivirus operativo siguen pendientes de configuración externa.

En **Datos del evento** se administran fechas, zona horaria, modalidad, idiomas y ciclo operativo, separados de la publicación del CMS. Las fechas configuradas se aplican al volver a publicar. Véase [configuración del evento](docs/development/configuracion-eventos.md); validación funcional completa pendiente.

La sección **Organización** permite editar el perfil institucional y gestionar dominios de eventos con verificación TXT y activación condicionada a preparación HTTPS. No modifica DNS ni certificados; el ingreso administrativo queda protegido. Ver la [guía de organizaciones y dominios](docs/development/organizaciones-y-dominios.md). Este incremento tiene validación funcional pendiente; los accesos reales RedUniv y Google siguen aplazados.

El informe completo [PROYECTO_TECNICO_INICIAL.md](PROYECTO_TECNICO_INICIAL.md) es la referencia inicial del alcance. Antes de implementar nuevas capacidades, registrar decisiones importantes en `docs/adr/` y acuerdos API en `docs/api/`.

- [Índice de documentación](docs/README.md).
- [Análisis inicial y cuestiones pendientes](docs/architecture/analisis-inicial.md).
- [Arquitectura y diagramas C4](docs/architecture/arquitectura.md).
- [Modelo de dominio propuesto](docs/architecture/modelo-dominio.md).
- [Matriz de permisos propuesta](docs/functional/matriz-permisos.md).
- Decisiones: [ADR-001 arquitectura](docs/adr/ADR-001-arquitectura.md) · [ADR-002 tenancy](docs/adr/ADR-002-tenancy.md).
- [ADR-003: elección de Drizzle y aislamiento transaccional](docs/adr/ADR-003-orm-aislamiento.md).
- [Resultados de la prueba ORM](docs/architecture/prueba-orm.md).
- [Plan de trabajo de Fase 0](docs/functional/fase-0.md).
- [Fase 1: portales y CMS](docs/functional/fase-1.md) y [ADR-005](docs/adr/ADR-005-portales-y-publicacion.md).
- [Desarrollo local y demo](docs/development/desarrollo-local.md).
- [Contrato API mínimo](docs/api/fase-0.md).
- [Evidencia del incremento API](docs/architecture/evidencia-api-fase-0.md).
- [Prompt maestro para Codex](docs/development/PROMPT_MAESTRO_CODEX.md).
- Proyecto técnico: [PDF](docs/reference/Proyecto_Tecnico_Inicial_SEP_v1.pdf) · [DOCX](docs/reference/Proyecto_Tecnico_Inicial_SEP_v1.docx).

## Contribución y gobernanza

- Desarrollo mediante issues, ramas y PRs con revisión.
- Commits legibles; cambios funcionales acompañados de pruebas y documentación.
- Ningún dato real de personas/trabajos científicos en fixtures públicos.
- Reportar vulnerabilidades de forma privada, no como issue público.
- Establecer `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `SECURITY.md` y política de datos antes de apertura pública.

## Licencia

**Pendiente de decisión del propietario del proyecto.** No publicar una licencia por omisión ni asumir que todas las dependencias permiten cualquier modalidad de distribución.

## Estado del proyecto

Este README describe la **visión objetivo**. No representa una aplicación terminada ni valida características que todavía no se han construido.

**Revisión científica** incorpora comité/revisores con aceptación, rondas sobre versiones oficiales, criterios bilingües, conflictos, asignaciones, borradores privados, informes inmutables y dictámenes condicionados. El autor recibe comentarios publicados sin notas confidenciales ni identidad de revisores y puede responderlos al reenviar; la respuesta queda vinculada a la versión oficial, llega a los revisores originales para su valoración y queda disponible para una siguiente ronda. El organizador conserva el dictamen final y justifica las aceptaciones excepcionales. Ver [recorrido y límites](docs/development/revision-cientifica.md). Doble ciego y activación del correo institucional siguen pendientes.

**Programa científico** permite preparar sesiones, horarios, salas y moderadores; asignar trabajos aceptados y sus presentadores; comprobar cruces; publicar una agenda independiente y consultar las asignaciones propias en Mi participación. La programación no acredita asistencia ni emite certificados. Ver [recorrido y límites](docs/development/programa-cientifico.md).

El programa distingue actividades científicas (simposios, talleres y otras), sesiones con horario y presentaciones. Incluye espacios físicos/virtuales registrados, funciones de participación, formatos y modalidad individual del presentador. La creación de sesiones utiliza cuatro pasos. Ver [estudio comparativo](docs/architecture/estudio-organizacion-cientifica-eventos.md) y [ADR-023](docs/adr/ADR-023-estructura-cientifica-espacios-y-formatos.md).

**Comunicaciones** incorpora avisos personales, lectura persistente, preferencias, comunicados bilingües y correo transaccional con cola, historial y reintentos. El transporte SMTP institucional y los accesos reales RedUniv/Google requieren activación; la demo funciona sin enviar correo. Ver [configuración y validación](docs/development/comunicaciones.md).

**Publicaciones científicas** permite seleccionar versiones aceptadas, solicitar autorización al responsable del envío, revisar contenido y licencias, generar pruebas y publicar libros de resúmenes y memorias con PDF, fichas y exportaciones bibliográficas. Las ediciones conservan metadatos y archivos inmutables; una retirada motivada bloquea descargas y conserva su ficha de estado. Ver [recorrido y límites](docs/development/publicaciones-cientificas.md).

**Patrocinadores y colaboradores** incorpora catálogo por evento, contactos privados, categorías bilingües, logotipos, compromisos con responsables/plazos/evidencia y seguimiento por moneda. El reconocimiento público exige selección y autorización explícitas, vista previa y publicación independiente, con versiones e historial conservados y retirada motivada. Ver [guía y límites](docs/development/patrocinadores-colaboradores.md). Los cobros y la logística ampliada siguen pendientes de Fase 4.

## Bloques operativos recientes

- [Logística, reservas y acceso a sesiones](docs/development/logistica-reservas.md).
- [Galería de pósteres y consentimiento de publicación](docs/development/galeria-posteres.md).
- [Cobros: efectivo, Transfermóvil/Enzona y catálogo de pasarelas; CUP, USD y EUR](docs/development/cobros-pagos.md). La confirmación automática de proveedores requiere adaptadores específicos.
- [Indicadores y exportaciones](docs/development/indicadores-informes.md).
