# Fase 1: primer incremento visual

El avance solicitado después de la demo de API inicia esta fase sobre la base técnica de Fase 0. Este incremento incorpora dos clientes Next.js que consumen la API existente.

## Disponible

- Portales ficticios Biosfera y Horizontes, con temas independientes, español e inglés y diseño adaptable.
- Acceso local de demostración para organizador, administrador de organización y participante.
- Resumen con datos reales de eventos accesibles, creación de borradores por administrador y edición de nombres por organizador.
- CMS bilingüe para portada, presentación, convocatoria, temas, sede, fechas y contacto; selección de apariencia.
- Guardado privado y publicación explícita de una instantánea; control de revisiones para impedir sobrescrituras obsoletas.
- Permisos comprobados en cada operación de API y aislamiento RLS para borradores y publicaciones; auditoría en la misma transacción.

El participante puede iniciar sesión, pero no administrar el evento donde solo tiene ese rol. El administrador consulta el contenido de su organización; editar o publicar exige además la asignación de organizador.

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

OIDC real y MFA, administración de organizaciones/dominios/asignaciones, verificación DNS y TLS, carga de marca y archivos y ampliación del CMS. Los eventos creados desde la demo no reciben automáticamente un dominio ni organizadores. Los módulos científicos pertenecen a fases posteriores.

La autenticación de demostración no es un despliegue productivo. Los botones de perfiles solo están habilitados con configuración local explícita; no se deben publicar en Internet.
