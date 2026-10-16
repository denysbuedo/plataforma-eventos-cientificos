# Desarrollo local de la plataforma

## Estado y herramientas

La raíz usa npm workspaces para la API, los portales público y administrativo, contratos, idiomas, UI y gateway exclusivo del servidor. La prueba comparativa anterior permanece independiente en `tests/orm-spike`; no se instala con el monorepo ni se incorpora Prisma a la API.

Versiones locales verificadas: Node.js 22.23.2, npm 10.9.2, TypeScript 6.0.3, NestJS 12.1.3, Swagger 12.0.2, Drizzle ORM 0.45.4, Drizzle Kit 0.31.11 y PostgreSQL 18.4. TypeScript 6 mantiene compatibilidad con typescript-eslint 8.71.2. Los paquetes se compilan como ESM, requerido por la versión de NestJS instalada. El lockfile raíz fija las dependencias.

No se requieren Docker, Redis, S3 ni un proveedor OIDC para ejecutar la demo. El acceso institucional se configura por separado mediante la [guía OIDC](identidad-institucional.md).

## Instalación y verificación

Desde la raíz:

```powershell
npm ci
npm run lint
npm run typecheck
npm test
```

`npm test` compila los paquetes de API, crea un cluster PostgreSQL nuevo, aplica las migraciones dos veces, carga fixtures ficticios, arranca la API en un puerto local libre y ejecuta pruebas HTTP/BD. Detiene la API y PostgreSQL al terminar. No utiliza una base existente ni las URLs del entorno del usuario para la suite.

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

El lanzador prepara otra instancia aislada y mantiene API y portales activos hasta Ctrl+C. Muestra las URLs del portal público y del administrador: abrirlas directamente en el navegador. El selector de eventos resuelve únicamente dominios de los fixtures. La ruta `.local/api-<UUID>/demo.json` contiene puertos, hosts, IDs, tokens aleatorios y clave de sesión de esa ejecución. Ese archivo está ignorado por Git. Los tokens permanecen en el servidor, no contienen roles y no se reutilizan entre ejecuciones.

Para las pruebas de navegador, ejecutar `npm run build`, `npx playwright install chromium` y `npm run test:web`. Esta suite también crea y detiene su propia instancia. El [incremento visual](../functional/fase-1.md) describe perfiles y operaciones disponibles. Usar exactamente la URL administrativa impresa; `SEP_ADMIN_ORIGIN` determina el origen autorizado de los cambios, incluido el inicio de sesión.

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

El modo demo exige `NODE_ENV=development` o `test`, `AUTH_MODE=development-token`, URL del rol runtime y mapa no vacío de tokens. El modo institucional exige `AUTH_MODE=oidc` y su configuración explícita; puede arrancar con `NODE_ENV=production`, pero la integración con el proveedor todavía no está validada. Ambos modos rechazan el rol propietario, superusuario o con `BYPASSRLS`, y tablas privadas sin RLS/FORCE. El listener se limita a `127.0.0.1`.

`npm run db:migrate` exige `MIGRATION_DATABASE_URL`; no reutiliza credenciales runtime. Este comando aplica migraciones a la URL configurada: utilizarlo solo en una base de desarrollo preparada. El lanzador de demo es la opción inicial que aprovisiona roles y fixtures sin intervenir datos persistentes. No se incluye un seed genérico para bases existentes.

## Migraciones y contratos

El módulo de trabajos requiere migraciones hasta 0027. Sus manuscritos se guardan en PostgreSQL privado. En acceso real configurar `CLAMAV_HOST` y opcionalmente `CLAMAV_PORT`; la demo permite PDF marcados como no escaneados solo en development/test. Véase [operación de trabajos](trabajos-envios.md).

```powershell
npm run db:generate
npm run openapi
```

Revisar y versionar SQL, snapshots y journal de Drizzle juntos. FORCE, privilegios, triggers y resolvedor de dominios están en la migración SQL manual. Las migraciones no se ejecutan automáticamente al arrancar la API.

El contrato OpenAPI se genera sin abrir listener ni conexión a PostgreSQL. CI verifica que su regeneración y la del esquema no produzcan diferencias. Los contratos TypeScript compartidos no exportan entidades de Drizzle.

## Aislamiento del entorno de prueba

El cluster usa un puerto libre en `127.0.0.1` y autenticación `trust` para datos exclusivamente ficticios. Otros procesos locales pueden acceder mientras esté activo. El rol de aprovisionamiento es privilegiado únicamente en esa instancia; el migrador y el runtime son distintos. Esta configuración no sirve como despliegue productivo.

Los datos y logs permanecen en `.local/` ignorados por Git. El cierre normal detiene los procesos. Si una interrupción abrupta los dejara abiertos, detener solo la ruta de esa ejecución con `pg_ctl -D <ruta-absoluta-a-.local/api-UUID/data> -m fast -w stop`. No usar el directorio del servicio PostgreSQL instalado.
