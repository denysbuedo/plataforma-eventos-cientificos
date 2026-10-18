# Comunicaciones y notificaciones

La cabecera compartida muestra una campana junto al perfil del participante y del organizador. Un contador rojo indica los avisos sin leer del evento actual (99+ para cantidades superiores); desaparece cuando no quedan pendientes. La campana abre el centro y respeta la protección de cambios sin guardar.

El centro **Notificaciones** está disponible en el menú del participante y del organizador, dentro del evento seleccionado. Conserva avisos personales, permite consultar su destino y marcar leído/sin leer; el contador se actualiza y el estado persiste al recargar. Consultar un aviso lo marca como leído. Abrir otra sección por su cuenta no marca todos los avisos como leídos.

En **Preferencias** se eligen correo operativo, comunicaciones opcionales e idioma. Los avisos internos permanecen disponibles aunque se desactive todo el correo. Las comunicaciones opcionales por correo están desactivadas por defecto. Las preferencias son personales por evento; la dirección verificada es común a la cuenta.

## Avisos automáticos

| Acción | Destinatarios y destino |
|---|---|
| Dictamen y publicación de comentarios | Responsable del envío y colaboradores aceptados → Mis trabajos |
| Envío, nueva versión y retiro | Organizadores activos → Trabajos recibidos |
| Invitación al comité, asignación, revocación y ampliación de plazo | Revisor afectado → Mis revisiones |
| Respuesta del autor a una evaluación | Revisor original → Mis revisiones; no crea una nueva asignación |
| Evaluación enviada o respuesta valorada | Organizadores activos → Trabajos recibidos |
| Inscripción solicitada | Organizadores y solicitante → Inscripciones / Mi inscripción |
| Decisión o cancelación de inscripción | Titular → Mi inscripción |
| Publicación, actualización o retirada del programa | Inscritos confirmados, autores aceptados y personas programadas → Mi participación |
| Certificado emitido o revocado | Titular → Mis certificados |

Al actualizar el programa también se avisa a los presentadores, moderadores, participantes y coordinadores de la publicación anterior, aunque hayan sido retirados de la nueva. La deduplicación evita avisar dos veces a la misma persona por una publicación.

El aviso de un dictamen o revisión lleva al sistema; no incluye notas confidenciales, identidad de revisores ni archivos en el correo. Los trabajos se identifican por su título cuando corresponde. Los enlaces vuelven a comprobar la autorización vigente. Los contadores específicos de trabajos, autorías y tareas de revisión conservan su significado; no sustituyen el contador general de avisos.

Los avisos empiezan con las acciones realizadas después de activar las migraciones. No se generan correos retrospectivos por todos los hechos históricos.

## Organización

**Comunicaciones** requiere asignación de organizador en el evento. Contiene:

- **Entregas de correo:** filtros por estado, persona destinataria, dirección usada, intentos, próxima ejecución e historial. Permite volver a poner en cola entregas fallidas, omitidas o bloqueadas, cuando SMTP está habilitado.
- **Comunicados:** mensajes en español e inglés para inscritos confirmados o revisores que aceptaron. Se elige comunicación operativa u opcional, se confirma la publicación y se conserva el mensaje y su número de destinatarios. No se edita después de publicarlo. El identificador de la solicitud evita repetir el comunicado ante un reenvío de la misma operación.
- **Plantillas automáticas:** catálogo bilingüe de asuntos del sistema. La envoltura de correo incorpora el evento y un enlace seguro; los comunicados aportan su propio texto. No hay un editor HTML libre.

Los comunicados se distribuyen dentro de la transacción. Esta entrega está orientada a los volúmenes iniciales de eventos; no incorpora una herramienta de campañas masivas ni adjuntos de correo.

## Configuración SMTP

Se configura en el proceso de la API, mediante variables de entorno. Las credenciales no se guardan ni se muestran en la web.

```dotenv
SEP_MAIL_ENABLED=1
SMTP_HOST=smtp.example.org
SMTP_PORT=587
SMTP_SECURE=0
SMTP_FROM=eventos@example.org
SMTP_USER=usuario-del-servicio
SMTP_PASSWORD=secreto-del-servicio
SEP_ADMIN_ORIGIN=https://gestion.example.org
```

