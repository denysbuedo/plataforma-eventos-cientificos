# ADR-026: certificados verificables y emisión explícita

Estado: aceptada para el primer módulo de certificados.

## Decisión

Cada evento gestiona hasta diez plantillas versionadas. Cada plantilla define tipo (asistencia, presentación, revisión, organización u otra participación), textos ES/EN, participación, color, logotipo, hasta dos firmantes y origen público de verificación. Las imágenes de firma son una reproducción visual; no constituyen una firma criptográfica del PDF. No se fabrican firmas ni logotipos.

La emisión exige acción del organizador, revisión de los candidatos, confirmación y motivo/evidencia. Hasta veinte participaciones por lote, en una sola transacción. Se vuelve a comprobar la revisión de plantilla y la huella de evidencias consultadas. El evento debe estar publicado y no cancelado/archivado. La plantilla puede exigir alcanzar la fecha final del evento; no existe emisión automática por inscripción, autoría ni programación.

Reglas iniciales:

- Asistencia: inscripción confirmada y entrada al evento vigente en los registros de asistencia.
- Presentación: presentador registrado del trabajo en el programa publicado, inscripción confirmada, entrada al evento y presencia registrada en su sesión con fechas, horario y zona compatibles. El organizador confirma además que presentó el trabajo. La asistencia no demuestra por sí misma que habló; no se acredita a todos los coautores automáticamente.
- Revisión: al menos una evaluación enviada, conservando los identificadores/revisiones como evidencia, sin copiar el contenido confidencial de las evaluaciones al documento o verificación pública.
- Organización: asignación de organizador vigente al emitir. No se infiere participación a partir de ser administrador institucional.
- Otra participación: aprobación manual documentada, para una persona con registro de participación en el evento (inscripción, revisión u organización).

Un certificado vigente por evento, plantilla, persona y participación/trabajo. Reintentar no duplica. Una reemisión exige revocar el anterior; genera otro código, PDF e historial. El idioma pertenece al documento emitido; para dos documentos vigentes de idiomas diferentes se usan plantillas diferentes.

Se conserva PDF binario, SHA-256, código aleatorio de 192 bits, plantilla completa, identidad mostrada, datos del evento y evidencia de emisión. Son inmutables. Los cambios posteriores de perfil, programa o plantilla no reescriben el archivo. Las fuentes son las identidades que constan en los registros del evento, que el organizador revisa antes de emitir. Un cambio de la evidencia después de emitir no revoca documentos automáticamente: el organizador debe revisar y revocar los que corresponda.

La revocación agrega motivo, actor, fecha e historial. Se permite aun con evento cancelado/archivado, para conservar la capacidad de corregir certificados ya emitidos. No hay borrado ni restauración de un certificado revocado. Su código sigue resolviendo públicamente como revocado y su descarga normal se bloquea.

La verificación pública está limitada por institución/dominio y código. Muestra titular, evento, título, participación, trabajo si corresponde, fechas, estado y huella del archivo. No expone email, ORCID, IDs de cuenta, firmas, PDF ni razones privadas. El PDF se descarga por su titular u organizador autenticados. La comprobación de archivo usa SHA-256 local en el navegador.

Tres tablas con RLS/FORCE; historial de inserción y documento/snapshot protegidos por trigger. Capacidad independiente `certificates-manage`. Las lecturas adicionales de inscripción/asistencia/revisión y nombres del equipo se limitan al evento y a la transacción de certificación; no conceden edición de esos módulos.

## Límites

Diseño fijo A4 horizontal con textos, color e imágenes configurables; no hay editor libre ni firma PAdES. Fuente Noto Sans incrustada y licenciada OFL; si un texto no puede representarse o desborda los límites, la emisión falla sin generar un documento incompleto. El origen público se configura en cada plantilla y se fija al emitir. La demo usa URL local; para verificación desde otros dispositivos debe usarse el dominio accesible del evento.

La preparación inicial limita fuentes a 2000 inscripciones, 2000 revisiones enviadas, 2000 organizadores y 10000 registros de presencia por evento. Si se excede, se rechaza la preparación en lugar de ocultar candidatos. Ampliar el procesamiento por lotes y en segundo plano es trabajo posterior. Tampoco se mide duración o conexión virtual a partir de la asistencia manual.
