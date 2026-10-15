# Fase 1: primer incremento visual

El avance solicitado después de la demo de API inicia esta fase sobre la base técnica de Fase 0. Este incremento incorpora dos clientes Next.js que consumen la API existente.

## Disponible

- Portales ficticios Biosfera y Horizontes, con temas independientes, español e inglés y diseño adaptable.
- Acceso local de demostración para organizador, administrador de organización y participante.
- Adaptador OIDC y flujo de acceso institucional implementados; activación pendiente de realm, cliente y configuración del Keycloak de RedUniv. El login puede crear el perfil local, sin conceder roles. No se ha validado todavía contra el proveedor.
- Resumen con datos reales de eventos accesibles, creación de borradores por administrador y edición de nombres por organizador.
- Sección Equipo para designar y retirar organizadores entre personas activas vinculadas a la organización. El administrador puede asignarse a sí mismo y continuar al editor con la misma sesión.
- Sección Personas con directorio e invitaciones por enlace: creación, caducidad de siete días, cancelación y aceptación por una cuenta autenticada. La aceptación vincula la persona a la organización sin concederle roles de evento.
- Acceso administrativo a eventos recién creados mediante el dominio de la organización, sin exigir un dominio público propio.
- CMS bilingüe para portada, presentación, convocatoria, temas, sede, fechas y contacto; selección de apariencia.
- Guardado privado y publicación explícita de una instantánea; control de revisiones para impedir sobrescrituras obsoletas.
- Permisos comprobados en cada operación de API y aislamiento RLS para borradores y publicaciones; auditoría en la misma transacción.

El participante puede iniciar sesión, pero no administrar el evento donde solo tiene ese rol. El administrador consulta el contenido de su organización; editar o publicar exige además la asignación de organizador. Puede obtenerla con «Organizar este evento» o designar otras personas desde Equipo. No se permite retirar la asignación propia ni la del último organizador activo. Los cambios quedan auditados con actor, evento y persona afectada.

## Ejecutar y verificar

```powershell
npm ci
npm run build
npx playwright install chromium
npm run test:web
npm run dev:demo
```

El lanzador imprime las direcciones públicas y administrativas. Abrir exactamente esas URLs: el origen administrativo configurado se usa para comprobar las solicitudes que modifican datos. No requiere DNS local ni cabeceras manuales para navegar. Los fixtures y las sesiones son exclusivos de cada ejecución.

Las pruebas de navegador cubren los tres accesos, cierre de sesión, rechazo de orígenes externos y cookies falsas, guardado/publicación y portales móviles bilingües. Las pruebas de API cubren permisos, revisiones, validación, publicaciones y aislamiento entre eventos.

## Pendiente para cerrar Fase 1

Activación y validación de OIDC con el proveedor institucional, MFA y registro según sus políticas, renovación/cierre global SSO, administración de organizaciones y dominios, entrega de invitaciones por correo, suspensión de membresías, otros roles operativos, verificación DNS y TLS, carga de marca y archivos y ampliación del CMS. La restricción al correo verificado está implementada en modo OIDC. Los eventos creados no reciben automáticamente un dominio público ni organizadores; el administrador puede designar responsables inmediatamente. Los módulos científicos pertenecen a fases posteriores.

La asignación de organizadores y las invitaciones son incrementos posteriores a las pruebas descritas arriba. A petición del propietario, su validación funcional y las nuevas pruebas quedan pendientes; la compilación no sustituye esa validación. Los enlaces se comparten manualmente. En la demo, la pantalla de aceptación permite cambiar al perfil ficticio Invitado; no se generan cuentas reales ni se verifica el correo. Ver [ADR-007](../adr/ADR-007-personas-invitaciones.md).

La autenticación de demostración no es un despliegue productivo. Los botones de perfiles solo están habilitados con configuración local explícita; no se deben publicar en Internet. La integración institucional está descrita en la [guía OIDC](../development/identidad-institucional.md); la demo sigue activa hasta disponer de esa configuración.
