# ADR-024: inscripciones y gestión de participantes

Estado: aceptada para el primer paquete de Fase 3.

## Decisión

Separar inscripción, identidad, autoría, pago y asistencia. Una inscripción corresponde a una persona y evento, con categoría y modalidad; no concede permisos científicos ni acredita presencia. El primer paquete incluye recepción pública, inscripción propia, cancelación, aprobación/rechazo, lista de espera, cupos e historial. Credenciales, pagos y asistencia pertenecen a incrementos posteriores.

Mantener configuración de borrador y publicación independiente. Fijar en cada solicitud las condiciones publicadas, categoría, modalidad, datos mínimos del perfil y correo solo si la sesión lo acredita. Modificar el perfil no cambia retroactivamente esta copia. La persona confirma las condiciones mostradas; esto no se presenta como firma legal ni se agregan consentimientos genéricos.

Los cupos son independientes para presencial y virtual. Solicitudes pendientes y confirmadas reservan plaza; la lista de espera no. Las escrituras se serializan sobre el evento y usan revisión optimista. La promoción desde espera es explícita del organizador: no hay un proceso automático ni correos simulados. La posición se basa en fecha de solicitud y se muestra solo a la persona interesada.

Solo el organizador gestiona inscripciones en este bloque, mediante una capacidad distinta de revisión científica. No se activa acceso al contenido privado de trabajos al consultar participantes. La publicación retirada se conserva inactiva para aplicar los últimos cupos y revisar solicitudes ya recibidas. Cancelar y volver a solicitar conserva identidad e historial; un rechazo exige reapertura motivada del organizador.

Las cuatro tablas tienen RLS/FORCE por organización/evento y persona o capacidad administrativa. Una función limitada devuelve únicamente contadores y la posición propia, sin exponer otras identidades. El historial es de inserción y no se sobrescribe.
