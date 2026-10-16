# ADR-019 · Reconocimiento de autorías y responsabilidad explícita

Estado: aceptado e implementado.

## Contexto

Seleccionar una cuenta o escribir un ORCID no acredita consentimiento sobre un trabajo. Las declaraciones previas al registro necesitan reconocimiento sin revelar borradores privados. El autor de correspondencia puede no tener cuenta; el remitente debe mantener la gestión provisional, sin autoaprobar solicitudes propias.

## Decisión

Separar reconocimiento, responsabilidad de aprobación y permiso para editar. Conservar solicitudes con declaración/evidencia, estado, revisión, actor, motivo y fechas. Descubrir candidatas solo por cuenta seleccionada, correo verificado de la sesión u ORCID autenticado de producción. Requerir confirmación del solicitante y aprobación del responsable; admitir rechazo, cancelación y revocación.

Mantener la responsabilidad provisional en el remitente hasta aceptación explícita por el autor de correspondencia registrado con colaboración vigente. Permitir devolución y retorno automático cuando desaparezcan las condiciones. Reservar las solicitudes propias y los conflictos a un organizador independiente; nunca fusionar cuentas por nombres ni introducir autoaprobación administrativa.

Implementar proyecciones y decisiones mediante una función PostgreSQL acotada, bajo RLS/FORCE, sin conceder al solicitante políticas de lectura de trabajos o archivos. Vincular la declaración actual sin reescribir snapshots oficiales. Añadir avisos internos con lectura separada del estado de las solicitudes.

## Consecuencias

Se conserva evidencia sin dar acceso científico por el mero reconocimiento. Una declaración modificada requiere nueva solicitud. La reclamación sobre una persona ya vinculada a otra cuenta necesita revisión externa al flujo y corrección explícita; no hay fusión automática de identidades. La ausencia de un organizador independiente bloquea la resolución propia hasta designarlo.

Las bandejas tienen límites documentados y no sustituyen el módulo futuro de comunicaciones. Ver [flujo, API, seguridad y límites](../development/reconocimiento-autorias.md).
