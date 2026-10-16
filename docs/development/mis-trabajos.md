# Mis trabajos

Abrir el portal del evento y pulsar **Mis trabajos**, o elegir el nuevo perfil **Autor** de la demo. Los organizadores también pueden abrir su espacio personal desde el menú al seleccionar un evento. No se necesitan permisos de organizador ni una vinculación a RedUniv.

Para crear un borrador, el organizador debe haber publicado una convocatoria científica con plazo de cierre vigente. Guardar su borrador de convocatoria no basta. Se puede preparar un trabajo antes de la fecha de apertura, pero todavía no se puede enviarlo.

1. Pulsar **Nuevo trabajo** y completar título, área, tipo e idioma.
2. Crear el borrador. Será privado del creador.
3. **Ver** abre los detalles en modo de consulta. El formulario aparece únicamente al pulsar **Editar**, desde la lista o desde el detalle. Tras crear un borrador se muestra su detalle sin abrir la edición.
4. En edición completar el resumen y palabras clave, una por línea. Se muestran los rangos del tipo seleccionado; los mínimos no impiden guardar un borrador incompleto, pero los máximos sí se validan.
5. Pulsar **Guardar borrador** para guardar y volver al detalle. Esto no envía nada al comité ni publica el trabajo. **Cancelar** descarta los cambios locales y vuelve a consulta.

Cada trabajo conserva una copia de la convocatoria original. Si cambia la convocatoria, aparece una indicación y el borrador mantiene su catálogo y requisitos. La compatibilidad para el envío se resolverá en un incremento posterior. El idioma se valida contra los idiomas actuales configurados para el evento.

Al cerrar el plazo, retirar la convocatoria o cancelar/finalizar/archivar el evento, los trabajos existentes siguen disponibles para consulta del propietario y se bloquea la edición. **Actualizar espacio** permite comprobar cambios y recargar después de un conflicto de revisión. Una nueva publicación vigente puede habilitar la edición de nuevo. No hay borrado ni envío formal en esta versión.

## API

Todas las rutas están bajo `/api/v1/events/:eventId/my-works`, con autenticación y contexto resuelto por Host.

| Método | Sufijo | Operación |
|---|---|---|
| GET | / | Evento, convocatoria vigente, idiomas admitidos, resúmenes propios y disponibilidad |
| POST | / | Crear con title, language, trackId, contributionTypeId |
| GET | /:workId | Detalle privado y convocatoria conservada |
| PUT | /:workId | Guardar title, language, trackId, contributionTypeId, abstract, keywords y revision |

El propietario y el ámbito nunca se aceptan en el cuerpo. Los IDs de trabajos de otra cuenta devuelven NOT_FOUND. Errores específicos: WORKS_UNAVAILABLE, WORK_LIMIT, WORK_REQUIREMENTS y REVISION_CONFLICT. Ver [OpenAPI](../api/openapi.json).

Aplicar migraciones 0019 y 0020 antes de arrancar la API. No se modifica la publicación de convocatorias ni se crean trabajos de ejemplo automáticamente. Si la demo muestra que no hay convocatoria publicada, entrar como organizador, completarla y publicarla primero.

## Verificación pendiente

Pasaron la compilación completa y el análisis estático. Las migraciones se aplicaron a la demo conservando sus datos. Se comprobó creación, edición, detalle propio, conservación de reglas y rechazo de otro actor, incluido contexto administrativo, dentro de una transacción revertida. La API y la pantalla autenticada de autor sin membresía respondieron en español e inglés, y el portal muestra su enlace. En Biosfera no había convocatoria publicada al comprobarlo; no se publicó una ni se dejaron borradores de diagnóstico. No se validaron las interacciones por navegador.

La batería completa sigue aplazada. Al retomarla deberá cubrir cuentas externas sin membresía, cuentas inactivas, cruce de propietarios/organizaciones/eventos, administradores sin acceso a borradores ajenos, límites, revisión concurrente, cambio o retirada de convocatoria, plazo inclusivo y zona horaria, cancelación/finalización, idioma retirado y conservación de reglas. Coautores y envío formal son los siguientes incrementos.
