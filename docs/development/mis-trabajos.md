# Mis trabajos

Esta guía describe el editor de autor. El flujo completo implementado de PDF, envío, correcciones, dictámenes y versión final está en [Trabajos y envíos](trabajos-envios.md).

Abrir el portal del evento y pulsar **Mis trabajos**, o elegir el nuevo perfil **Autor** de la demo. Los organizadores también pueden abrir su espacio personal desde el menú al seleccionar un evento. No se necesitan permisos de organizador ni una vinculación a RedUniv.

Para crear un borrador, el organizador debe haber publicado una convocatoria científica con plazo de cierre vigente. Guardar su borrador de convocatoria no basta. Se puede preparar un trabajo antes de la fecha de apertura, pero todavía no se puede enviarlo.

1. Pulsar **Nuevo trabajo** y completar título, área, tipo e idioma.
2. Crear el borrador. Será privado del creador.
3. **Ver** abre los detalles en modo de consulta. El formulario aparece únicamente al pulsar **Editar**, desde la lista o desde el detalle. Tras crear un borrador se muestra su detalle sin abrir la edición.
4. En edición completar el resumen y palabras clave, una por línea. Se muestran los rangos del tipo seleccionado; los mínimos no impiden guardar un borrador incompleto, pero los máximos sí se validan.
5. Pulsar **Guardar borrador** para guardar y volver al detalle. Esto no envía nada al comité ni publica el trabajo. **Cancelar** descarta los cambios locales y vuelve a consulta.
6. **Volver al listado** cierra el detalle o la edición y deja únicamente la lista de trabajos. Si hay cambios de edición sin guardar, pide confirmación antes de descartarlos. La opción **Mis trabajos** del menú también vuelve al listado. Cada fila muestra su estado actual y permite editar solo cuando corresponda.

Cada trabajo conserva una copia de la convocatoria original. Si cambia la convocatoria, aparece una indicación y el borrador mantiene su catálogo y requisitos hasta actualizar explícitamente las reglas antes del envío inicial. El idioma se valida contra los idiomas actuales del evento; la fase final conserva el idioma aceptado.

## Autores y afiliaciones

En **Editar → Autores y afiliaciones**, añadir cada autor con nombre completo y al menos una institución con país. Se admiten hasta 20 autores y cinco afiliaciones por autor. Los países se eligen de una lista traducida; se conserva su código ISO.

**Subir** y **Bajar** modifican el orden de autoría. Marcar un único **Autor de correspondencia** y completar su correo; el correo del resto es opcional. Si se retira al autor seleccionado para correspondencia, elegir otro antes de guardar. Se puede dejar vacía la lista completa mientras el trabajo sea borrador.

**Guardar borrador** guarda también la autoría y vuelve a consulta. **Cancelar** revierte los cambios locales de autores, orden y afiliaciones. **Volver al listado** funciona desde el detalle y la edición y pide confirmación si hay cambios sin guardar. Añadir coautores no crea cuentas, concede acceso ni envía correos. Solo el propietario puede editar el borrador.

Al cerrar el plazo o retirar la convocatoria, los borradores quedan en consulta; las respuestas solicitadas usan su propio plazo. Cancelar/finalizar/archivar bloquea cambios. **Actualizar espacio** permite recargar después de un conflicto de revisión. Se puede quitar del listado un borrador nunca enviado. El envío formal y las versiones están descritos en la guía del módulo completo.

## API

Todas las rutas están bajo `/api/v1/events/:eventId/my-works`, con autenticación y contexto resuelto por Host.

| Método | Sufijo | Operación |
|---|---|---|
| GET | / | Evento, convocatoria vigente, idiomas admitidos, resúmenes propios y disponibilidad |
| POST | / | Crear con title, language, trackId, contributionTypeId |
| GET | /:workId | Detalle privado y convocatoria conservada |
| PUT | /:workId | Guardar title, language, trackId, contributionTypeId, abstract, keywords, authors y revision |

El propietario y el ámbito nunca se aceptan en el cuerpo. Los IDs de trabajos de otra cuenta devuelven NOT_FOUND. Errores específicos: WORKS_UNAVAILABLE, WORK_LIMIT, WORK_REQUIREMENTS y REVISION_CONFLICT. Ver [OpenAPI](../api/openapi.json).

Aplicar migraciones 0019 y 0020 antes de arrancar la API. No se modifica la publicación de convocatorias ni se crean trabajos de ejemplo automáticamente. Si la demo muestra que no hay convocatoria publicada, entrar como organizador, completarla y publicarla primero.

Para autoría aplicar también 0021 y 0022: añaden authors con valor inicial [] y su privilegio de actualización. Omitir authors en PUT conserva los datos actuales; enviar [] deja la lista vacía. Los detalles devuelven authors; el listado de resúmenes no incluye los correos ni las afiliaciones. Ver [ADR-014](../adr/ADR-014-autoria-declarada.md).

El incremento de autoría pasó compilación y análisis estático. Se comprobaron afiliaciones múltiples, país normalizado, reordenación, cambio de correspondencia, conservación con clientes anteriores y privacidad en una transacción revertida. La demo carga en ambos idiomas y los detalles anteriores devuelven authors. También se comprobó que un JSON multilingüe de más de 100 KiB atraviesa el gateway y llega al control de propiedad sobre un UUID inexistente, sin crear ni modificar trabajos. Las interacciones de los nuevos controles no se validaron por navegador ni se ejecutó la batería completa.

## Verificación pendiente

Pasaron la compilación completa y el análisis estático. Las migraciones se aplicaron a la demo conservando sus datos. Se comprobó creación, edición, detalle propio, conservación de reglas y rechazo de otro actor, incluido contexto administrativo, dentro de una transacción revertida. La API y la pantalla autenticada de autor sin membresía respondieron en español e inglés, y el portal muestra su enlace. En Biosfera no había convocatoria publicada al comprobarlo; no se publicó una ni se dejaron borradores de diagnóstico. No se validaron las interacciones por navegador.

La batería completa sigue aplazada. Al retomarla deberá cubrir cuentas externas sin membresía, cuentas inactivas, cruce de propietarios/organizaciones/eventos, administradores sin acceso a borradores ajenos, límites, revisión concurrente, cambio o retirada de convocatoria, plazo inclusivo y zona horaria, cancelación/finalización, idioma retirado, conservación de reglas, orden de autores, correspondencia única, datos incompletos, países no admitidos, afiliaciones repetidas y compatibilidad de clientes anteriores. Las comprobaciones dirigidas del flujo ampliado constan en [Trabajos y envíos](trabajos-envios.md).
