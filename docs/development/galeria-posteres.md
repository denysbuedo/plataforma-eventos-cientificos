# Galería científica de pósteres

Estado: implementada; datos sintéticos y recorrido dirigido en escritorio/móvil, español e inglés. Validación funcional integral pendiente.

## Flujo

1. El trabajo debe tener dictamen aceptado y versión oficial final con PDF válido. La elegibilidad se comprueba en servidor, incluidas las condiciones del análisis de archivos.
2. El responsable del envío entra en **Mi espacio → Mis pósteres**, consulta el PDF y autoriza públicamente el documento y sus metadatos, selecciona licencia y confirma derechos y consentimiento de los coautores. Puede aportar miniatura PNG/JPEG de hasta 64 KB y 2000 × 2000 píxeles, con texto alternativo.
3. El organizador entra en **Galería de pósteres**, revisa la autorización, aprueba el documento y publica con motivo. Una autorización o versión nueva invalida la aprobación anterior.
4. El portal ofrece `/es/posters` y `/en/posters`, búsqueda por título, autor, institución, país o palabras clave, filtros por área e idioma, ficha, afiliaciones, ORCID, licencia y visor PDF multipágina con apertura/descarga.
5. Revocar la autorización retira inmediatamente las publicaciones activas de ese trabajo. El organizador también puede retirar con motivo. La dirección pública conserva una ficha de retirada; los archivos dejan de entregarse y responden 410.

Aceptar un trabajo no lo publica ni concede permiso editorial. La exposición y las memorias tienen consentimientos independientes. El organizador determina si el documento aprobado corresponde a la exposición de pósteres; no se infiere ese formato del nombre libre del tipo de contribución.

## Conservación y privacidad

Cada publicación copia el PDF y congela los metadatos autorizados y su hash SHA-256. Una modificación posterior del perfil o trabajo no reescribe la publicación. No se exponen correo, identificadores de cuentas, comentarios de revisores ni notas organizativas. El historial y la copia publicada son inmutables; se retira una publicación, no se borra su evidencia.

Ocultar el botón de descarga no impide al navegador guardar un PDF mostrado públicamente. Retirar una publicación tampoco recupera copias ya descargadas. No hay DRM, publicación automática, DOI inventado ni verificación de ORCID por simple declaración.

Límites iniciales: doscientos candidatos y cincuenta publicaciones activas por evento, PDF con límites del módulo de manuscritos. Si se superan, la operación falla explícitamente y deberá ampliarse con paginación. La demo permite PDF sintético marcado como no analizado; producción mantiene el requisito de análisis.

API privada: `/events/:eventId/gallery`; pública: `/public/events/:eventId/gallery`. Ver [OpenAPI](../api/openapi.json).
