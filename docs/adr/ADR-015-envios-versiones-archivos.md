# ADR-015: envíos, versiones y manuscritos privados

Fecha: 2026-10-16. Estado: implementado; validación funcional completa y antivirus operativo pendientes.

## Decisión

Un trabajo separa el contenido editable privado de su última instantánea formal. Enviar exige confirmación, revisión vigente, convocatoria compatible, requisitos completos y archivo cuando el tipo lo exige. Cada envío conserva contenido, autores, reglas, PDF y número de versión inmutables. Guardar una corrección nunca cambia la versión que consulta el organizador.

El organizador del evento puede iniciar revisión administrativa, pedir correcciones con plazo, aceptar o rechazar; tras aceptar puede pedir una versión final. No puede resolver su propio trabajo. Estas decisiones no representan evaluación por pares: comités, conflictos, asignación de revisores y revisión ciega pertenecen al siguiente módulo.

Las respuestas a correcciones y versiones finales usan el plazo comunicado y la zona horaria conservada, aunque haya cerrado o se retire la convocatoria. La versión final conserva idioma, área y tipo aceptados. Cancelar, completar o archivar el evento bloquea cambios. El retiro conserva las versiones. Solo se puede quitar del listado un borrador nunca enviado; se conserva su registro y auditoría.

## Archivos y aislamiento

Se guardan PDF privados en PostgreSQL bytea, con nombre saneado, SHA-256, páginas y resultado del escaneo. Esta decisión permite que versión, archivo y auditoría se confirmen en la misma transacción sin introducir infraestructura externa. Los respaldos y su retención deben incluir esos datos. Una migración futura a almacenamiento de objetos deberá conservar los identificadores y la autorización; no se presentan URLs públicas.

Límites iniciales: 5 MiB por PDF, 50 MiB de archivos por autor/evento, 50 trabajos activos por autor/evento, 10 versiones por trabajo y hasta 500 páginas, además del máximo configurado por tipo. El historial se conserva; el detalle devuelve sus últimos 200 registros. Se eliminan archivos reemplazados que ninguna versión referencia.

RLS/FORCE separa propietarios y eventos. El permiso de organizador se comprueba antes de activar el contexto de recepción. Ese contexto ve solamente trabajos enviados y archivos referenciados por versiones; las correcciones privadas permanecen ocultas. Versiones e historial no conceden UPDATE/DELETE al runtime. Las descargas pasan por autenticación, comprobación de ámbito y gateway del servidor, como attachment y sin caché.

El PDF se analiza en un worker con límite de memoria y tiempo. Se rechazan cifrado, contenido activo detectado y archivos malformados. En autenticación real el escaneo ClamAV es obligatorio y falla cerrado si no está disponible. La excepción local development-token en development/test marca explícitamente demo_unscanned; no certifica seguridad del archivo. El protocolo se basa en [ClamD INSTREAM](https://docs.clamav.net/manual/Usage/ClamdProtocol.html) y el análisis en [PDFDocument de pdf-lib](https://pdf-lib.js.org/docs/api/classes/pdfdocument).

## Consecuencias

Las migraciones 0023–0027 añaden estados, versiones, archivos, historial, eliminación lógica y privilegios. Las instalaciones deben aplicarlas antes de arrancar la nueva API. El tamaño de la base crece con los manuscritos; las cuotas acotan este incremento inicial. No se han activado ClamAV, correo, clientes de identidad ni infraestructura de producción. Aceptar un trabajo no lo publica en el portal ni crea una entrada de programa o memorias.
