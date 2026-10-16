# ADR-012: convocatoria científica estructurada

Estado: implementado; validación funcional completa pendiente.

## Contexto y decisión

Se inicia el módulo science con una entrega limitada a preparar y publicar convocatorias. La recepción de trabajos, coautores, archivos, revisión y dictámenes quedan para incrementos posteriores. Los pendientes de Fase 1 e identidad no se consideran cerrados.

Cada evento tiene un borrador y una publicación propios en scientific_call_drafts y scientific_call_publications. Ambas tablas tienen FK compuesta al evento, RLS/FORCE, revisión positiva y permisos explícitos para sep_runtime. Las operaciones usan autorización contextual, bloqueo de la fila del evento y auditoría en la misma transacción. El arranque verifica las dos tablas nuevas junto con las anteriores.

El contenido incluye títulos e instrucciones es/en, fechas locales de apertura/cierre, hasta 50 áreas y hasta 20 tipos de contribución. Los catálogos tienen UUID estables y nombres bilingües. Cada tipo declara límites de palabras del resumen, cantidad de palabras clave y si se requiere manuscrito, con límite de páginas. Los intervalos y la unicidad de identificadores se validan en servidor; los límites se anuncian, todavía no se aplican sobre envíos porque ese módulo no existe.

Para este incremento los catálogos acotados se almacenan en JSONB dentro de la revisión de la convocatoria y su instantánea. Antes de persistir contribuciones habrá que establecer referencias duraderas a sus UUID y a la revisión aplicable, normalizando catálogos cuando sea necesario. No se permitirá que retirar una opción del borrador destruya referencias de trabajos existentes.

## Guardado y publicación

El borrador puede guardar títulos/instrucciones vacíos y catálogos vacíos, pero cada elemento añadido debe tener nombres válidos. Las fechas deben ser ambas nulas o ambas válidas con cierre igual o posterior a apertura. Los tipos necesitan rangos coherentes: resumen entre 10 y 10000 palabras, palabras clave entre 0 y 20, manuscrito obligatorio con máximo entre 1 y 500 páginas; sin manuscrito, maxPages debe ser null.

Publicar exige un borrador guardado, revisión vigente, textos completos en ambos idiomas, ambos plazos y al menos un área y un tipo. El sitio del evento debe estar publicado previamente. Publicar la convocatoria crea una instantánea independiente: no publica ni modifica el CMS. Retirar la publicación elimina únicamente esa instantánea actual y conserva el borrador. La auditoría de retirada permanece.

Las acciones de guardado/publicación exigen organizador explícito y un evento no archivado, finalizado o cancelado. Se puede retirar la publicación incluso después de esos estados. El administrador institucional puede leer, pero necesita asignación de organizador para editar o publicar.

## Visibilidad y plazos

GET public/call solo devuelve la instantánea del evento asociado al Host activo y verificado, si el evento está publicado y no está cancelado o finalizado. No expone el borrador. Si se revierte la cancelación, una publicación conservada vuelve a ser visible; se puede retirar para impedirlo. Archivar el evento también impide el acceso público.

Los plazos se expresan como días completos de la zona horaria del evento capturada al publicar. El cierre es inclusivo hasta terminar el día indicado. El portal muestra si la apertura está prevista, se está dentro del intervalo anunciado o ya pasó el plazo. Es información sobre el calendario, no una afirmación de que el sistema permita enviar trabajos.

El portal carga por separado sitio y convocatoria. La ausencia de convocatoria publicada conserva el texto editorial de convocatoria del CMS; no se inventa un formulario de envío. Los errores de servicio distintos de 404 no se tratan como ausencia silenciosa. Cambiar la zona horaria o el borrador no modifica la instantánea científica: requiere volver a publicar la convocatoria.

## Límites

No se incorporan archivos, plantillas descargables, correo, comités, revisores ni formularios de envío. La tabla de publicaciones conserva la instantánea vigente, no todas las revisiones históricas; la auditoría existente conserva acciones y actores, no un historial completo de valores. Antes de gestionar trabajos será necesario versionar las reglas aplicadas a cada envío.

La batería funcional y de aislamiento completa sigue aplazada por indicación del propietario. Las comprobaciones dirigidas de compilación, almacenamiento y carga no sustituyen esa validación ni habilitan producción.
