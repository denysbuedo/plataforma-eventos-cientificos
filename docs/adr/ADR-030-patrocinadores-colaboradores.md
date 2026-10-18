# ADR-030: patrocinadores y colaboradores por evento

Estado: aceptado e implementado.

## Decisión

Separar catálogo de instituciones, contactos privados, compromisos y reconocimiento público. Mantener el catálogo por evento para impedir que una edición del organizador altere datos de otro evento. Los contactos externos no crean identidades ni permisos.

Usar categorías bilingües configurables y estados de compromiso con transiciones, responsables vinculados a membresías y evidencia obligatoria de cumplimiento. Conservar importes como cadenas decimales y calcular sumas mediante enteros escalados, agrupadas por moneda. No equiparar este seguimiento a un sistema de cobros.

Publicar solamente instituciones seleccionadas y autorizadas, después de una vista previa vinculada a una huella de revisiones. Guardar una proyección pública explícita que excluye contactos, compromisos, importes, responsables y notas. Conservar versiones inmutables y un único reconocimiento vigente por evento; permitir retirada motivada incluso después de cancelar o archivar el evento.

Aplicar RLS forzada, capacidad exclusiva del organizador, revisiones optimistas, bloqueo del evento e idempotencia de publicación. Conservar el historial inmutable y auditado.

Ver [recorrido, límites y validación](../development/patrocinadores-colaboradores.md).
