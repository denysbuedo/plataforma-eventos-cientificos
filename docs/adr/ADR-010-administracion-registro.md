# ADR-010: administración de organización y dominios

Estado: implementado; validación funcional pendiente por decisión del propietario.

## Contexto

Las organizaciones y dominios constituyen el registro que resuelve el contexto de cada petición. El runtime no tiene acceso directo a estas tablas. Hace falta editar datos institucionales y registrar dominios de eventos sin permitir cambiar de organización ni declarar como verificado un host enviado por el cliente.

## Decisión

Se mantienen las tablas de registro sin grants directos al runtime. Funciones SQL específicas SECURITY DEFINER con search_path fijo permiten consultar y modificar exclusivamente la organización del contexto transaccional, tras comprobar una asignación administrativa vigente. Los datos de perfil admiten control optimista por revisión. Las operaciones quedan auditadas en la misma transacción.

Con FORCE RLS, el propietario sep_migrator de estas funciones también necesita políticas explícitas para leer el actor, su membresía y sus roles vigentes al comprobar la autorización. Las migraciones correctivas 0013 y 0014 limitan esas lecturas al actor y organización del contexto administrativo. Para bloquear el evento durante el registro se permite UPDATE USING en ese contexto con WITH CHECK false: habilita SELECT FOR UPDATE, pero impide escribir la fila mediante esa política. No se desactiva RLS ni se conceden privilegios adicionales a sep_runtime.

La API exige administrador de organización y un dominio de organización sin evento seleccionado. No permite crear organizaciones, cambiar su identificador, desactivarlas o modificar el acceso administrativo desde esta pantalla. El alta de instituciones y la provisión de sus direcciones administrativas siguen siendo tareas del operador de plataforma.

Los dominios nuevos solo pueden asociarse a eventos no archivados de la misma organización. El nombre se normaliza a minúsculas, es globalmente único, no admite protocolo, puerto, ruta, wildcard o IP y tiene hasta 235 caracteres para que el nombre TXT completo sea válido. Se admiten nombres ASCII y etiquetas punycode con TLD alfabético. Se rechazan sufijos locales/reservados conocidos. El máximo por organización es 100 registros, incluyendo su acceso administrativo.

Cada registro nuevo queda inactivo y sin verificar, con un desafío aleatorio. La propiedad se verifica consultando TXT en `_sep-verification.<hostname>` con valor `sep-domain-verification=<token>`. La consulta DNS tiene un tiempo de espera limitado y ocurre fuera de la transacción. Antes de guardar se vuelven a comprobar los permisos, el registro y su desafío. El navegador nunca determina el resultado de verificación.

La activación requiere verificación, una marca de preparación TLS registrada por operaciones y una comprobación DNS nueva. SEP no instala certificados ni cambia DNS, Nginx o proxies. La marca TLS es una declaración del operador tras comprobar la infraestructura, no una comprobación automática de certificados. El runtime no tiene función ni grant para cambiarla. El resolver conserva su exigencia de dominio activo, verificado y organización activa.

Se pueden desactivar dominios de evento y eliminar registros inactivos. No se puede desactivar ni eliminar el ingreso de organización, reasignar un host a otro evento o cambiar su nombre. Una reasignación requiere desactivar, eliminar y registrar nuevamente, con otra verificación. Los accesos existentes se preservan; al desactivar un registro antiguo sin desafío se genera uno y se exige nueva verificación para volver a activarlo.

## Consecuencias y límites

El administrador puede preparar dominios sin bloquear su acceso institucional. DNS verificado no implica evento publicado ni HTTPS configurado. Los portales siguen usando las instantáneas publicadas existentes.

La propiedad se comprueba al verificar y activar, no periódicamente. La caducidad de certificados, revisión periódica de DNS y limpieza de registros abandonados quedan pendientes de automatización operativa. La marca TLS de registros previamente activos se conserva como provisión histórica; no es evidencia de una comprobación nueva. En la demo los dominios ficticios no podrán superar DNS real. No se incorpora un bypass de verificación.

No se amplían los privilegios del runtime sobre las tablas de registro ni se modifica la integración de identidad aplazada. La validación funcional del incremento y las pruebas negativas adicionales siguen pendientes.
