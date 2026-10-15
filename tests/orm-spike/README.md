# Prueba técnica: ORM y aislamiento PostgreSQL

Comparación ejecutable y aislada de Prisma 7 y Drizzle. No es la API de SEP ni implementa RBAC, resolución de dominio o autenticación.

## Entorno comprobado

Windows, Node.js 22.23.2, npm 10.9.2 y PostgreSQL 18.4. Las versiones de dependencias están fijadas en `package.json` y `package-lock.json`.

| Componente | Versión |
|---|---|
| Prisma CLI, Client y adaptador PostgreSQL | 7.10.0 |
| Drizzle ORM | 0.45.4 |
| Drizzle Kit | 0.31.11 |
| node-postgres (`pg`) | 8.23.1 |
| TypeScript | 7.0.2 |
| tsx | 4.23.15 |

Se evaluó la versión estable 7 de Prisma. La etiqueta `latest` del CLI resolvía a `8.0.0-rc.22` durante la consulta; no se mezclaron CLI 8 y cliente 7. Estos resultados no evalúan Prisma 8.

## Ejecutar

Desde la raíz del repositorio:

```powershell
cd tests/orm-spike
npm ci
npm run generate:prisma
npm run typecheck
npm test
```

El lanzador localiza PostgreSQL en `C:/Program Files/PostgreSQL/18/bin` en Windows. Si está instalado en otra ruta, configurar antes:

```powershell
$env:SEP_PG_BIN = 'C:/ruta/postgresql/bin'
```

En Linux, poner `initdb` y `pg_ctl` en PATH o definir `SEP_PG_BIN` con su directorio. `initdb` debe ejecutarse como un usuario ordinario, no como root. El lanzador está diseñado para ambos sistemas; solo se ha ejecutado en Windows.

`npm test` crea un cluster nuevo en `.local/run-<UUID>/data`, elige un puerto libre y escucha solo en `127.0.0.1`. Utiliza autenticación `trust` únicamente para esta instancia temporal con datos ficticios; cualquier proceso local puede acceder mientras esté activa. Este mecanismo no es una configuración de producción.

El script no conecta con el servicio PostgreSQL instalado ni acepta una URL externa para ejecutar la suite. Crea dos bases, un rol migrador propietario y otro de ejecución sin superusuario ni `BYPASSRLS`. Aplica tres migraciones por ORM, repite su aplicación, ejecuta los mismos casos y detiene la instancia en `finally`. Retiene datos y logs ignorados por Git para inspección. En Windows inicia procesos sin ventanas visibles y redirige `pg_ctl` a un archivo para evitar herencia de pipes.

Si el proceso completo fuera interrumpido abruptamente y quedara una instancia abierta, detener únicamente el cluster de esa ejecución:

```powershell
& "$env:SEP_PG_BIN/pg_ctl.exe" -D '.local/run-<UUID>/data' -m fast -w stop
```

Usar la ruta real de `pg_ctl` si `SEP_PG_BIN` no está definido. No aplicar este comando al directorio del servicio existente.

## Estructura y migraciones

| Archivo/directorio | Función |
|---|---|
| `prisma/schema.prisma` | Modelo Prisma final. |
| `prisma/migrations/` | Creación generada, RLS manual y evolución generada de columna. |
| `schema-drizzle.ts` | Modelo Drizzle final y política RLS declarativa. |
| `drizzle/` | Creación generada con política, FORCE/grants manuales y evolución generada. |
| `adapters.ts` | Mismo contrato de prueba con consultas ORM y contexto transaccional parametrizado. |
| `isolation.test.ts` | Comprobaciones positivas y negativas sobre PostgreSQL real. |
| `run-spike.mjs` | Aprovisionamiento, migración, ejecución y cierre de instancia aislada. |

Las tablas de organizaciones y eventos solo sirven de fixtures y referencias. Se aplica RLS a `private_records`, el recurso privado bajo prueba. No se pretende que el esquema de prueba sustituya al modelo completo de dominio.

La evolución añade `description` después de activar RLS y FORCE. La suite comprueba que ambos controles y la política siguen presentes. Los roles se crean en el aprovisionamiento del cluster; Drizzle referencia el rol existente y no lo aprovisiona desde su modelo.

Para generar cambios adicionales de Drizzle, `npm run generate:drizzle` compara con los snapshots versionados. En Prisma se utilizó `prisma migrate diff` para generar el SQL inicial y la evolución, y `prisma migrate deploy` para aplicarlo. No se usó `db push`, ni se modificó una base de datos existente. No se probó `prisma migrate dev` con shadow database.

## Resultado y límites

La ejecución registrada pasó 16 casos por ORM: 32 comprobaciones funcionales y 2 grupos de prueba, reportados como 34 tests aprobados por Node. También pasó `npm run typecheck`.

Casos: catálogos de seguridad y evolución; denegación sin contexto; listas aisladas A1/A2/B1; sustitución de IDs; contexto incompatible o parcial; updates/deletes ajenos; inserts ajenos; CRUD propio; rollback; limpieza tras commit; concurrencia con cuatro conexiones; FK compuesta; FORCE sobre el propietario; UUID inválido; SQL directo que intenta desactivar RLS, truncar o mover filas; SQL directo sin contexto.

La prueba valida que RLS aplica el contexto establecido por código confiable. El rol de ejecución puede establecer variables de sesión; RLS no autentica esos valores ni impide que una aplicación comprometida elija otro contexto válido. La futura API debe resolver y autorizar el contexto antes de abrir la transacción, usar consultas parametrizadas y conservar filtros explícitos además de RLS.

No se probaron dominios, JWT/OIDC, roles de usuario, colas, archivos, identidad global, restauración, PgBouncer, cargas de producción, fallos parciales de migración, upgrades de versiones ni plataformas Linux. Los tiempos de esta suite no son un benchmark comparativo.

Referencias: [ADR-003](../../docs/adr/ADR-003-orm-aislamiento.md), [informe de resultados](../../docs/architecture/prueba-orm.md).
