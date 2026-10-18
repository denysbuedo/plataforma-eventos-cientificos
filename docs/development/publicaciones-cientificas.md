# Publicaciones científicas: resúmenes, memorias y archivo

La publicación editorial es independiente del dictamen científico, la programación, la asistencia y la certificación. Un trabajo aceptado no se vuelve público automáticamente. Este bloque incorpora selección por versión, autorización del responsable del envío, revisión editorial, prueba PDF, libro de resúmenes, memorias con archivos finales, metadatos, exportaciones y ediciones conservadas.

## Recorrido

1. El **organizador**, en **Publicaciones científicas**, elige Libro de resúmenes o Memorias y prepara títulos, institución editora, editores, créditos, comité y presentación en español e inglés. Elige idioma del PDF y agrupación por área o actividad del programa. Los nombres de editores son datos bibliográficos; no conceden permisos de cuenta.
2. Busca trabajos aceptados y selecciona una versión oficial. Las memorias requieren una versión final con PDF. La selección avisa al responsable del envío.
3. El **responsable del envío**, en **Mis publicaciones**, consulta la versión solicitada y su PDF. Puede autorizar el resumen, la autoría y las afiliaciones; y, para una versión final, el texto completo. Elige licencia y declara que dispone de derechos y aprobación de los coautores. La autorización es explícita, por trabajo y versión, y queda auditada. No se concede por omisión ni por el organizador en nombre del autor.
4. El organizador actualiza la selección, consulta el expediente y confirma la revisión editorial con una nota. Esa revisión se vincula también a la revisión vigente de la autorización. Un cambio de licencia o alcance exige revisar de nuevo.
5. Descarga y revisa la **prueba editorial PDF**. Confirma la publicación con una justificación. El servidor vuelve a comprobar versiones, estado científico, archivos, permisos y contenido antes de guardar una edición.
6. El portal ofrece la edición, las fichas de contribuciones, el libro PDF y, en memorias, los PDF individuales autorizados. El autor ve las ediciones que contienen sus trabajos desde Mis publicaciones.

La aceptación y la última versión oficial se comprueban en servidor. Si el trabajo está pendiente de correcciones, fue retirado, espera una versión final o cambió de versión, la selección deja de ser publicable. La autorización no se traslada silenciosamente de una versión a otra.

## Derechos y datos públicos

Las opciones son todos los derechos reservados con permiso expreso de publicación, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) y [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). La elección se registra por contribución. El sistema no decide por el investigador qué derechos puede conceder. Las licencias CC mantienen sus permisos sobre copias distribuidas conforme a sus condiciones, por lo que retirar la autorización para futuras ediciones no equivale a revocarlas.

La autorización editorial corresponde al responsable del envío. Los permisos compartidos para corregir o reenviar un trabajo no conceden automáticamente esta facultad. Se conserva la identidad del declarante, fecha, versión, licencia, alcance, motivo y texto/versionado de la declaración en un historial inmutable.

Las proyecciones públicas contienen título, resumen, palabras clave, idioma, autores en orden, afiliaciones, ORCID declarado/verificado cuando está disponible, versión, agrupación, licencia, paginación e integridad. No incluyen correos de autores, identificadores de sus cuentas, comentarios de revisión, respuestas privadas, notas editoriales internas ni identificadores de archivos privados. La autoría se toma de la versión oficial, no del perfil global posterior. La nota interna de selección no aparece en el historial del autor.

El PDF final se publica íntegro únicamente con autorización de texto completo. El declarante y el equipo deben revisar su contenido, incluyendo cualquier dato incluido dentro del propio archivo. El sistema no promete anonimizar o redactar un manuscrito autorizado.

## Libros y metadatos

