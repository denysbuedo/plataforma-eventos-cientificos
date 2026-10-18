# Patrocinadores, colaboradores y compromisos

Bloque operativo implementado para organizadores del evento. El catálogo es propio de cada evento: actualizar una institución no modifica otro evento ni sus publicaciones. No se crean cuentas de usuario a partir de las personas de contacto.

## Catálogo y contactos

Abrir **Patrocinadores y colaboradores → Instituciones**. El listado permite buscar por nombre en cualquiera de los idiomas o código de país, sin acentos, y pagina de diez en diez. **Ver** abre un detalle; **Editar** abre el formulario. Los formularios se mantienen cerrados por defecto y protegen los cambios al cancelar o abandonar el módulo.

**Añadir institución** recoge nombre oficial en español e inglés (pueden coincidir), país, categoría, enlace HTTPS, descripciones públicas y logotipo opcional PNG/JPEG de hasta 64 KB y 2000 × 2000 píxeles. La API valida el contenido de la imagen; no acepta SVG ni descarga imágenes remotas. El reconocimiento puede publicarse solo con texto. No se permiten duplicados de nombre normalizado en español o inglés dentro del mismo país/evento, incluyendo registros archivados.

Se pueden incorporar hasta cinco contactos privados con nombre, cargo, correo y teléfono internacional, además de notas internas. Se exige motivo al guardar. La institución puede archivarse conservando sus compromisos e historial. Los contactos no reciben correos automáticos ni acceso a SEP por estar anotados en el catálogo.

## Categorías y presentación

**Configuración** define el título y la introducción pública en ambos idiomas, así como hasta veinte categorías con nombres bilingües, orden y estado. Se ofrecen inicialmente Patrocinadores, Auspiciadores y Colaboradores, sin imponer jerarquías comerciales. Se pueden añadir niveles u otras categorías según el evento.

Una categoría utilizada no puede eliminarse; admite cambio de nombre o desactivación. Las instituciones seleccionadas para publicación deben tener una categoría activa. Los cambios se conservan como borrador y no alteran lo ya publicado.

## Aportes y compromisos privados

**Aportes y compromisos** registra entregables económicos, en especie, servicios u otros. Cada compromiso pertenece a una institución del mismo evento y puede tener responsable, fecha prevista, descripción, notas y referencia de cumplimiento. La asignación de responsable es organizativa y no concede acceso a los datos privados: la gestión permanece con los organizadores.

Los responsables se eligen entre personas y membresías activas del evento; no son nombres libres. Si una membresía deja de estar activa se conserva la atribución histórica y puede reasignarse. Una institución archivada no admite nuevos compromisos, pero sus registros anteriores pueden seguirse hasta el cierre.

Estados y transiciones:

| Estado actual | Destinos permitidos |
|---|---|
| Propuesto | Confirmado, Cancelado |
| Confirmado | Propuesto, En ejecución, Cumplido, Cancelado |
| En ejecución | Confirmado, Cumplido, Cancelado |
| Cumplido | Confirmado, para reapertura motivada |
| Cancelado | Propuesto, para recuperación motivada |

Un registro nuevo comienza Propuesto o Confirmado. Marcar **Cumplido** exige una evidencia o referencia de al menos diez caracteres. Todos los cambios requieren motivo y quedan auditados; se conserva su autor y revisión. La referencia es texto interno, no un archivo firmado ni una verificación bancaria automática.

Los aportes económicos requieren importe positivo, sin separadores de miles, hasta doce cifras enteras y cuatro decimales, y un código de moneda admitido por el entorno. El valor se conserva como texto decimal y las sumas se calculan con enteros escalados; no se mezclan ni convierten monedas. Los demás tipos describen el entregable sin inventar una valoración monetaria. Este registro de compromisos es independiente del futuro módulo de cobros y conciliación.

## Seguimiento

El resumen presenta instituciones activas, compromisos abiertos, vencidos y cumplidos. Las fechas se comparan con el día del evento en su zona horaria. Los compromisos sin fecha siguen abiertos y los cumplidos/cancelados no aparecen como vencidos.

Se ofrecen los diez próximos pendientes, con responsable y enlace de consulta. Los importes por moneda incluyen Confirmados, En ejecución y Cumplidos; los Propuestos y Cancelados se excluyen. Se muestra aparte lo marcado como cumplido, según la evidencia registrada. **Actualizar** vuelve a consultar el servidor; no se promete actualización en tiempo real.

