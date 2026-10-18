# Documentación de SEP

## Fuentes del proyecto

- [README del repositorio](../README.md): visión, arquitectura de partida y estado real.
- [Proyecto técnico inicial](../PROYECTO_TECNICO_INICIAL.md): referencia inicial de alcance y requisitos.
- [PDF del proyecto técnico](reference/Proyecto_Tecnico_Inicial_SEP_v1.pdf).
- [DOCX del proyecto técnico](reference/Proyecto_Tecnico_Inicial_SEP_v1.docx).
- [Guía institucional Entrar con RedUniv](reference/entrar-con-reduniv.md), facilitada desde el proyecto de identidad.
- [Prompt maestro para Codex](development/PROMPT_MAESTRO_CODEX.md): guía de ejecución por fases. Las rutas a `README.md` y `PROYECTO_TECNICO_INICIAL.md` que contiene se refieren a la raíz del repositorio.

## Documentos de trabajo

- [Análisis inicial](architecture/analisis-inicial.md).
- [Arquitectura C4 y mapa de módulos](architecture/arquitectura.md).
- [Modelo inicial de dominio](architecture/modelo-dominio.md).
- [Matriz inicial de permisos](functional/matriz-permisos.md).
- [ADR-001: arquitectura modular API-first](adr/ADR-001-arquitectura.md).
- [ADR-002: tenancy y autorización por evento](adr/ADR-002-tenancy.md).
- [ADR-003: Drizzle y aislamiento transaccional](adr/ADR-003-orm-aislamiento.md).
- [Resultados de la prueba ORM](architecture/prueba-orm.md).
- [Ejecución de la prueba técnica](../tests/orm-spike/README.md).
- [Plan de Fase 0](functional/fase-0.md).
- [Fase 1: incremento visual](functional/fase-1.md).
- [ADR-005: portales, sesiones y publicación](adr/ADR-005-portales-y-publicacion.md).
- [ADR-006: designación de organizadores](adr/ADR-006-designacion-organizadores.md).
- [ADR-007: personas e invitaciones](adr/ADR-007-personas-invitaciones.md).
- [ADR-008: autenticación OIDC](adr/ADR-008-autenticacion-oidc.md) y [configuración del Keycloak institucional](development/identidad-institucional.md).
- [RedUniv y Google directo: solicitudes y configuración](development/reduniv-y-google.md) y [ADR-009](adr/ADR-009-google-directo.md).
- [Administración de organizaciones y dominios](development/organizaciones-y-dominios.md) y [ADR-010](adr/ADR-010-administracion-registro.md).
- [Configuración del evento y ciclo de vida](development/configuracion-eventos.md) y [ADR-011](adr/ADR-011-configuracion-evento.md).
- [Fase 2: convocatoria científica y próximos incrementos](functional/fase-2.md) y [ADR-012](adr/ADR-012-convocatoria-cientifica.md).
- [Mis trabajos: borradores privados del autor](development/mis-trabajos.md) y [ADR-013](adr/ADR-013-borradores-autor.md).
- [ADR-014: autoría declarada, afiliaciones y correspondencia](adr/ADR-014-autoria-declarada.md).
- [Autoría e identidad: propuesta de búsqueda y reconocimiento](functional/autoria-identidad.md).
- [Conexión ORCID y activación](development/orcid.md) y [ADR-016](adr/ADR-016-orcid-autenticado.md).
- [Gestión compartida de trabajos](development/gestion-compartida-trabajos.md) y [ADR-017](adr/ADR-017-gestion-compartida-trabajos.md).
- [Perfil y búsqueda de autores registrados](development/busqueda-autores.md) y [ADR-018](adr/ADR-018-directorio-investigadores.md).
- [Trabajos: envío, archivos, correcciones y versión final](development/trabajos-envios.md) y [ADR-015: versiones, privacidad y manuscritos](adr/ADR-015-envios-versiones-archivos.md).
- [Desarrollo local, variables y demo](development/desarrollo-local.md).
- [Contrato mínimo de API](api/fase-0.md) y [OpenAPI generado](api/openapi.json).
- [Evidencia del incremento API](architecture/evidencia-api-fase-0.md).
- [ADR-004: entorno y autenticación de desarrollo](adr/ADR-004-entorno-desarrollo.md).

## Organización

| Directorio | Contenido previsto |
|---|---|
| `architecture/` | Contexto, contenedores C4, límites de módulos, modelos e invariantes. |
| `adr/` | Decisiones con contexto, alternativas, consecuencias y estado. |
| `api/` | OpenAPI, autorización, errores y convenciones de contratos. |
| `functional/` | Requisitos, flujos, alcance de fases y criterios de aceptación. |
| `development/` | Guías de desarrollo y colaboración. |
| `reference/` | Documentos de referencia en formatos de distribución. |

Los documentos de planificación describen trabajo futuro. No constituyen evidencia de funcionalidades implementadas. Las decisiones pendientes se resolverán mediante ADR y validación del producto.

- [Reconocimiento de autorías, responsabilidad y avisos](development/reconocimiento-autorias.md) y [ADR-019](adr/ADR-019-reconocimiento-autorias.md).

- [Mi espacio: navegación compartida y ubicación futura de certificados](development/mi-espacio.md).

- [Perfil internacional: formación, grado científico y trayectoria](development/perfil-investigador-internacional.md).

- [Revisión científica: comité, rondas, asignaciones y evaluaciones](development/revision-cientifica.md) y [ADR-020](adr/ADR-020-revision-cientifica.md).

- [Programa científico: sesiones, publicación y Mi participación](development/programa-cientifico.md) y [ADR-022](adr/ADR-022-programa-publicacion-y-participacion.md).

- [Estudio comparativo internacional de actividades, sesiones y presentaciones](architecture/estudio-organizacion-cientifica-eventos.md) y [ADR-023](adr/ADR-023-estructura-cientifica-espacios-y-formatos.md).

- [Fase 3: participantes, asistencia y certificados](functional/fase-3.md), [inscripciones](development/inscripciones.md) y [ADR-024](adr/ADR-024-inscripciones-y-participantes.md).

- [Acreditación y asistencia con QR](development/acreditacion-asistencia.md) y [ADR-025](adr/ADR-025-acreditacion-y-asistencia.md) y [ADR-029](adr/ADR-029-acreditacion-operativa-qr.md).

- [Certificados verificables](development/certificados.md) y [ADR-026](adr/ADR-026-certificados-verificables.md).

- [Comunicaciones y notificaciones](development/comunicaciones.md) y [ADR-027](adr/ADR-027-comunicaciones.md).

- [Publicaciones científicas: resúmenes, memorias y archivo](development/publicaciones-cientificas.md) y [ADR-028](adr/ADR-028-publicacion-editorial.md).