- PDF con portada, edición, institución editora, editores, créditos, comité, presentación, índice de contribuciones con páginas e índice de autores.
- Contribuciones ordenadas por área o actividad, y por el orden editorial elegido dentro del grupo. Si se agrupa por actividad y el trabajo no tiene una actividad en el programa publicado, aparece en el grupo sin actividad asignada.
- Los resúmenes conservan el idioma original. La interfaz y los datos editoriales son bilingües; no se inventa una traducción científica del contenido.
- Las memorias incorporan el PDF de la versión final dentro del libro, ajustado proporcionalmente a la página para conservar el contenido y la paginación editorial. La descarga individual conserva exactamente los bytes autorizados y su SHA-256.
- Archivo JSON de metadatos SEP, CSL-JSON, BibTeX y RIS para el libro o una contribución. Los nombres se conservan completos; no se adivina la separación de apellidos de distintas tradiciones. CSL-JSON utiliza nombres literales. Referencia: [especificación CSL](https://docs.citationstyles.org/en/stable/specification.html).
- Fichas públicas con metadatos `citation_*`; la edición incorpora JSON-LD de libro y contribuciones. Un ORCID verificado en la versión se diferencia del declarado. No se publican credenciales de ORCID.

Cada edición y cada ficha tienen un identificador local y URL estable. El número de edición es independiente de la versión científica de cada trabajo. Estos identificadores **no son DOI ni ISBN** y no se presentan como tales. Registrar DOI/ISBN exige un acuerdo y proceso editorial institucional posterior; no se generan valores ficticios.

## Versiones, retirada y preservación

La edición conserva una instantánea y PDF propios; las memorias guardan copias independientes de sus archivos finales. Cambiar un perfil, permisos o borradores no reescribe una edición histórica. Las correcciones editoriales se publican como una nueva edición, con otro identificador y enlace. Los enlaces anteriores continúan identificando su edición.

El autor puede retirar su autorización para futuras ediciones. Si una edición ya publicada requiere retirada, el organizador debe hacerlo explícitamente con un motivo público. El enlace conserva una ficha de estado, sin contribuciones ni descargas; los archivos y exportaciones devuelven 410. La copia de preservación y su huella permanecen almacenadas e inmutables. Las copias descargadas anteriormente no se pueden eliminar a distancia.

La publicación utiliza una huella de la configuración, selección, versiones, autorizaciones y clasificación pertinentes. Una prueba obsoleta no puede publicarse. El evento y los trabajos se bloquean durante la publicación para coordinar cambios concurrentes. Las reservas de publicación se serializan por evento y tipo de libro; un identificador de solicitud permite recuperar una respuesta perdida sin crear otra edición. PDF, copias, registro editorial y notificaciones se confirman en la misma transacción.

## Operación y límites de esta entrega

Aplicar migraciones **0067–0071** antes de arrancar la API. Se añaden seis tablas con RLS forzada; el rol runtime sigue sin propiedad de tablas ni BYPASSRLS. La capacidad `publications-manage` corresponde a organizadores activos del evento. La lectura pública se habilita solo en los endpoints de publicación, con organización obtenida del dominio y comprobación de evento cuando corresponde. No se añade un acceso público a `work_files`.

La dirección pública debe pertenecer a un dominio activo de la misma institución/evento. Solo en desarrollo/pruebas se permite HTTP en localhost. La demo utiliza el mismo portal local y conserva `event` en los enlaces. La disponibilidad a largo plazo de un enlace también requiere mantener su dominio e infraestructura.

Límites: **50 contribuciones**, **50 MB** de fuentes y de PDF generado, **1000 páginas** por libro. La generación se ejecuta en un worker con tiempo y memoria acotados. Usa la fuente Noto Sans existente; los caracteres sin glifo disponible provocan un error explícito y no se sustituyen silenciosamente. Ampliar a otros sistemas de escritura requiere fuentes adicionales.

Los PDF reales deben superar el análisis antivirus ya exigido por el módulo de trabajos. Solo la autenticación de demostración admite archivos marcados `demo_unscanned`; las memorias y fichas los identifican como demostración. Esta excepción no habilita publicación real sin escaneo.

## API

Rutas autenticadas bajo `events/:eventId/editorial`:

- `GET/PUT :kind` y `GET :kind/candidates`, con `kind=abstracts|proceedings`.
- `PUT :kind/items/:workId`, `GET :kind/preview?proof=…`, `POST :kind/publish`.
- `GET mine`, `PUT permissions/:workId`, `GET history`.
- `GET releases/:id/pdf`, `POST releases/:id/withdraw`.

Públicas:

- `GET public/events/:eventId/publications`.
- `GET public/publications/:id`, `GET .../:id/pdf`.
- `GET .../:id/papers/:workId/pdf`.
- `GET .../:id/export/:format`, `format=json|csl|bib|ris`, con `paper` opcional.

Ver OpenAPI generado y [ADR-028](../adr/ADR-028-publicacion-editorial.md).

## Validación

`npm run test:editorial` prepara PostgreSQL temporal. Comprueba permisos y aislamiento, búsqueda sin acentos, selección, autorización del responsable, cambios de licencia y versión que invalidan pruebas, generación PDF, publicación idempotente, proyección pública, ORCID, archivos idénticos a los autorizados, exportaciones, inmutabilidad, retirada y preservación de ediciones.

El recorrido de navegador se comprobó con un evento aislado de datos sintéticos: configuración y selección por organizador, autorización por autor, revisión, prueba y publicación de un libro de resúmenes y unas memorias. Se comprobaron descargas/huellas, fichas y exportaciones públicas, consulta propia y pantallas de 1440/390 píxeles. También se publicó y retiró una edición de demostración: su ficha permanece visible y las descargas quedan bloqueadas, mientras las dos ediciones originales siguen disponibles. Se dejó otra selección pendiente de autorización para probar el recorrido. Los eventos originales no se modificaron.

Pendientes de ampliación: editor gráfico libre, corrección de estilo colaborativa, colas para grandes volúmenes, fuentes adicionales, DOI/ISBN institucionales y protocolos de cosecha/preservación externos. SMTP y los accesos reales mantienen sus pendientes de activación independientes.
