# ADR-018: directorio voluntario de investigadores

Fecha: 2026-10-16. Estado: implementado; validación funcional completa pendiente.

## Decisión

Las cuentas mantienen un perfil propio con afiliaciones estructuradas, revisión y visibilidad voluntaria, inicialmente false. Se permite buscar a personas registradas por nombre, institución u ORCID de producción conectado. El correo y los datos de autenticación permanecen privados. El directorio es global para permitir colaboración internacional; el acceso a trabajos conserva su ámbito y permisos.

Se añade `researcher_profiles` con RLS/FORCE. La búsqueda pasa por `sep_researcher_directory(text,uuid)`, una función con search_path fijo y consultas calificadas, que comprueba actor activo y devuelve solo metadatos de perfiles visibles y personas activas. Las políticas de lectura del propietario de esa función están acotadas a la proyección. Se restablece el contexto tras éxito o excepción. No se otorgan permisos generales de lectura al runtime. El nombre solo puede actualizarlo su propietario, incluso si se activa contexto administrativo.

Se exigen tres caracteres, máximo diez resultados y un límite de frecuencia por cuenta/proceso. La consulta es literal parcial para nombre e institución y exacta para ORCID; no se usa nombre como identificador único. ORCID Sandbox se excluye de la proyección del directorio.

## Selección y confirmación

Seleccionar una persona carga sus datos como propuesta de autoría y guarda personId. El servidor valida disponibilidad y obtiene el identificador autenticado. `authorshipConfirmed` es calculado por servidor: true para declaración propia o aceptación explícita implementada de correspondencia, false para selección de otra persona. No concede acceso, propiedad, membresías ni permisos de organizador.

Los datos del trabajo siguen siendo declaraciones e instantáneas, no referencias que se actualicen solas con cada cambio del perfil. Se admite vincular explícitamente una fila manual a una persona conservando su ID y posición. No se fusiona por coincidencias de nombre ni se permiten referencias duplicadas a una persona en el mismo trabajo.

## Consecuencias

Migraciones 0034–0036, editor de perfil, búsqueda y selección, alternativa manual e indicadores separados de identidad y aceptación. Las cuentas y conexiones existentes siguen privadas hasta decisión de sus titulares. Las nuevas afiliaciones del perfil permiten precargar países en trabajos posteriores.

Las solicitudes de reconocimiento de autoría, aprobaciones y resolución de conflictos siguen pendientes. La gestión provisional corresponde al remitente hasta aceptación de esa responsabilidad por la correspondencia, según la política acordada. La nueva selección no sustituye ese flujo ni modifica versiones oficiales anteriores.
