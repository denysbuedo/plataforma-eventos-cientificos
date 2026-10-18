# Acreditación y asistencia — operación con QR y delegación

Implementación integrada con registro manual, credencial QR, lectura desde cámara o imagen, equipo delegado, panel y exportación. La validación integral y las cámaras de dispositivos físicos siguen pendientes; se realizaron comprobaciones dirigidas de API y navegador.

## Organizador

Abrir **Acreditación y asistencia** dentro del evento. La pestaña **Registrar entradas** muestra inicialmente inscripciones confirmadas, indicando si tienen entrada al evento y cuántas sesiones registradas conservan. Buscar por nombre, estado de inscripción, presencia y destino (evento o sesión), y pulsar Buscar. El filtro de presencia se aplica al destino elegido; las columnas de entrada al evento y total de sesiones conservan su significado. También se puede pegar una credencial en Buscar por credencial; la consulta no registra presencia automáticamente.

1. Abrir a la persona con Ver y comprobar sus datos y modalidad.
2. Pulsar Registrar entrada. Elegir Entrada al evento y escribir el motivo o evidencia, de al menos diez caracteres. Dejar el momento vacío utiliza el actual.
3. Para una carga retrospectiva, elegir fecha y hora reales de presencia. El campo utiliza la zona horaria del dispositivo, indicada en su etiqueta; la API recibe el instante convertido con zona horaria. La fecha debe estar dentro del evento y no puede ser futura.
4. Después de registrar la entrada al evento, elegir Entrada a una sesión. Solo se ofrecen sesiones del programa publicado compatibles con la modalidad de inscripción. Se exige la fecha y horario de la sesión; no se atribuye asistencia por ser presentador o moderador.
5. Corregir registro permite anular, restaurar o rectificar el momento observado. Requiere motivo y conserva el historial. Para anular la entrada al evento se anulan primero los registros activos de sesiones. La entrada al evento no puede quedar después de una sesión activa.

El evento debe estar publicado y no completado/cancelado para nuevas entradas. Debe tener ambas fechas configuradas. Las correcciones posteriores son posibles en un evento completado; no en uno archivado o cancelado. Las fechas y el horario conservados en cada registro son los que se validan al corregirlo, aunque el programa cambie o se retire después.

La cancelación posterior de una inscripción conserva la evidencia histórica, pero impide usar la credencial o registrar más presencia. Restaurar una presencia anulada requiere inscripción confirmada.

## Participante

Abrir **Mi acreditación** en Mi espacio. Con una inscripción confirmada, generar la credencial y guardar su código descargable. El código y el QR solo se muestran al emitirlos. El QR contiene una versión de formato, el identificador del evento y un código aleatorio de 192 bits, sin nombre, correo ni datos de perfil. Se puede guardar el PNG del QR, imprimir la credencial con nombre/fechas del evento o conservar el código de texto. Solo se guarda el hash en servidor; una consulta posterior no recupera el código ni el QR. Puede renovarse si se pierde y revocarse si se comparte por error. La renovación invalida inmediatamente el anterior.

Entregar el código al equipo permite localizar la inscripción; no equivale a entrada automática. La pantalla muestra los registros e historial que el equipo incorpore, incluido el motivo de las correcciones. Actualizar consulta los cambios del organizador.

Tener credencial o aparecer en el programa no acredita asistencia ni concede un certificado. Las reglas de emisión consultan los mismos registros activos de asistencia, tanto manuales como mediante QR.

## Lectura y confirmación

Elegir el **Punto de control** antes de leer: entrada al evento o una sesión publicada. Pulsar **Abrir cámara**, permitir su uso y enfocar el QR. También se puede elegir **Leer imagen QR** (procesamiento local, máximo 10 MB) o pegar el código de 48 caracteres. La cámara usa HTTPS, o localhost en desarrollo, y se detiene al encontrar una credencial válida, pulsar Detener, cambiar de vista o abandonar el módulo. En un teléfono se requiere una dirección HTTPS accesible desde ese teléfono: `127.0.0.1` identifica el propio dispositivo.

El lector comprueba el formato `SEP1:<evento>:<código>` sin abrir enlaces del QR. La API comprueba evento, hash, estado y revisión de inscripción. Tras localizar a la persona se abre una confirmación con destino y evidencia; **Guardar registro** registra la presencia. Un acceso repetido muestra la presencia existente, sin insertar otra ni modificar su hora. Una presencia anulada requiere corrección por el organizador.

La confirmación envía nuevamente la credencial: si se renovó, revocó o cambió la inscripción mientras se consultaba, el registro se rechaza. El código no se copia al registro ni al historial. Se conserva el método `manual` o `qr` (QR/código); las evidencias antiguas sin método se muestran como manuales. La lectura no comprueba por sí misma la identidad física del portador y exige la confirmación del equipo.

