# Scientific Events Platform (SEP)

> Plataforma integral, multiinstitución, multievento y multilingüe para gestionar congresos científicos desde la convocatoria hasta la publicación de memorias y certificados.

**Estado:** definición inicial de producto y arquitectura · **Versión:** 0.1.0-planning · **Idiomas iniciales:** español e inglés.

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
- **Identidad:** OpenID Connect (p. ej. Keycloak o IAM institucional).
- **Asíncrono:** Redis + BullMQ y patrón Transactional Outbox.
- **Archivos:** almacenamiento S3 compatible con aislamiento por tenant.
- **Operación:** Ubuntu, Nginx/HAProxy, systemd, métricas/logs; sin requisito inicial de Docker/Kubernetes.

```text
Web pública ─────┐
Admin web ───────┼─> API NestJS (módulos y políticas) ─> PostgreSQL
PWA check-in ────┤                   │                   ├─> Redis/colas
APK futura ─────┘                   └───────────────────> Objetos S3
```

## Estructura inicial del repositorio

Las carpetas ya están preparadas para el desarrollo. Contienen documentación, archivos `.gitkeep` y una prueba técnica ejecutable en `tests/orm-spike/`; todavía no hay aplicaciones ni servicios implementados.

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
- **Fase 4:** pagos, eventos híbridos, patrocinadores y logística.
- **Fase 5:** cliente móvil, SDK, analítica y extensiones avanzadas.

### Primer hito demostrable

**Dos eventos en una instancia**, con dominios/temas independientes, un mismo usuario con roles diferentes y pruebas de que un operador de A no puede acceder a datos privados de B, ni mediante la API ni manipulando IDs.

## Desarrollo local

**La API y el monorepo de aplicaciones todavía no están implementados.** Existe una [prueba técnica independiente](tests/orm-spike/README.md), comprobada con Node.js 22.23.2, npm 10.9.2 y PostgreSQL 18.4:

```powershell
cd tests/orm-spike
npm ci
npm run generate:prisma
npm run typecheck
npm test
```

La prueba crea y detiene su propia instancia local de PostgreSQL con datos ficticios. Consultar su README para localizar los binarios, configurar `SEP_PG_BIN` y conocer sus límites. El resultado registrado es 34 tests aprobados: 32 comprobaciones de aislamiento y 2 grupos. No valida aún dominios, autenticación ni autorización HTTP.

Cuando se inicialice el monorepo, documentar aquí versiones, variables de entorno sin secretos, migraciones, seed de demo, test, lint, build y arranque real de las aplicaciones.

## Documentación

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
