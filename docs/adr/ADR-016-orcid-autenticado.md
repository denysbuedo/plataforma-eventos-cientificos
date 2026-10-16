# ADR-016: ORCID autenticado y exigencia por evento

Fecha: 2026-10-16. Estado: implementado; activación y validación externa pendientes.

## Decisión

ORCID es un identificador vinculado a una persona existente mediante autorización OAuth `/authenticate`. No sustituye RedUniv ni Google, no se considera una credencial por haber sido escrito manualmente y no permite fusionar cuentas por coincidencia. Se siguen las [recomendaciones oficiales de captura autenticada](https://info.orcid.org/documentation/collecting-and-sharing-orcid-ids/).

La tabla `orcid_connections`, con RLS/FORCE, guarda identificador, entorno y fecha de conexión, además de una autorización pendiente breve. El estado se guarda como hash, se vincula a la persona y se comprueba con una cookie del navegador. No se persisten tokens ORCID. La unicidad se aplica por entorno; Sandbox nunca satisface la exigencia de producción.

El organizador decide si el envío inicial requiere ORCID verificado de la persona remitente. Se aplica a la cuenta remitente y a su inclusión explícita en la autoría, no a todos los coautores. El valor inicial false conserva compatibilidad; los clientes que omiten el campo mantienen su valor anterior. Un cambio no añade requisitos a correcciones de trabajos ya enviados.

Las declaraciones de autoría incorporan ORCID opcional, referencia propia a persona y estado de verificación calculado por servidor. Solo se admite vincular directamente la propia cuenta en este incremento. Las versiones oficiales conservan la autoría y su estado en el momento del envío. Las declaraciones ajenas pendientes requieren el flujo futuro de reconocimiento y aprobación; no se asocian automáticamente por ORCID.

## Consecuencias

Se añaden perfil, endpoints de inicio/canje y callback del servidor web, configuración por entorno y migraciones 0029–0031. La activación requiere registrar un cliente y callback exactos. No hay simulación de identidades verificadas en la demo. El mecanismo futuro de revisión de cuentas debe resolver conflictos, cambios de identificador y reclamaciones, manteniendo las versiones y permisos existentes.