La implementación del lector sigue la [API oficial de ZXing Browser](https://github.com/zxing-js/browser), con carga local bajo demanda; no se usan CDN ni se suben imágenes a servicios externos.

## Equipo de acreditación

El organizador abre **Equipo de acreditación**, elige una persona con membresía activa en ese evento y habilita o revoca el acceso con motivo de al menos diez caracteres. Se conserva revisión optimista, actor, fecha y un historial inmutable. La interfaz muestra los últimos 100 cambios; el historial completo permanece en la base de datos. El selector admite hasta 1000 miembros; si se supera el límite, devuelve un error explícito.

El acreditador puede consultar el listado mínimo de participantes, localizar credenciales, confirmar entradas actuales y consultar el resumen. No puede decidir inscripciones, consultar manuscritos o evaluaciones, asignar otros acreditadores, exportar listados, anular registros ni cargar fechas retrospectivas. Una membresía desactivada o una delegación revocada elimina el acceso. Las confirmaciones revalidan la delegación después de bloquear el evento para coordinar revocaciones concurrentes. El organizador mantiene la gestión y las correcciones.

**Acreditación del evento** aparece en Mi espacio cuando la sesión tiene esa capacidad. El acceso inicial de un acreditador sin permisos administrativos abre directamente su módulo; no recibe capacidades de organizador.

## Panel y exportación

**Resumen de asistencia** presenta inscripciones confirmadas, participantes con entrada al evento, pendientes y entradas por sesión publicada. Cuenta inscripciones actualmente confirmadas y presencias activas; las cancelaciones y anulaciones no inflan los totales. Los filtros del listado no alteran este resumen global. **Actualizar** consulta nuevos valores; no se anuncia actualización en tiempo real ni duración de participación.

El organizador puede **Exportar listado CSV** en Registrar entradas. Exporta el resultado de la última búsqueda aplicada, para evento o sesión, incluyendo nombre/categoría de inscripción, estado, modalidad, destino, presencia, hora UTC, zona horaria y método. No incluye correos, códigos de credencial ni notas de corrección. Conserva las filas anuladas como tales y distingue las no registradas. Se escapan comillas/saltos y los valores que podrían interpretarse como fórmulas; UTF-8 con BOM. Límite de 5000 filas y 8 MB, con rechazo explícito al superarlo, sin truncado silencioso. La descarga queda auditada.

## API

- `GET events/:eventId/attendance`: listado paginado, opciones de sesiones, capacidades y resumen; organizador o acreditador activo. `presence=any|present|missing`, `sessionId` opcional.
- `GET .../attendance/mine`: credencial (solo metadatos), registros e historial propios.
- `POST .../attendance/credential` y `POST .../attendance/credential/revoke`: emisión/renovación y revocación propias, con revisión optimista.
- `POST .../attendance/lookup`: localizar inscripción por código; organizador o acreditador.
- `GET .../attendance/registrations/:id`: detalle mínimo para acreditar.
- `POST .../attendance/registrations/:id/check-in`: registro con motivo y `credentialCode` opcional, validado de nuevo al confirmar.
- `POST .../attendance/records/:id/correction`: anular/restaurar/corregir con revisión y motivo.

- `GET .../attendance/team`, `PUT .../attendance/team/:personId`: equipo e historial; solo organizador.
- `GET .../attendance/report`: CSV dentro de respuesta JSON con nombre/contenido/total; solo organizador.

Nunca se devuelve el hash del código ni el código en consultas posteriores. No hay endpoint público de lectura de credenciales. Migraciones `0059_heavy_patriot.sql`, `0060_married_rhino.sql` y **`0072_confused_nitro.sql`** (revisión de inscripción y delegación operativa con RLS forzada); ver [ADR-025](../adr/ADR-025-acreditacion-y-asistencia.md).

## Validación y ampliaciones

`npm run test:attendance` usa PostgreSQL temporal y comprueba delegación, aislamiento, revocación, credenciales renovadas, registros simultáneos, restricciones de fecha/corrección, dependencia evento/sesión, panel, CSV, historial inmutable y elegibilidad de certificados antes/después de anular una presencia. Se comprobó el recorrido visual con datos sintéticos separados: equipo, credencial, descarga PNG, decodificación real de imagen QR, confirmación delegada, duplicado, QR ajeno, CSV y pantallas de 1440/390 píxeles. La cámara se comprobó con una fuente de vídeo simulada en Chromium, incluyendo la liberación del dispositivo; no equivale a una prueba en un teléfono físico.

Pendientes de ampliación: prueba integral con el usuario y dispositivos físicos, salida/duración, sesiones con reserva o control de aforo propio, funcionamiento sin conexión y evidencia automática de conexión virtual. Las reglas iniciales y la emisión están implementadas en el [módulo de certificados](certificados.md), con validación funcional pendiente.
