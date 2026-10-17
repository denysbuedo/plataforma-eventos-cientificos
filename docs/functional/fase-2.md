# Fase 2: ciclo científico

## Primer incremento: convocatoria

Código implementado para editar y publicar convocatorias científicas por evento. No implica cierre de los pendientes de Fase 1 ni de validación funcional.

Disponible en **Convocatoria científica**:

- Título e instrucciones en español e inglés.
- Áreas temáticas y tipos de contribución con identificadores estables.
- Requisitos por tipo: palabras del resumen, palabras clave y manuscrito/páginas.
- Fechas de apertura y cierre, como días completos en la zona horaria del evento.
- Guardado privado, publicación explícita y retirada conservando borrador.
- Revisión para evitar sobrescrituras, permisos por evento, RLS/FORCE y auditoría.
- Portal bilingüe con versión publicada y periodo anunciado, sin formulario de envío.

## Uso de la demo

1. Entrar como Organizador y seleccionar Biosfera; abrir **Convocatoria científica**. Un administrador institucional debe asignarse como organizador desde Equipo si quiere editar otro evento.
2. Completar ambos títulos e instrucciones. Añadir al menos un área y un tipo con nombres en ambos idiomas.
3. Configurar los requisitos de cada tipo y ambos plazos.
4. Pulsar **Guardar borrador**. Los visitantes continúan viendo la publicación anterior o el texto editorial del CMS.
5. Pulsar **Publicar convocatoria**. Si el sitio aún no está publicado, publicarlo primero desde Contenido o Datos del evento.
6. Abrir **Ver sitio**, sección Convocatoria. **Retirar publicación** quita la versión estructurada y conserva el borrador; el portal vuelve al texto editorial del CMS.

Los cambios de esta sección se publican con su propio botón, independientemente de la publicación del sitio. Al cambiar la zona horaria, volver a publicar la convocatoria para actualizar sus plazos. Cancelar o finalizar el evento oculta la convocatoria estructurada; al volver a planificación una publicación conservada puede reaparecer.

## API

| Método | Ruta bajo /api/v1 | Operación |
|---|---|---|
| GET | /events/:eventId/call | Borrador y metadatos de publicación; lector autorizado |
| PUT | /events/:eventId/call | Guarda content y revision; organizador |
| POST | /events/:eventId/call/publish | Publica revision guardada; organizador |
| POST | /events/:eventId/call/withdraw | Retira publishedRevision vigente enviada como revision; organizador |
| GET | /public/call | Instantánea pública del evento resuelto por Host |

Aplicar migraciones 0017 y 0018 antes de arrancar la nueva API. Ver [OpenAPI](../api/openapi.json) y [ADR-012](../adr/ADR-012-convocatoria-cientifica.md).

## Módulo de trabajos implementado

Mis trabajos ya incorpora acceso independiente del autor, borradores privados, selección de área/tipo/idioma, resumen y palabras clave, revisión optimista y conservación de las reglas originales. También permite declarar autores ordenados, varias afiliaciones por autor con institución y país, y un autor de correspondencia. Declarar un coautor no crea cuentas ni concede permisos. El remitente puede invitar al autor de correspondencia a compartir correcciones y reenvío; el acceso exige aceptación y puede revocarse. La autoría y el retiro permanecen bajo control del remitente. Compilación y comprobaciones dirigidas no sustituyen la validación funcional pendiente. Ver [guía](../development/mis-trabajos.md).

También están implementados el envío formal, versiones inmutables, historial, reconciliación explícita de reglas, PDF privado, validación y cliente de escaneo ClamAV. La bandeja del organizador permite dictámenes, correcciones con plazo y solicitud/recepción de versión final. Incluye retiro y eliminación lógica de borradores nunca enviados. Ver [recorrido completo](../development/trabajos-envios.md) y [ADR-015](../adr/ADR-015-envios-versiones-archivos.md).

La conservación de reglas, versiones y archivos está implementada y se comprobó de forma dirigida. La recepción real requiere completar validación funcional, activar identidad y disponer de ClamAV operativo. La demo admite archivos marcados explícitamente sin escaneo.

## Próximos incrementos

1. Programa científico, sesiones y ponentes.
2. Publicación de trabajos aceptados y memorias.
3. Ampliaciones de revisión: doble ciego, debate, réplica y asignación automática.

## Validación pendiente

La compilación completa y el análisis estático pasaron. En la demo se aplicaron las migraciones y se comprobó guardar/publicar/consultar/retirar mediante los servicios con sep_runtime dentro de una transacción revertida, preservando los datos originales. La API y las pantallas administrativas y públicas respondieron en español e inglés. No se ejecutó una batería completa ni se validaron las interacciones por navegador.

Las pruebas completas siguen aplazadas por el propietario. Al retomarlas cubrir: roles y revocación, IDs ajenos, catálogos inválidos o repetidos, límites de requisitos, fechas reales y rangos, borrador no filtrado, publicación incompleta, conflictos de revisión, retirada concurrente, cambios de zona horaria, cancelación/finalización y aislamiento del portal. RedUniv y Google siguen pendientes de activación.

## Revisión científica implementada

Comité y revisores, aceptación independiente de asignaciones, conflictos automáticos/declarados, rondas sobre versiones oficiales, criterios bilingües, informes privados/enviados, PDF autorizado y dictamen apoyado en evaluaciones. El modo inicial es simple ciego; no simula doble ciego. Véanse el [recorrido, reglas y límites](../development/revision-cientifica.md) y [ADR-020](../adr/ADR-020-revision-cientifica.md). Programa, memorias y validación funcional completa continúan pendientes.
