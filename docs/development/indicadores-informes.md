# Indicadores e informes del evento

Estado: implementados para organizadores del evento. Ni un participante ni la administración de organización sin asignación de organizador obtienen estos datos.

**Indicadores e informes** presenta totales por estado de trabajos, evaluaciones, inscripciones, registros de asistencia, certificados, reservas, publicaciones, pósteres, entregas de correo y cobros. No expone comentarios privados de revisión. Las asistencias son registros por destino, no personas únicas; una persona puede asistir a varias sesiones. «Enviado al servidor de correo» no acredita recepción o lectura.

La preparación muestra existencia de configuración/publicación de portal, convocatoria, inscripción, programa, certificados, patrocinadores y logística. No declara que la configuración esté completa. Las integraciones indican si existen parámetros del entorno; no prueban disponibilidad del proveedor. ORCID distingue sandbox de producción.

Los aportes monetarios de patrocinadores se agrupan por moneda y estado, separados de los pagos de participantes. No se convierten monedas ni se considera que un compromiso sea un ingreso contable.

Las exportaciones CSV de trabajos, inscripciones, reservas y certificados incluyen identificación, etiqueta, estado y modalidad/tipo; no incluyen correos, evaluaciones ni archivos. Están limitadas a cinco mil registros con rechazo explícito si se supera. Se aplica escape CSV, protección de fórmulas, UTF-8 con BOM y auditoría de descarga. Custodiar las exportaciones como datos internos del equipo.

API: `/events/:eventId/reports` y `/export?dataset=works|registrations|bookings|certificates`. La respuesta de exportación transporta nombre, contenido CSV, cantidad y momento de generación; el navegador genera la descarga. [OpenAPI](../api/openapi.json).

Pendientes de ampliación: series históricas, gráficos temporales, filtros avanzados, exportación masiva y analítica entre eventos. No se anuncian como implementados.
