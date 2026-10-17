# ADR-022: programa, publicación y participación

Estado: aceptada para el primer bloque funcional.

## Contexto

Un dictamen de aceptación no define una presentación ni acredita asistencia. El organizador necesita preparar una agenda sin publicar cambios parciales y sin modificar el expediente científico. Presentadores y moderadores deben consultar sus compromisos dentro de Mi espacio.

## Decisión

Guardar un borrador agregado por evento y una instantánea publicada separada, con revisión optimista y serialización sobre el evento. Limitar el agregado a cien sesiones y quinientas presentaciones. Validar en la misma transacción fechas, horarios locales, salas, participantes y versiones oficiales aceptadas. Revalidar al publicar y conservar la publicación anterior si algo falla.

El JSON conserva la agenda completa para actualizarla atómicamente; la relación con los trabajos se valida en el servicio sobre filas bloqueadas. No se afirma una clave foránea entre cada presentación JSON y la contribución. Los accesos están sujetos a RLS/FORCE y proyecciones separadas: borrador del organizador, agenda pública sin identificadores de cuenta/contactos y agenda propia filtrada por persona.

La presentación se asigna a un autor declarado de una versión oficial, y la moderación a personas del directorio voluntario. No concede permisos de edición del trabajo, revisión o certificación. La ausencia de cuenta no impide publicar el nombre de quien presenta; la agenda personal exige una vinculación real. No se reconoce identidad por nombre.

## Consecuencias

Se permite revisar y publicar la agenda independientemente del CMS. Los cambios de perfil, autoría, versión o dictamen posteriores requieren una intervención explícita para actualizar la publicación. El programa es evidencia de planificación, nunca de asistencia. Inventario de salas, actividades sin trabajo, confirmaciones, exportaciones y asistencia quedan como ampliaciones. Antes de superar los límites del agregado deberá evaluarse su normalización y publicación por conjuntos.

Ver [recorrido, contratos y límites](../development/programa-cientifico.md).

El catálogo de espacios y la representación de actividades sin trabajos se incorporan posteriormente en [ADR-023](ADR-023-estructura-cientifica-espacios-y-formatos.md), que amplía esta decisión y conserva la separación entre programación, asistencia y certificación.
