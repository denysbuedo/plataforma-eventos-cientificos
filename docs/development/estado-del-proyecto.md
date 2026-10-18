# Estado del proyecto y cierre para pruebas por módulo

Actualizado: 18 de octubre de 2026.

El ciclo principal dispone de implementación funcional y demostración local. Esto no equivale a validación integral ni a puesta en producción. El documento técnico original conserva propuestas de mayor alcance.

| Módulo | Implementado | Pendiente relevante |
|---|---|---|
| Organizaciones y eventos | Organizaciones, series/ediciones, responsables, dominios y configuración | DNS/TLS reales, revisión operativa |
| Identidad y perfil | Acceso RedUniv/Google implementado, Mis accesos, administración auditada de usuarios/roles, perfil académico/científico, ORCID, identidad reutilizable | Activación institucional y Google real; ORCID de producción |
| Portal y convocatoria | CMS bilingüe, publicación independiente, temas y reglas científicas | Contenido institucional y validación de accesibilidad completa |
| Trabajos y autorías | Borradores, autores, reconocimiento, gestión compartida, PDF, versiones y correcciones | Prueba integral de todos los estados y concurrencia |
| Revisión científica | Comité, conflictos, asignaciones, evaluaciones, respuesta del autor, valoración y dictamen auditado | Doble ciego y otras modalidades avanzadas; revisión funcional completa |
| Programa | Actividades científicas, sesiones, salas, formatos, participación y publicación | Prueba integral con programa real |
| Inscripciones | Categorías, modalidades, cupos, espera y confirmación | Requisitos adicionales por categoría si se necesitan |
| Acreditación y asistencia | QR/cámara/imagen, equipo delegado, evento/sesión, correcciones y CSV | Teléfonos físicos, sin conexión, duración/salida |
| Certificados | Plantillas, emisión individual/lote, PDF/QR, verificación y revocación | Validación de cada tipo y reglas institucionales |
| Comunicaciones | Centro de avisos, contador, lectura, preferencias y cola SMTP con reintentos | SMTP institucional, operación de cola y campañas avanzadas |
| Publicaciones | Libro de resúmenes/memorias, permisos, PDF, fichas, exportaciones y preservación | DOI/depósito externo y registro editorial si se requieren |
| Patrocinadores | Instituciones, compromisos, evidencia, seguimiento por moneda, publicación autorizada | Validación con datos reales |
| Logística | Recursos, necesidades por sesión/evento, responsables y entregas | Gestión más amplia de servicios y operaciones de campo |
| Reservas y modalidad híbrida | Cupos, espera, cancelación/promoción, enlaces privados y grabaciones autorizadas | Integración con videoconferencia y evidencia automática de presencia |
| Pósteres | Consentimiento, aprobación, publicación, búsqueda, ficha y visor PDF | Validación con pósteres reales y grandes volúmenes |
| Cobros | Catálogo por evento, efectivo/pasarelas, CUP/USD/EUR, tarifas, comunicación, verificación manual, exenciones y reembolsos registrados | Adaptadores de pagos automáticos, cierres de caja, comprobantes fiscales y pagos parciales |
| Indicadores | Estado por módulo, agregaciones y CSV auditado | Analítica temporal, filtros y exportaciones avanzadas |

## Lo que queda para un despliegue real

- Activar y verificar clientes RedUniv y Google en dominios definitivos, SMTP y ORCID de producción. Nunca reutilizar secretos de ejemplo.
- Definir contratos de proveedores y responsables de conciliación antes de activar pagos automáticos. El catálogo genérico no sustituye un adaptador.
- Preparar entorno, TLS, análisis antivirus de PDF, copias de seguridad y restauración, monitorización, límites de uso y operación de notificaciones.
- Validar privacidad, consentimientos, retención, accesibilidad y reglas institucionales con el equipo.
- Ejecutar [pruebas módulo a módulo](pruebas-por-modulo.md), documentar incidencias y completar aceptación del producto.

## Alcance posterior del documento inicial

Hospedaje, transportación, networking, IA asistiva, aplicaciones móviles nativas, sincronización sin conexión, revisión doble ciego, intermediación automática de videoconferencia y pagos, identificadores editoriales externos y escalado masivo no se presentan como terminados. Requieren paquetes propios y criterios de aceptación. El próximo trabajo debe priorizar las incidencias de la validación funcional antes de ampliar ese alcance.

## Comprobaciones del bloque actual

Compilación del API y ambos clientes, ESLint, suite base de API y comprobaciones dirigidas de operaciones, galería/cobros/informes; migraciones aplicadas dos veces sobre PostgreSQL temporal. Recorrido visual en escritorio/móvil para nuevas pantallas, reserva/espera, autorización/aprobación/publicación del póster, PDF público, comunicación y confirmación de pago, informes y galería en inglés. Se utilizaron exclusivamente datos sintéticos. La aceptación integral del usuario sigue pendiente.
