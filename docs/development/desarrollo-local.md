# Desarrollo local de la API

## Estado y herramientas

La raíz usa npm workspaces para `apps/api`, `packages/contracts` y `packages/i18n`. La prueba comparativa anterior permanece independiente en `tests/orm-spike`; no se instala con el monorepo ni se incorpora Prisma a la API.

Versiones locales verificadas: Node.js 22.23.2, npm 10.9.2, TypeScript 6.0.3, NestJS 12.1.3, Swagger 12.0.2, Drizzle ORM 0.45.4, Drizzle Kit 0.31.11 y PostgreSQL 18.4. TypeScript 6 mantiene compatibilidad con typescript-eslint 8.71.2. Los paquetes se compilan como ESM, requerido por la versión de NestJS instalada. El lockfile raíz fija las dependencias.

No se requieren Docker, Redis, S3 ni un proveedor OIDC para este incremento.

## Instalación y verificación

Desde la raíz:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
```

`npm test` compila los paquetes, crea un cluster PostgreSQL nuevo, aplica dos migraciones dos veces, carga fixtures ficticios, arranca la API en un puerto local libre y ejecuta pruebas HTTP/BD. Detiene la API y PostgreSQL al terminar. No utiliza una base existente ni las URLs del entorno del usuario para la suite.

`initdb` y `pg_ctl` deben estar instalados. En Windows se usa por defecto `C:/Program Files/PostgreSQL/18/bin`. Para otra instalación:

```powershell
$env:SEP_PG_BIN = 'C:/ruta/postgresql/bin'
npm test
```

En Linux definir `SEP_PG_BIN` con la ruta de binarios, por ejemplo `/usr/lib/postgresql/16/bin`, o agregarlos a PATH. Ejecutar como usuario ordinario, no como root. El workflow usa Ubuntu 24.04 y PostgreSQL 16; su resultado debe consultarse en GitHub Actions, por separado de la ejecución Windows.

## Demo interactiva

```powershell
npm run dev:demo
```

El lanzador prepara otra instancia aislada y mantiene la API activa hasta Ctrl+C. Muestra la dirección local y la ruta `.local/api-<UUID>/demo.json`, que contiene puerto, hosts, IDs de eventos y tokens aleatorios de esa ejecución. Ese archivo está ignorado por Git. Los tokens no contienen roles y no se reutilizan entre ejecuciones.

En Windows PostgreSQL se inicia en un grupo de procesos separado y oculto para poder cerrarlo limpiamente cuando la terminal recibe Ctrl+C.

En otra terminal, usar la ruta exacta que mostró el lanzador:

```powershell
$sepDemo = Get-Content -Raw '.local/api-<UUID>/demo.json' | ConvertFrom-Json
$sepHeaders = @{ Host = $sepDemo.hosts.a1; Authorization = "Bearer $($sepDemo.tokens.mixed)" }
Invoke-RestMethod -Uri "$($sepDemo.baseUrl)/api/v1/events" -Headers $sepHeaders
$sepHeaders.Host = $sepDemo.hosts.b1
Invoke-RestMethod -Uri "$($sepDemo.baseUrl)/api/v1/events" -Headers $sepHeaders
```

La primera consulta devuelve solo A1; la segunda devuelve 403 porque la misma persona es participante en B1. Para consultar la proyección pública de B1, usar `/api/v1/public/event` con su `Host`, sin token.

OpenAPI JSON: `/api/v1/openapi.json`. Interfaz de documentación: `/api/docs`. Estos contratos son públicos; las operaciones privadas requieren host registrado y token válido.

Los hosts `*.sep.test` son fixtures y no requieren cambios DNS para las llamadas que establecen `Host` explícitamente. No se habilitan dominios ni TLS reales.

## Entorno y arranque manual

[.env.example](../../.env.example) documenta las variables; no contiene credenciales válidas. Para cargar un `.env` local con Node 22, después de compilar:

```powershell
npm run build
node --env-file=.env apps/api/dist/main.js
```

El arranque exige `NODE_ENV=development` o `test`, `AUTH_MODE=development-token`, URL del rol runtime y mapa no vacío de tokens. Rechaza el rol propietario, superusuario o con `BYPASSRLS`, y una tabla de eventos sin RLS/FORCE. No hay adaptador productivo: `NODE_ENV=production` impide arrancar. El listener se limita a `127.0.0.1`.

`npm run db:migrate` exige `MIGRATION_DATABASE_URL`; no reutiliza credenciales runtime. Este comando aplica migraciones a la URL configurada: utilizarlo solo en una base de desarrollo preparada. El lanzador de demo es la opción inicial que aprovisiona roles y fixtures sin intervenir datos persistentes. No se incluye un seed genérico para bases existentes.

## Migraciones y contratos

```powershell
npm run db:generate
npm run openapi
```

Revisar y versionar SQL, snapshots y journal de Drizzle juntos. FORCE, privilegios, triggers y resolvedor de dominios están en la migración SQL manual. Las migraciones no se ejecutan automáticamente al arrancar la API.

El contrato OpenAPI se genera sin abrir listener ni conexión a PostgreSQL. CI verifica que su regeneración y la del esquema no produzcan diferencias. Los contratos TypeScript compartidos no exportan entidades de Drizzle.

## Aislamiento del entorno de prueba

El cluster usa un puerto libre en `127.0.0.1` y autenticación `trust` para datos exclusivamente ficticios. Otros procesos locales pueden acceder mientras esté activo. El rol de aprovisionamiento es privilegiado únicamente en esa instancia; el migrador y el runtime son distintos. Esta configuración no sirve como despliegue productivo.

Los datos y logs permanecen en `.local/` ignorados por Git. El cierre normal detiene los procesos. Si una interrupción abrupta los dejara abiertos, detener solo la ruta de esa ejecución con `pg_ctl -D <ruta-absoluta-a-.local/api-UUID/data> -m fast -w stop`. No usar el directorio del servicio PostgreSQL instalado.
