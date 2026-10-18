# Matriz de permisos implementados

Actualizado: 18 de octubre de 2026. Reglas de negocio y confidencialidad prevalecen sobre un rol. Los permisos no se heredan entre organizaciones o eventos. La interfaz refleja accesos; la autorización se repite en servidor.

| Acción | Admin. organización | Organizador de evento | Revisor | Acreditador | Cuenta autenticada |
|---|---|---|---|---|---|
| Perfil y accesos propios | Propio | Propio | Propio | Propio | Propio |
| Organización, dominios y personas/invitaciones | Su organización | No | No | No | No |
| Asignar/retirar administradores | Su organización; protección de continuidad | No | No | No | No |
| Crear eventos y designar organizadores | Su organización | No, salvo que también sea admin. | No | No | No |
| Leer metadatos administrativos | Su organización | Su evento | No | No | No |
| Editar/publicar evento y convocatoria | Solo con asignación de organizador | Su evento | No | No | No |
| Envíos, dictámenes y comité | Solo con asignación de organizador | Su evento | Evaluaciones asignadas y respuestas habilitadas | No | Trabajos propios / gestión aceptada |
| Programa, inscripción, logística y reservas administrativas | Solo con asignación de organizador | Su evento | No | No | Datos/operaciones personales autorizadas |
| Registrar presencia | Solo con asignación de organizador/acreditador | Su evento | No | Delegación activa de su evento | No |
| Corregir asistencia y gestionar acreditadores | Solo con asignación de organizador | Su evento | No | No | No |
| Emitir/revocar certificados | Solo con asignación de organizador | Su evento | No | No | Consultar/descargar propios |
| Publicaciones y pósteres | Solo con asignación de organizador | Aprobación y publicación | No | No | Consentimiento propio |
| Patrocinios, cobros e informes | Solo con asignación de organizador | Su evento | No | No | Cobros y avisos propios |

## Distinciones

- RedUniv/Google autentican la cuenta; sus roles no asignan responsabilidades del evento. El rol de acceso de cliente Keycloak habilita la aplicación, no la gestión de SEP.
- Autor y autor de correspondencia son relaciones del trabajo, no roles globales seleccionables en el login. Editar/re-enviar exige titularidad o gestión compartida aceptada y estado/plazo válido.
- Participación básica no equivale a inscripción confirmada. La inscripción no acredita asistencia ni concede permisos científicos.
- Ser revisor requiere invitación aceptada; acceder a una evaluación exige asignación y ausencia de conflicto de interés. La decisión final corresponde al organizador y sus excepciones quedan auditadas.
- El acreditador tiene consulta operativa mínima y registro de entradas; no puede corregir, exportar, decidir inscripciones ni leer manuscritos.
- Datos públicos provienen de publicaciones autorizadas y no de bandejas privadas. El PDF público de un póster exige consentimiento y aprobación, independientes de su aceptación científica.
- Exención/anulación/reembolso financiero y verificación de pago solo corresponden al organizador en el alcance actual. Una declaración del participante no confirma un pago.

## Administración de accesos

Ver [login, usuarios y roles](../development/login-usuarios-roles.md). La asignación de administrador exige motivo, versión vigente y auditoría. Se bloquean retirada propia y ausencia de administrador alternativo. Organizar un evento requiere asignación explícita aunque la persona administre la organización.

Los roles de plataforma, el constructor libre de permisos y las delegaciones de caja/secretaría no están implementados. No deben simularse mediante campos de cliente o ampliando silenciosamente los permisos de acreditadores/revisores.
