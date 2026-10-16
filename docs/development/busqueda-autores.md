# Búsqueda de personas registradas

Implementado: perfil de investigador, visibilidad voluntaria y búsqueda previa a la declaración manual. Elegir una persona conserva una referencia a su cuenta; no confirma que acepte ser autora y no concede acceso al trabajo.

## Preparar el perfil

En **Mi perfil → Datos del investigador → Editar**, completar nombre, instituciones y países. Se admiten cinco afiliaciones y se validan países y duplicados. Guardar actualiza el nombre visible de la cuenta y los datos para futuras declaraciones propias; no cambia la autoría de trabajos existentes ni sus versiones.

Activar **Permitir que otros usuarios me encuentren para añadirme como autor** si se desea aparecer. Para ello se necesita al menos una afiliación completa. La visibilidad está desactivada por defecto; no se publican automáticamente los perfiles anteriores. Cerrar con cambios ofrece guardar, descartar o seguir editando. Actualizar perfil permite consultar su estado después de cambios desde otra sesión.

El directorio muestra nombre, afiliaciones y ORCID conectado en producción. No incluye correo, identidades de acceso, roles, solicitudes ni datos de trabajos. ORCID Sandbox sigue visible solo en el perfil propio y en declaraciones guardadas que lo contengan; no se usa como identificador de producción del directorio. Ocultar el perfil retira las nuevas coincidencias sin borrar las copias que ya se guardaron en trabajos.

## Añadir o vincular autores

1. Como remitente original, abrir **Editar trabajo → Autores y afiliaciones → Añadir autor**.
2. Buscar por nombre, institución u ORCID de producción, con al menos tres caracteres. Se devuelven como máximo diez coincidencias. El nombre y la institución admiten búsqueda literal parcial; ORCID coincide exactamente. Se acepta también su enlace https://orcid.org/… como consulta.
3. Seleccionar explícitamente una persona. Se cargan nombre, afiliaciones, país y el identificador disponible. El correo no se copia: completar el contacto si se necesita, especialmente para correspondencia.
4. La declaración queda como **Persona registrada · Autoría pendiente de confirmación**. Guardar valida de nuevo que la persona siga visible y activa. El servidor calcula ORCID y confirmación; no confía en los indicadores enviados por el navegador.
5. En una declaración manual existente, **Buscar persona para este autor** permite seleccionar una cuenta conservando el identificador de esa declaración, su orden, correspondencia y contacto. Se cargan los datos del perfil seleccionado. No se fusionan filas por nombre.
6. Si no aparece, elegir **Declarar autor manualmente** o continuar con la declaración existente. La persona puede no estar registrada o haber ocultado su perfil. Esto no crea una cuenta. No se admiten dos referencias a la misma persona en el trabajo.

**Añadirme con mis datos** sigue disponible para la propia cuenta aunque no publique su perfil. Ahora reutiliza también los países guardados. **Quitar vinculación y declarar manualmente** retira la referencia en la edición pendiente; al guardar se recalculan indicadores y, si cambia la correspondencia vinculada, se aplican las reglas de revocación de gestión compartida.

Una selección no añade el trabajo al espacio privado de esa otra persona. El acceso de gestión sigue requiriendo la invitación y aceptación implementadas por separado. La aceptación válida del autor de correspondencia confirma su vinculación; el reconocimiento general de coautores con aprobación continúa pendiente. Un ORCID autenticado acredita el identificador de la cuenta, no la aceptación de cada autoría.

## API y aislamiento

| Método y ruta bajo `/api/v1` | Operación |
|---|---|
| GET `/me` | Perfil propio, visibilidad, afiliaciones, revisión y ORCID propio |
| PUT `/me/researcher-profile` | Guarda name, affiliations, discoverable y revision de la cuenta autenticada |
| GET `/researchers?q=…` | Hasta diez perfiles visibles y activos, sin contactos privados |

El directorio es global entre organizaciones porque las personas pueden colaborar entre instituciones y eventos. Ese alcance se limita a metadatos que optaron por mostrar; no modifica los límites de organizaciones, eventos o trabajos.

Aplicar migraciones 0034–0036. `researcher_profiles` conserva RLS/FORCE de su propietario. Una función SECURITY DEFINER acotada consulta la proyección visible, comprueba la cuenta activa, limita resultados y restablece su contexto al terminar o fallar. El runtime no obtiene lectura directa de perfiles ajenos, correos o conexiones ORCID. Una política restrictiva permite cambiar el nombre solo a su propietario, incluso con contexto administrativo. La búsqueda está limitada a sesenta consultas por minuto y cuenta en cada proceso API; una futura operación con múltiples procesos necesitará coordinación del límite.

Los datos de autoría guardados son instantáneas del trabajo. Los cambios de perfil o visibilidad no actualizan versiones antiguas ni otorgan edición. No hay fusión automática de personas, reconocimiento retrospectivo ni envío de correo.

## Verificación

Pasaron comprobaciones dirigidas con sep_runtime, transacciones revertidas y funciones reales: visibilidad inicial privada, alta/baja voluntaria, revisión optimista, afiliaciones, búsqueda por institución y ORCID de producción, omisión de contactos e identificadores Sandbox, alcance global de metadatos visibles, límites de resultados y aislamiento RLS. Se rechazó acceso desde un actor inexistente y el cambio del nombre de otra persona con contexto administrativo.

La comprobación de gestión compartida también verificó que seleccionar una persona no confirma autoría ni concede acceso, aunque el cliente envíe indicadores falsificados. Aceptar la invitación, corregir y reenviar siguió funcionando. Se preservaron nombres, trabajos, publicaciones y conexiones ORCID existentes de la demo. La batería completa y las interacciones por navegador siguen pendientes.

Compilación y análisis estático correctos. Las comprobaciones HTTP verificaron el perfil en ambos idiomas, búsqueda autenticada por el gateway, rechazo de consulta corta y anónima, y control de revisión al guardar sin modificar datos. La demo mantuvo privados sus perfiles originales, conservó ORCID Sandbox y siguió respondiendo en trabajos, invitaciones y portal público.