## Publicación en el portal

1. Seleccionar explícitamente las instituciones que aparecerán y confirmar la autorización de su nombre, descripción, logotipo y enlace. Tener un compromiso no selecciona automáticamente a una institución ni autoriza su publicación.
2. Abrir **Publicación en el portal → Preparar vista previa**. Se exige al menos una institución, activa, autorizada y con categoría activa.
3. Revisar el contenido que se hará público. Se usa el mismo componente de presentación que en el portal.
4. Confirmar la revisión, indicar motivo y publicar. El evento y su sitio deben estar publicados, y el evento no puede estar cancelado/archivado.

La API vuelve a comprobar una huella de configuración, selección y revisiones. Una vista previa obsoleta no se publica. Se bloquea el evento para coordinar cambios concurrentes; el identificador de solicitud hace idempotente el reintento de una publicación. Una nueva versión sustituye la vigente, pero conserva íntegra la anterior.

El portal muestra exclusivamente título/introducción, categorías utilizadas y datos públicos de reconocimiento de las instituciones, con logotipos y enlaces. No recibe contactos, correos, teléfonos, notas, importes, responsables, compromisos ni evidencias. Los enlaces se abren en otra pestaña con nombre accesible y sin permisos sobre la ventana de origen.

Editar o archivar una institución, cambiar sus permisos o renombrar categorías no reescribe una publicación existente. Para retirarla de inmediato se utiliza **Retirar del portal**, con motivo. Se conserva la versión privada y el historial, y desaparece la sección del portal. Esta retirada se permite también en eventos cancelados o archivados. Una nueva publicación necesita revisar otra vez la vista previa.

## Historial y límites

Se conserva actor, acción, recurso, revisión, motivo y fecha. El historial es inmutable en PostgreSQL, con filtro por institución/compromiso y páginas de cincuenta. Las versiones públicas también son inmutables: solo se permite su retirada, sin alterar el contenido conservado. La pantalla ofrece las últimas cincuenta versiones publicadas; las anteriores permanecen en la base de datos.

Límites iniciales: cien instituciones y quinientos compromisos por evento; cinco contactos por institución; treinta instituciones por publicación; veinte categorías; mil miembros en el selector de responsables. Los excesos provocan rechazo explícito. No se borran silenciosamente datos para reducir el volumen.

## API y despliegue

Aplicar la migración **0073_conscious_stranger.sql** antes de arrancar la API. Cinco tablas nuevas tienen RLS forzada; el runtime no es propietario ni tiene BYPASSRLS. La capacidad `sponsorship-manage` exige organizador activo del evento. Los permisos de acreditador, autor o administrador institucional sin asignación de organizador no la conceden.

Rutas privadas bajo `events/:eventId/sponsorship`:

- `GET` espacio de trabajo; `PUT settings` configuración.
- `GET/PUT institutions/:id`; `PUT commitments/:id`.
- `GET preview`; `POST publish`.
- `GET releases/:id`; `POST releases/:id/withdraw`.
- `GET history?resourceId=…&offset=…`.

Ruta pública: `GET public/events/:eventId/sponsorship` devuelve `{ publication: null }` sin publicación vigente, o una proyección explícita de su versión activa. No se habilita lectura pública del catálogo privado. OpenAPI describe contratos y respuestas.

## Validación

`npm run test:sponsorship` prepara una base PostgreSQL temporal y aplica migraciones dos veces. Comprueba permisos, aislamiento, duplicados, imágenes/enlaces, autorizaciones, importes/fechas/responsables, estados/evidencia, revisiones y vistas previas obsoletas, concurrencia/idempotencia, privacidad pública, inmutabilidad y retirada incluso tras cancelar el evento.

El recorrido de navegador se comprobó en un evento aislado y sintético: configuración, institución, logotipo, contacto, protección de cambios, compromiso económico, servicio cumplido con evidencia, importes separados por moneda, vista previa, tres publicaciones y retirada, historial, español/inglés y pantallas de 1440/390 píxeles. Los eventos y datos anteriores no se modificaron.

Ampliaciones posteriores: catálogo institucional compartido con reglas propias de mantenimiento/reutilización, documentos de acuerdos, recordatorios automáticos, portal de colaboradores y cobros/conciliación. No se anuncian como disponibles en este bloque.
