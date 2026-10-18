# ADR-027: avisos personales y correo transaccional durable

Estado: aceptado e implementado.

## Contexto

Los procesos científicos y operativos ya conservan historial, pero una persona necesita enterarse de sus cambios sin inspeccionar cada módulo. Los fallos de correo no deben revertir dictámenes ni perder avisos. Los datos de un evento y los avisos de otras personas deben permanecer aislados.

## Decisión

Guardar avisos personales y entregas de correo separadas, vinculados al evento y a una clave de origen. Crear ambos mediante disparadores dentro de la transacción original, aprovechando la auditoría de negocio y el registro de respuestas para revisores. No propagar textos confidenciales de las evaluaciones a las plantillas de correo.

El acceso propio utiliza RLS por persona/evento. La gestión de entregas y comunicados exige organizador del evento. Funciones de destinatarios y del remitente se ejecutan como el migrador con políticas explícitas; el rol runtime continúa sin propiedad de tablas, superusuario ni BYPASSRLS. Las funciones auxiliares y disparadores no son invocables directamente por runtime. Solo las funciones acotadas de reclamación, resultado y reintento se conceden a runtime; no existe un endpoint HTTP para ejecutar el remitente global o elegir destinatarios arbitrarios.

SMTP se habilita por configuración de infraestructura y exige TLS fuera del bucle local de pruebas. La autenticación real conserva direcciones verificadas; las declaraciones de autoría no se consideran verificaciones de correo. Cada evento conserva preferencias operativas y opcionales; el correo opcional requiere elección explícita y desactivar el correo no elimina avisos internos.

La cola utiliza bloqueo, arrendamiento, reintento acotado e historial inmutable. La aceptación SMTP se distingue de lectura. La entrega tiene semántica de al menos una vez ante fallos ambiguos del protocolo; un Message-ID estable facilita identificar repeticiones, sin prometer deduplicación por servidores externos.

## Consecuencias

El ciclo científico funciona aun sin SMTP y los avisos sobreviven reinicios. Los reintentos no vuelven a ejecutar la acción científica. Los comunicados son bilingües, inmutables y su creación admite reenvío idempotente. Las personas retiradas del programa también reciben el aviso de actualización. Las funciones y políticas requieren migraciones antes de arrancar la API. Campañas de gran volumen, recordatorios programados, edición libre de plantillas y rebotes quedan fuera de esta entrega. Ver [operación y validación](../development/comunicaciones.md).
