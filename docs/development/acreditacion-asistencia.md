# Acreditación y asistencia — primera entrega manual

Implementación integrada; la prueba funcional completa queda pendiente por indicación del usuario. Se realiza compilación y análisis estático antes de publicar la demo.

## Organizador

Abrir **Acreditación y asistencia** dentro del evento. Se muestran inicialmente inscripciones confirmadas, indicando si tienen entrada al evento y cuántas sesiones registradas conservan. Buscar por nombre o cambiar el estado y pulsar Buscar. También se puede pegar una credencial en Buscar por credencial; la consulta no registra presencia automáticamente.

1. Abrir a la persona con Ver y comprobar sus datos y modalidad.
2. Pulsar Registrar entrada. Elegir Entrada al evento y escribir el motivo o evidencia, de al menos diez caracteres. Dejar el momento vacío utiliza el actual.
3. Para una carga retrospectiva, elegir fecha y hora reales de presencia. El campo utiliza la zona horaria del dispositivo, indicada en su etiqueta; la API recibe el instante convertido con zona horaria. La fecha debe estar dentro del evento y no puede ser futura.
4. Después de registrar la entrada al evento, elegir Entrada a una sesión. Solo se ofrecen sesiones del programa publicado compatibles con la modalidad de inscripción. Se exige la fecha y horario de la sesión; no se atribuye asistencia por ser presentador o moderador.
5. Corregir registro permite anular, restaurar o rectificar el momento observado. Requiere motivo y conserva el historial. Para anular la entrada al evento se anulan primero los registros activos de sesiones. La entrada al evento no puede quedar después de una sesión activa.

El evento debe estar publicado y no completado/cancelado para nuevas entradas. Debe tener ambas fechas configuradas. Las correcciones posteriores son posibles en un evento completado; no en uno archivado o cancelado. Las fechas y el horario conservados en cada registro son los que se validan al corregirlo, aunque el programa cambie o se retire después.

La cancelación posterior de una inscripción conserva la evidencia histórica, pero impide usar la credencial o registrar más presencia. Restaurar una presencia anulada requiere inscripción confirmada.

## Participante

Abrir **Mi acreditación** en Mi espacio. Con una inscripción confirmada, generar la credencial y guardar su código descargable. El código solo se muestra al emitirlo. Puede renovarse si se pierde y revocarse si se comparte por error. La renovación invalida inmediatamente el anterior.

Entregar el código al equipo permite localizar la inscripción; no equivale a entrada automática. La pantalla muestra los registros e historial que el equipo incorpore, incluido el motivo de las correcciones. Actualizar consulta los cambios del organizador.

No se muestra un QR ficticio: esta entrega utiliza un código y búsqueda manual. Tampoco se anuncia un certificado por estar inscrito, tener credencial o aparecer en el programa.

## API

- `GET events/:eventId/attendance`: listado paginado y opciones de sesiones publicadas; organizador.
- `GET .../attendance/mine`: credencial (solo metadatos), registros e historial propios.
- `POST .../attendance/credential` y `POST .../attendance/credential/revoke`: emisión/renovación y revocación propias, con revisión optimista.
- `POST .../attendance/lookup`: localizar inscripción por código; organizador.
- `GET .../attendance/registrations/:id`: detalle mínimo para acreditar.
- `POST .../attendance/registrations/:id/check-in`: registro manual, con motivo.
- `POST .../attendance/records/:id/correction`: anular/restaurar/corregir con revisión y motivo.

Nunca se devuelve el hash del código ni el código en consultas posteriores. No hay endpoint público de lectura de credenciales. Migraciones `0059_heavy_patriot.sql` y `0060_married_rhino.sql` (vinculación de la credencial a la revisión de inscripción); ver [ADR-025](../adr/ADR-025-acreditacion-y-asistencia.md).

## Pendientes

Prueba funcional completa con el usuario. Escaneo QR, permisos delegados de acreditador, salida/duración, sesiones con reserva o control de aforo propio, acreditación presencial automatizada y evidencia de conexión virtual. Las reglas iniciales y la emisión están implementadas en el [módulo de certificados](certificados.md), con validación funcional pendiente.
