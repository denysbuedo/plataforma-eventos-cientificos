# Análisis inicial

Fecha: 14 de octubre de 2026.

Este documento conserva el diagnóstico de partida. El refinamiento posterior está en el [modelo de dominio](modelo-dominio.md), la [arquitectura](arquitectura.md), la [matriz de permisos](../functional/matriz-permisos.md) y los ADR [001](../adr/ADR-001-arquitectura.md) y [002](../adr/ADR-002-tenancy.md). Las propuestas documentales no equivalen a implementación ni validación del piloto.

## Estado comprobado

El proyecto parte de documentación de producto y arquitectura. Esta entrega incorpora la estructura de directorios; no incluye aplicaciones, dependencias, migraciones, contratos ejecutables, CI ni pruebas automáticas.

El README, el proyecto técnico en Markdown y el prompt maestro se han leído completos. El DOCX contiene las 22 secciones numeradas del proyecto técnico; esto no certifica igualdad literal entre formatos. El PDF no se ha cotejado.

## Dirección documentada

- Monolito modular API-first, con TypeScript, NestJS y Next.js/React.
- PostgreSQL, Redis/BullMQ y almacenamiento compatible con S3.
- Despliegue autohospedable en Ubuntu, con proxy y systemd, sin Docker obligatorio.
- Identidad reutilizable, permisos contextuales y contenido en español e inglés.
- API REST versionada y OpenAPI; clientes sin acceso directo a la base de datos.
- Procesos científicos, operativos y editoriales independientes y auditables.

## Invariantes

1. El dominio selecciona contexto, pero no concede permisos.
2. Los permisos de una persona no se heredan entre eventos.
3. Persona, autoría, inscripción, credencial y certificado son conceptos distintos.
4. Aceptación científica, presentación y publicación son estados independientes.
5. Los identificadores y roles enviados por el cliente no constituyen autorización.
6. La revisión confidencial debe protegerse en API, documentos, exportaciones y registros.
7. Un QR verificable no equivale por sí solo a una firma electrónica jurídica.

## Decisiones pendientes

| Tema | Resolución necesaria |
|---|---|
| Serie, edición y evento | Cardinalidades y representación de actividades dependientes. |
| Tenancy | Límites por organización y evento; administración de ámbito global. |
| Perfil compartido | Datos visibles para cada organización y reglas de privacidad. |
| Autorización | Matriz de permisos, propiedades y estados para cada operación. |
| ORM | Prueba técnica de Prisma frente a Drizzle: migraciones, RLS y contexto transaccional. |
| Identidad | Proveedor OIDC y mecanismo de desarrollo reemplazable. |
| Integraciones | Diferenciar captura de metadatos locales de conexiones con ORCID, DOI o pagos. |
| Offline | Alcance inicial de acreditación y reconciliación en fases posteriores. |
| Piloto | Volúmenes, reglas científicas, responsables editoriales y políticas de retención. |

## Observaciones para la primera entrega

P0 representa el núcleo funcional de varias fases, no el alcance de Fase 0.

Probar dos organizaciones con un evento cada una no basta para demostrar aislamiento entre eventos de una misma organización. La validación deberá cubrir ambos casos, además de una persona con roles diferentes y un usuario sin pertenencia al contexto solicitado.

Las cifras de capacidad y disponibilidad son objetivos pendientes de validación. El estudio comparativo de productos externos se conserva como referencia preliminar; no se ha verificado su vigencia en esta entrega.