Para TLS directo en puerto 465, usar `SMTP_SECURE=1`. En otras conexiones se exige STARTTLS. El relé puede omitir usuario y contraseña si la infraestructura permite autenticación por origen. Ambos deben configurarse juntos cuando se utilicen. No se desactiva la validación de certificados TLS.

Únicamente en desarrollo/pruebas se permite un SMTP sin TLS en `127.0.0.1` o `localhost`, con `SEP_SMTP_ALLOW_LOCAL_PLAINTEXT=1`. No utilizarlo para un servidor remoto. Referencia: [transporte SMTP de Nodemailer](https://nodemailer.com/smtp).

La dirección se registra al autenticar con un correo **verificado** por RedUniv o Google. No se utiliza el correo declarado de un coautor ni se permite escribir una dirección arbitraria desde Preferencias. La demo con tokens de desarrollo no verifica direcciones. ORCID identifica autorías y no constituye por sí solo un correo verificado.

Sin `SEP_MAIL_ENABLED=1`, la API mantiene los avisos y la cola, muestra el envío como pendiente de configuración y no contacta un servidor SMTP. Al habilitar el transporte se procesan las entregas pendientes, comprobando las preferencias y direcciones actuales. Revisar la cola antes de habilitar correo en una instancia que ya tenga datos.

## Persistencia y recuperación

Migraciones 0062–0066; seis tablas nuevas con RLS forzada, contrato en OpenAPI y [ADR-027](../adr/ADR-027-comunicaciones.md). Los disparadores de auditoría y respuestas generan aviso y entrega en la misma transacción que la acción original. Un rollback no conserva el aviso ni un correo huérfano. Claves de origen impiden duplicar destinatarios.

La API procesa la cola cada diez segundos, hasta 25 entradas por recorrido. Cada envío reserva una entrada con bloqueo y un arrendamiento de dos minutos; el diálogo SMTP ocurre después de confirmar esa reserva. Otros procesos no pueden reclamar esa misma entrada mientras siga reservada. Un arrendamiento vencido permite recuperación tras una caída.

Los fallos temporales reintentan con espera de 1, 2, 4 y 8 minutos, hasta cinco intentos por ciclo. Los rechazos SMTP permanentes se detienen. Una solicitud manual abre un nuevo ciclo y deja historial. Una dirección ausente bloquea el correo; preferencias desactivadas o una cuenta inactiva impiden el envío. Estos estados conservan el aviso interno y requieren una nueva puesta en cola explícita para volver a intentar entregas antiguas.

«Aceptado por el servidor de correo» no confirma recepción en bandeja ni lectura. Se conserva un Message-ID estable por entrega. Como ocurre con SMTP, una caída entre la aceptación remota y la confirmación local puede producir una entrega repetida al recuperarse; no se promete envío exactamente una vez. No se registran contraseñas, respuestas SMTP completas ni contenido privado en los errores públicos. El historial de intentos es inmutable.

## Validación

`npm run test:communications` prepara una base PostgreSQL temporal y ejecuta comprobaciones dirigidas: permisos, lectura persistente, preferencias con revisión optimista, duplicados, rollback, destinatarios de programa, correo sin dirección verificada, exclusión de mensajes opcionales, SMTP local, errores temporales/permanentes, límite de intentos y arrendamientos. No envía correos fuera del proceso de prueba.

La demo también se comprobó en navegador a 1440 y 390 píxeles: creación de comunicado, conservación de borrador al cancelar la salida, contador, lectura persistente, consulta, preferencias, catálogo de plantillas e historial. Solo se añadieron datos simulados al evento aislado de demostración de certificados por lotes. SMTP permanece deshabilitado en esa demo.

Pendientes externos: activar identidad RedUniv/Google y proporcionar el servicio SMTP institucional para una prueba de entrega real. Ampliaciones posteriores: recordatorios programados de plazos, campañas en segundo plano para grandes volúmenes, editor de plantillas por evento y tratamiento automático de rebotes/bajas mediante el proveedor.
