# ADR-025: acreditación y evidencias de asistencia

Estado: aceptada para la primera entrega de acreditación manual.

## Decisión

Separar credencial de acceso, inscripción, presencia y certificación. Solo una inscripción confirmada puede generar una credencial o recibir una nueva presencia. Esta entrega la opera el organizador mediante la capacidad independiente `attendance-manage`; no crea un rol global ni permite al participante marcar su propia asistencia.

Una credencial es un código aleatorio de 192 bits, sin identidad embebida, asociado a persona, inscripción y evento. Se entrega solo al generarlo; se persiste únicamente su SHA-256. Renovarlo invalida el anterior. Se vincula también a la revisión de la inscripción: cancelar, reabrir o volver a solicitar no reactiva un código anterior. Una inscripción cancelada o rechazada invalida su uso aunque el registro de la credencial siga conservado. La búsqueda no es pública: requiere organizador, contexto de evento y código en cuerpo POST, sin incorporarlo a URL.

Se mantiene un registro por inscripción y destino: evento o sesión publicada. Se guarda una copia del nombre, fechas, horario, modalidad y zona horaria de ese destino. Para sesiones, la modalidad debe ser compatible con la inscripción, debe existir una entrada al evento y esta no puede ser posterior a la presencia en la sesión. La participación en el programa no produce presencia automática. La confirmación de inscripción tampoco.

El momento observado no puede ser futuro y debe estar dentro de las fechas del evento. Una sesión exige además su fecha y horario. Una carga posterior admite timestamp explícito con zona horaria y motivo/evidencia obligatorio. No se confunde el momento observado con el de captura. Sin fechas de evento completas no se acredita asistencia.

Las correcciones conservan la copia original y agregan historial con actor, motivo, estado y momento observado. Revisión optimista y bloqueo del evento serializan escrituras con cambios de inscripción y programa. Para anular la entrada al evento se anulan primero las presencias de sus sesiones. Un evento completado admite correcciones históricas motivadas, pero no nuevas entradas; archivado o cancelado bloquea la edición. Restaurar presencia exige inscripción confirmada.

Tres tablas nuevas tienen RLS/FORCE. Cada persona consulta únicamente sus registros; el organizador accede a la proyección mínima de inscripciones sin activar acceso a revisión científica. Historial de inserción y contexto de registro inmutable en base de datos. No se borran evidencias al cancelar una inscripción.

## Límites de esta entrega

Registro y búsqueda manual, código descargable como texto, consulta propia y correcciones. No hay escaneo QR/cámara, kiosco, operación sin conexión ni delegación a acreditadores. Son ampliaciones pendientes, no controles simulados. No se mide duración, salida, porcentaje de sesiones ni conexión virtual. La presencia administrativa registrada no emite un certificado; las reglas y evidencias de certificación son otro paquete.

La ampliación con credencial QR, lectura de cámara/imagen, equipo delegado, panel y exportación se documenta en [ADR-029](ADR-029-acreditacion-operativa-qr.md).
