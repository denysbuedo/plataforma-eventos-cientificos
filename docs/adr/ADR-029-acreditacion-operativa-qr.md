# ADR-029: acreditación operativa con QR y permisos delegados

Estado: aceptado e implementado.

## Decisión

Ampliar los registros de asistencia existentes con una credencial QR sin datos personales y lectura local desde cámara o imagen. El QR localiza una inscripción y requiere confirmación explícita del equipo. No prueba por sí solo identidad, permanencia ni conexión virtual.

Mantener el código aleatorio y su hash como única credencial del servidor, con vínculo a la revisión de inscripción. Revalidar el código al confirmar, sin guardar el secreto en registros ni historial. La exclusión de duplicados se conserva por inscripción y destino, con bloqueo del evento para serializar entradas y correcciones.

Delegar acreditación mediante asignación por persona/evento, separada del rol de organizador. Exigir persona y membresía activas. El organizador gestiona el equipo y las correcciones; el acreditador registra presencia actual. Revocaciones y confirmaciones usan el mismo bloqueo de evento y revalidación. RLS forzada, motivos e historial inmutable conservan el aislamiento y la trazabilidad.

Ofrecer un resumen de presencias activas sobre inscripciones confirmadas, sin simular duración ni aforo. Las exportaciones quedan reservadas al organizador, son filtradas, acotadas y auditadas. La certificación continúa consultando los mismos registros y sus reglas vigentes.

Ver [recorrido, límites y validación](../development/acreditacion-asistencia.md).
