# ADR-005: clientes web y publicación del sitio

Estado: aceptado para el primer incremento de Fase 1.

Se implementan portal público y administración con Next.js, React y paquetes compartidos. Mantienen el modelo autohospedable del proyecto. El servidor web consume HTTP de la API; no accede a PostgreSQL directamente.

`@sep/web-server` es exclusivo del servidor. Mantiene los tokens de API fuera de las propiedades y bundles del cliente. La demo utiliza cookies HttpOnly, SameSite=Lax, firmadas y con caducidad; la clave y los tokens aleatorios permanecen en un archivo local ignorado por Git. Los cambios exigen el Origin administrativo configurado por el servidor. Next puede reconstruir request.url con localhost aunque el navegador use 127.0.0.1; esa URL interna no sustituye al origen público configurado.

En la demo, un selector local resuelve exclusivamente claves de fixtures hacia hosts registrados. No permite enviar un host arbitrario a la API. Fuera de ese modo se usa el dominio solicitado y la resolución de contexto de la API. La identidad y los permisos siguen comprobándose en backend en cada operación.

El CMS separa `site_drafts` de `site_publications`, con referencias compuestas de organización/evento y RLS forzada. Guardar incrementa la revisión sin modificar la versión pública. Publicar exige una revisión vigente y crea una instantánea de contenido y metadatos públicos; actualización de estado y auditoría se confirman en la misma transacción. El bloqueo de la fila del evento serializa guardados y publicaciones concurrentes.

Esto añade una frontera HTTP y dos procesos web, a cambio de separar interfaz pública, administración y autorización. OIDC, infraestructura de dominios y carga de archivos continúan pendientes; no se cambia la prohibición de usar el adaptador de identidad de desarrollo en producción.
