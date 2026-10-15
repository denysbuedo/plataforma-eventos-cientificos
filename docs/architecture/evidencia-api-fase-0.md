# Evidencia del incremento API de Fase 0

## Resultado local

Implementación ejecutada en Windows con Node.js 22.23.2, npm 10.9.2 y PostgreSQL 18.4. Pasaron lint, typecheck, build, exportación OpenAPI y generación de esquema sin cambios pendientes. `npm test` informó **27 tests aprobados: 26 casos y un grupo, sin fallos ni omisiones**.

El lanzador creó un cluster nuevo, aprovisionó migrador y runtime separados, aplicó dos migraciones dos veces, cargó fixtures, inició HTTP en un puerto libre y cerró API/BD al terminar. El servicio PostgreSQL instalado no se modificó.

También se ejecutó `npm ci` seguido de `npm run check` desde una instalación limpia. La demo interactiva arrancó mediante `npm run dev:demo`: salud 200, consulta de A1 200 y consulta administrativa de B1 con la misma persona 403. Tras Ctrl+C se comprobó el cierre de PostgreSQL en sus logs y la ausencia del PID del cluster. Se corrigió el grupo de señales en Windows para que Ctrl+C alcance al lanzador y no a los workers de BD.

## Alcance comprobado

- Salud con consulta real a BD y respuesta mínima.
- RLS/FORCE y rol runtime no privilegiado; acceso directo al registro/identidades y cambios de seguridad denegados.
- Registro de dominios, host malformado/desconocido/no verificado, y cabeceras reenviadas que no cambian contexto.
- Rechazo de cabeceras de tenant/evento/persona/rol proporcionadas por el cliente.
- Cruces A1/A2 dentro de organización A y frente a B1 en organización B, por URL, IDs, dominio, query y cuerpo.
- Una misma persona organizadora de A1 y participante de B1; sin acumulación de permisos.
- Administrador limitado a su organización, con capacidad de metadatos/creación y sin edición implícita de eventos.
- Creación de borrador con tenant derivado en servidor, y validación de zona horaria/entradas.
- Actualización autorizada y auditoría atómica; fallo de auditoría revierte el cambio.
- Vista pública limitada a campos publicados, bloqueo de estado archivado y normalización de host.
- Revocación de rol/membresía/persona y vencimiento efectivos en la siguiente petición.
- Organización suspendida y dominio desactivado no resuelven contexto.
- 24 peticiones concurrentes sin mezcla de roles ni ámbitos.
- Errores español/inglés sin valores privados, con ID de correlación de servidor.
- OpenAPI servido y consistente con el JSON versionado.
- Referencias compuestas, compatibilidad de rol/ámbito e inmutabilidad de pertenencia.
- Autenticación de desarrollo bloqueada en producción o sin configuración explícita.

La primera ejecución detectó un 500 al actualizar con un DTO vacío; se corrigió para devolver 400. La ejecución final volvió a pasar los casos completos.

## Evidencia remota

El [workflow de CI](../../.github/workflows/ci.yml) instala PostgreSQL 16 en Ubuntu 24.04 y verifica instalación, lint, tipos, contrato, snapshots y tests. Su ejecución remota se informa por separado en GitHub Actions; esta evidencia local no la da por aprobada anticipadamente.

## Límites y cierre

No hay frontend, marcas/temas de eventos, proveedor OIDC, DNS/TLS real, administración de membresías, dominio verificado externamente ni datos científicos. Los registros marcados como verificados son fixtures locales.

La auditoría cubre las escrituras implementadas; los intentos denegados aún no se guardan en una bitácora persistente. No se ha probado operación productiva, recuperación de migraciones fallidas, restauraciones, cargas masivas ni infraestructura de proxy. No se han reejecutado los 34 tests del experimento ORM, que permanece sin cambios y documenta una entrega anterior.

Las relaciones de serie/edición/evento y las reglas de negocio se usan provisionalmente para desarrollo y requieren validación con el piloto. Este incremento no declara cerrada la Fase 0 ni comienza automáticamente la Fase 1.

Reproducción: [desarrollo local](../development/desarrollo-local.md). Contrato: [API mínima](../api/fase-0.md).
