# Guía de validación módulo a módulo

Usar una cuenta de organizador y al menos dos participantes distintos. Un revisor nunca evalúa su propio trabajo. Registrar por caso: evento, usuario, pasos, resultado esperado/obtenido y evidencia sin secretos.

Demo local actual: administración `http://127.0.0.1:6789/es`, portal `http://127.0.0.1:6788/es`. El evento **Demostración integral SEP** (`event=completeDemo`) contiene datos sintéticos para los bloques recientes. Las otras demostraciones conservan sus datos. Este evento aislado existe en el entorno local preparado, no se crea por defecto en una instalación nueva.

| Orden | Módulo | Recorrido de aceptación |
|---|---|---|
| 1 | Identidad/perfil | Entrar por cada acceso configurado, cambiar idioma, completar perfil, ORCID, cerrar sesión; comprobar cuenta compartida y aislamiento entre eventos |
| 2 | Evento/portal | Crear/configurar evento, fechas y zona horaria; publicar y comprobar que el portal conserva la edición publicada hasta volver a publicar |
| 3 | Convocatoria | Áreas, tipos, plazos, límites y PDF; probar límites válidos/inválidos y congelación de reglas del trabajo |
| 4 | Trabajos | Borrador, ver/editar/cerrar/cancelar, aviso de cambios, autores, archivos, envío y versión oficial; comprobar botones por estado |
| 5 | Autorías/gestión compartida | Buscar registrado, declarar autor externo, reconocimiento, aprobación y delegación aceptada; comprobar permisos y avisos leídos persistentes |
| 6 | Revisión | Invitar revisores distintos, conflictos, asignación/aceptación, comentarios privados/públicos, dictamen, correcciones y respuesta; valoración de revisores anteriores y decisión excepcional motivada |
| 7 | Programa | Actividades, salas, sesión presencial/virtual/híbrida, moderadores, trabajo/presentador, conflictos y publicación |
| 8 | Inscripción | Categorías, modalidades, confirmación, cupos, espera y cancelación; probar dos personas concurrentes por última plaza |
| 9 | Logística | Crear recurso, solicitar/confirmar necesidad, probar conflicto de disponibilidad, preparar/entregar con evidencia; comprobar responsable e historial |
| 10 | Reservas | Exigir reserva, abrir/cerrar recepción, dos participantes por última plaza, cancelación/promoción, horarios solapados, cambio de programa y revisión de inscripción |
| 11 | Acceso virtual | Enlace privado solo con inscripción/reserva vigente y dentro del horario; ausencia de URL en programa público; grabación posterior autorizada; abrir no acredita asistencia |
| 12 | Acreditación | QR desde cámara e imagen, entrada al evento/sesión, rechazo de duplicado o reserva ausente, delegación revocada, corrección e informe |
| 13 | Certificados | Plantillas y condiciones, candidato elegible/no elegible, emisión, ver/descargar, verificación pública/archivo, lote y revocación |
| 14 | Comunicaciones | Campana, contador, abrir/marcar leído/sin leer, persistencia, preferencias, comunicado, entrega SMTP/reintento con proveedor configurado |
| 15 | Publicaciones | Permisos exactos de versión, prueba editorial, publicación, índice, PDF, exportaciones, nueva edición y retirada sin reescribir historia |
| 16 | Pósteres | Autorizar final, derechos, licencia y miniatura, aprobar/publicar, filtros, ficha/PDF, privacidad, retirada inmediata al revocar |
| 17 | Patrocinadores | Institución/contactos, compromisos, fechas y evidencia; importes por moneda; autorización y publicación sin filtrar datos internos |
| 18 | Cobros | Activar catálogo/tarifas, crear cobro en cada moneda, efectivo registrado por equipo, pago comunicado por autor y verificación, referencias duplicadas, exención/anulación/reembolso y conservación de precio |
| 19 | Indicadores | Comparar totales con las bandejas, diferenciar asistencias/personas, revisar configuración, exportar CSV y probar acceso con usuario sin permiso |

En cada módulo comprobar escritorio y móvil, ES/EN, navegación coherente y ausencia de sombras/fondos destacados en tarjetas. Verificar acceso cruzado a otra organización/evento y que los errores no filtran datos privados. Probar proveedores reales solo cuando estén configurados; las pantallas genéricas no acreditan que ya exista integración automática.

## Inicio recomendado para el siguiente recorrido

1. Abrir `http://127.0.0.1:6789/es?event=completeDemo&tab=operations` como organizador.
2. Revisar Logística y sesiones, Galería de pósteres, Cobros y pagos e Indicadores e informes.
3. Entrar como autor en `?event=completeDemo&tab=sessions`, `tab=posters` y `tab=payments`.
4. El taller de mañana tiene una reserva confirmada y otra en espera; el póster está publicado y existe un cobro ficticio confirmado. Crear datos nuevos o usar la cancelación prevista si se quiere repetir un flujo desde cero.
5. No efectuar pagos reales: el catálogo es ficticio. No retirar ni modificar trabajos anteriores sin necesidad; cada historial conserva sus evidencias.

## Comprobaciones de desarrollo

`npm run lint`, `npm run build:api`, `npm run test:operations`, `npm run test:completion`, `npm test` y compilación de ambos clientes. Las pruebas usan PostgreSQL temporal con migraciones repetidas, sin alterar el servicio PostgreSQL instalado. Las pruebas de navegador no sustituyen la revisión del equipo sobre contenido científico, usabilidad y políticas institucionales.
