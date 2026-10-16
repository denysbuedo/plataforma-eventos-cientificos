# Organizaciones y dominios

## Uso administrativo

Iniciar sesión como administrador de organización y abrir **Organización** en el menú. La navegación vuelve al contexto institucional. Organizadores de un evento y participantes no pueden operar esta sección.

El perfil permite editar nombre, correo, sitio HTTPS y descripción. La revisión evita sobrescribir cambios de otra sesión: si hay conflicto, recargar antes de guardar.

Para preparar un dominio:

1. Seleccionar un evento no archivado y registrar un hostname sin protocolo, puerto o ruta. Se guarda pendiente y no se habilita en el resolver.
2. Entregar al responsable DNS el nombre y valor TXT mostrados. Publicar exactamente el registro y conservarlo para futuras activaciones.
3. Pulsar **Comprobar DNS** cuando se haya propagado. Si se encuentra el valor esperado, queda verificado.
4. El equipo de infraestructura debe dirigir el host al portal, configurar el proxy con el Host correcto y preparar HTTPS. El cambio de infraestructura no lo realiza esta API.
5. Tras comprobar la infraestructura, el operador marca ese registro como preparado para TLS mediante credenciales de migración/operación; nunca mediante sep_runtime. Ejemplo con identificadores reales revisados:

```sql
UPDATE public.domains
SET tls_ready = true
WHERE id = '<UUID del dominio>'::uuid
  AND organization_id = '<UUID de la organización>'::uuid
  AND hostname = '<hostname confirmado>'
  AND event_id IS NOT NULL AND verified AND NOT active
RETURNING id, hostname;
```

6. En SEP pulsar **Actualizar lista** y después **Activar**. La API vuelve a consultar DNS. El portal será público solo si el evento tiene contenido publicado.

Para retirar un dominio, desactivarlo desde el ingreso de organización; después puede eliminarse su registro. Retirar DNS/proxy/certificados requiere coordinación aparte con infraestructura. No se puede eliminar ni desactivar el ingreso administrativo de la organización desde esta sección.

La demo conserva sus dominios simulados. Se puede explorar la pantalla y registrar hosts pendientes, pero la verificación consulta DNS real y no simula éxito. No se han cambiado DNS ni TLS externos. El alta de organizaciones nuevas y sus ingresos administrativos sigue a cargo del operador de plataforma.

## API

Todas las operaciones necesitan autenticación, administrador vigente y contexto de organización sin evento. El ámbito se resuelve mediante el Host registrado; no se acepta organizationId en el cuerpo.

| Método | Ruta bajo /api/v1 | Operación |
|---|---|---|
| GET | /organization | Perfil y dominios de la organización actual |
| PATCH | /organization | Nombre, contactEmail, website, description y revision |
| POST | /organization/domains | Registro pendiente: hostname y eventId |
| POST | /organization/domains/:domainId/verify | Verificación TXT en servidor |
| POST | /organization/domains/:domainId/activate | Activación con DNS y TLS preparado |
| POST | /organization/domains/:domainId/deactivate | Desactivación de dominio de evento |
| DELETE | /organization/domains/:domainId | Eliminación de registro inactivo |

Las respuestas devuelven OrganizationSettings. Errores específicos: REVISION_CONFLICT, DOMAIN_UNAVAILABLE, DOMAIN_DNS_PENDING y DOMAIN_TLS_PENDING, además de los errores habituales de autenticación, permisos, validación y estado. Ver el [OpenAPI](../api/openapi.json).

## Datos y verificación pendiente

Las migraciones 0011 y 0012 añaden el perfil institucional, la revisión y los campos de provisión del dominio, y crean funciones limitadas sobre el registro. No se recrean organizaciones, eventos ni sesiones.

Las migraciones 0013 y 0014 corrigen la autorización dentro de las funciones SECURITY DEFINER bajo FORCE RLS. Sin ellas la sección Organización devuelve un error interno. Se aplicaron a la demo conservando sus datos y se comprobó de forma dirigida la lectura de la API, el registro transaccional con rollback y la carga autenticada de la pantalla. La validación funcional completa permanece pendiente.

La compilación y el análisis estático no sustituyen las pruebas funcionales aplazadas. Al retomarlas deberán cubrir: organizador/participante rechazados, cruce entre organizaciones, IDs ajenos, hostname duplicado, eventos archivados, control de revisión, concurrencia, TXT ausente/incorrecto, TLS pendiente, ingreso institucional protegido y auditoría/rollback.
