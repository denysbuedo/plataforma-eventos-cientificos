# Certificados

Módulo implementado; prueba funcional completa pendiente según indicación del usuario.

## Organizador

Abrir **Certificados → Plantillas → Nueva plantilla**. Definir nombre interno, tipo, títulos, texto y participación en ambos idiomas. La opción de exigir la fecha final está activada inicialmente: no se emite antes de esa fecha si permanece marcada. Definir la dirección canónica del portal público (solo origen, sin rutas, consulta ni credenciales).

El diseño PDF es A4 horizontal. El color se configura; logotipo y hasta dos firmas son opcionales, PNG/JPEG de máximo 64 KB y 2000 × 2000 píxeles cada imagen. Los nombres/cargos de firmantes se imprimen debajo. Las firmas son imágenes autorizadas por el organizador, no firmas digitales criptográficas.

El texto admite `{{name}}`, `{{event}}`, `{{participation}}`, `{{work}}` y `{{dates}}`. Guardar comprueba ambas versiones del documento con datos de muestra. Vista previa descarga un PDF marcado sin validez y no emite certificados. Si una combinación de textos supera el espacio disponible o contiene caracteres no cubiertos por la fuente, se rechaza, sin recortar silenciosamente la información.

En **Emitir certificados**, seleccionar plantilla, buscar candidatos y revisar requisitos. El sistema ofrece las personas que constan en los registros del evento; no crea cuentas ni certifica personas anónimas. La asistencia necesita inscripción confirmada y entrada al evento. La presentación necesita ser el presentador publicado y tener presencia registrada en su sesión; el organizador confirma además que presentó. Una revisión enviada habilita un candidato revisor; la organización exige asignación vigente. Otra participación requiere justificación manual de su actividad.

Seleccionar hasta veinte participaciones, elegir idioma, escribir motivo/evidencia de al menos diez caracteres y confirmar los datos. El lote es atómico. Si una evidencia o plantilla cambia, actualizar candidatos; no se emite una parte silenciosamente. Se impide duplicar certificados vigentes de una misma plantilla/persona/trabajo.

En **Emitidos**, descargar, verificar o abrir el historial. Revocar exige motivo y conserva el código público mostrando la revocación. Para sustituir un documento, revocarlo y volver a emitir desde los candidatos. Una plantilla deshabilitada conserva sus documentos y bloquea futuras emisiones.

## Participante y consulta pública

**Mi espacio → Mis certificados** muestra documentos reales del evento: estado, participación, trabajo, descarga, verificación e historial con los motivos comunicados. No se necesita tener trabajos enviados para recibir uno de asistencia u otra actividad acreditada.

El QR del PDF abre la consulta pública. También se puede introducir el código desde Verificar certificado, al pie del portal. La página muestra el estado actual y datos básicos para compararlos con el documento. Seleccionar el PDF permite comprobar su SHA-256 localmente: el archivo no se sube al servidor. Un archivo revocado puede coincidir con el original; esa coincidencia no cambia su estado revocado.

No se publica un listado de certificados ni se descarga el PDF sin autenticación. Conservar el dominio canónico: los enlaces emitidos no se reescriben al cambiar la configuración. En demo, `http://127.0.0.1:6788` solo es accesible desde este equipo.

## API y operación

- `GET events/:eventId/certificates/templates`, `GET/PUT .../templates/:id`, `GET .../templates/:id/preview`.
- `POST .../candidates`, `POST .../issue`, `GET .../certificates`, `GET .../certificates/:id`, `GET .../:id/pdf`, `POST .../:id/revoke`.
- Propios: `GET .../certificates/mine`, `GET .../mine/:id`, `GET .../mine/:id/pdf`.
- Público: `GET public/certificates/:code`; la web lo consulta desde el dominio institucional correspondiente.

Emisión y plantilla con revisión optimista; PDF y evidencia inmutables. Revocación siempre trazable. Migración `0061_polite_edwin_jarvis.sql`, [ADR-026](../adr/ADR-026-certificados-verificables.md) y OpenAPI generado.

El despliegue debe conservar `apps/api/assets/fonts` junto a `dist`; se incrusta Noto Sans con licencia OFL. El generador utiliza [pdf-lib](https://github.com/Hopding/pdf-lib) y [node-qrcode](https://github.com/soldair/node-qrcode). No se necesitan servicios externos para generar o descargar el documento.

## Validación y pendientes

Compilación, análisis estático y generación técnica de una vista previa sin emisión real. La prueba funcional de emisión, lote, revocación, aislamiento y descarga queda pendiente con el usuario. No se han emitido documentos de prueba a participantes reales.

Quedan para ampliaciones: editor gráfico libre, firma digital institucional, emisión en segundo plano/volúmenes superiores a los límites documentados y envío por correo. Las reglas iniciales usan asistencia manual y no calculan porcentaje de permanencia ni asistencia virtual automática.
