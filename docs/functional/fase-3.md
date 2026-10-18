# Fase 3: participantes, asistencia y certificación

## Paquete 1: inscripciones — implementado

Recepción configurable y publicación independiente; categorías bilingües, modalidades, cupos, aprobación, espera, cancelación y reapertura motivada; Mi inscripción y bandeja del organizador. Historial y auditoría; aislamiento por persona/evento/organización. Ver [guía funcional](../development/inscripciones.md) y [ADR-024](../adr/ADR-024-inscripciones-y-participantes.md).

La validación funcional por el usuario sigue pendiente. Inscribirse no acredita asistencia ni concede permisos científicos.

## Paquete 2: acreditación y asistencia — operación manual y QR implementada

Credencial con código/QR, lectura local por cámara o imagen y confirmación explícita, entrada al evento y sesiones, equipo delegado, consulta propia y correcciones motivadas con historial. Panel global y CSV filtrado para organizadores. Se validan fechas, horario, modalidad, entrada previa al evento y vigencia de credencial/delegación al confirmar. Comprobaciones dirigidas de API, escritorio/móvil y cámara simulada; validación integral y teléfonos físicos pendientes. Ver [guía de acreditación y asistencia](../development/acreditacion-asistencia.md).

Pendientes de ampliación: duración/salida, modo sin conexión y evidencia automática de participación virtual. Ver [ADR-029](../adr/ADR-029-acreditacion-operativa-qr.md).

## Paquete 3: certificados — implementado, recorrido principal probado en demo

Plantillas bilingües con color, logotipo y firmantes; requisitos por tipo de participación; aprobación y emisión individual/lote de veinte; PDF inmutable, QR y verificación pública; revocación con historial y Mis certificados. Véanse [guía](../development/certificados.md) y [ADR-026](../adr/ADR-026-certificados-verificables.md). Emisión individual, PDF/QR, revocación y lote de dos comprobados en demostración; la validación integral continúa pendiente.

## Paquete 4: comunicaciones y notificaciones — implementado

Centro personal por evento, contador y lectura persistente; preferencias de correo e idioma; avisos automáticos del ciclo científico y operativo; comunicados bilingües para inscritos o revisores; catálogo de plantillas y bandeja de entregas. Cola transaccional, SMTP configurable, reintentos acotados, arrendamientos e historial. Validación dirigida en PostgreSQL, SMTP local y navegador en escritorio/móvil. No se han enviado correos reales; activar SMTP institucional y RedUniv/Google sigue pendiente. Ver [guía](../development/comunicaciones.md) y [ADR-027](../adr/ADR-027-comunicaciones.md).

## Paquete 5: publicación científica y archivo — implementado

Selección editorial de versiones aceptadas, autorización explícita del responsable del envío, licencias por contribución, aprobación editorial, prueba PDF y publicación de libros de resúmenes y memorias. Portada, créditos, comité, presentación, índices, archivos finales autorizados, fichas públicas, ORCID, exportaciones SEP JSON/CSL-JSON/BibTeX/RIS y ediciones inmutables con retirada motivada. Validación dirigida en PostgreSQL y recorrido de navegador en escritorio/móvil; solo datos sintéticos en un evento aislado. Ver [guía](../development/publicaciones-cientificas.md) y [ADR-028](../adr/ADR-028-publicacion-editorial.md).

Reservas y aforo por sesión se incorporaron en el [bloque de logística y sesiones](../development/logistica-reservas.md).

## Ampliaciones posteriores

Recordatorios programados, campañas de gran volumen y requisitos adicionales por categoría. Cobros y exportaciones básicas están disponibles en [Fase 4](fase-4.md); las pasarelas automáticas siguen pendientes.
