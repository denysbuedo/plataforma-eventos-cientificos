# Cobros, medios de pago y monedas

Decisión institucional: permitir efectivo y uno o varios proveedores por evento, con importes en CUP, USD y EUR. Transfermóvil y Enzona se incluyen como medios configurables para CUP. Las ediciones pueden usar catálogos distintos.

Estado: catálogo, tarifas, cobros y conciliación manual implementados. La configuración genérica no implementa las API particulares ni la confirmación automática de una pasarela.

## Configuración del organizador

En **Cobros y pagos → Configuración**:

1. Añadir medios de pago: nombre, tipo efectivo/pasarela, monedas, instrucciones, enlace público HTTPS opcional y datos públicos del comercio mediante etiquetas y valores.
2. Añadir tarifas con precio explícito por moneda. No se calculan equivalencias ni se suman monedas diferentes. Los importes se almacenan con dos decimales y se suman en unidades menores enteras.
3. Habilitar recepción de pagos cuando haya medios activos. Un evento nuevo comienza deshabilitado y sin tarifas.

Los datos del catálogo son visibles a participantes: no introducir claves privadas, contraseñas, tokens, números de tarjeta ni credenciales API. La configuración de enlaces de pago y datos del comercio puede variar por edición. Los identificadores de medios y tarifas se conservan; se archivan en vez de eliminarlos. Cada cambio mantiene revisión, motivo, actor y configuración anterior/posterior.

## Flujo de cobro

- El participante inscrito puede seleccionar una tarifa y moneda; el organizador también puede crearle el cobro. Se congela nombre, tarifa, importe y moneda. Cambiar precios después no altera cobros existentes. Se impide duplicar una tarifa activa para una misma persona.
- El participante consulta instrucciones/enlace y, después de pagar por el medio externo, comunica referencia e información de verificación. El cobro queda **Pago comunicado · Por verificar**, sin confirmar inscripción o asistencia.
- El organizador contrasta la transacción con el proveedor o caja y registra **Pagado**, con medio, referencia y motivo. Solo el equipo confirma efectivo mediante referencia de recibo de caja. No se confía en un clic, captura, enlace de retorno o declaración del participante.
- Una referencia confirmada no puede aplicarse a otro cobro del mismo medio y evento. Se conserva también después de un reembolso.
- Se permite devolver un pago comunicado a pendiente, declarar exención, anular cobros pendientes o registrar un reembolso total ya realizado. El reembolso exige motivo con su referencia; el sistema no mueve dinero ni llama a una pasarela.
- Los estados finales no se reabren libremente. Pagado solo pasa a reembolsado. El historial inmutable conserva la transacción original, sus revisiones y sus decisiones.

Se generan avisos al participante y al equipo organizador cuando se comunica un pago. Los totales muestran cobrado vigente, reembolsado y por cobrar, separados por moneda. No constituyen factura fiscal ni contabilidad general. Un cobro pagado no concede por sí mismo inscripción confirmada, acreditación, aceptación científica o certificado.

## Alcance de Transfermóvil, Enzona y futuros proveedores

El catálogo admite varios nombres, monedas, instrucciones y enlaces sin cambios de código. Para **automatizar** la creación de órdenes, firma/verificación de notificaciones, consulta de estado o reembolso se necesita un adaptador específico por proveedor y su contrato técnico, entorno y credenciales. Un formulario genérico no puede inferir esos protocolos. Esos adaptadores y la conciliación automática permanecen pendientes; no hay endpoints que acepten un supuesto pago confirmado desde el navegador.

El catálogo de demostración contiene Transfermóvil, Enzona, efectivo y un proveedor internacional deshabilitado. Sus instrucciones son ficticias y no contienen cuentas ni enlaces de cobro reales. No hacer transferencias para probarlo.

No incluye pagos parciales, cuotas, cambio de divisas, emisión fiscal, conexión bancaria, arqueo/cierre de caja ni rol independiente de cajero; por ahora confirma el organizador. Estos son ampliaciones explícitas, no opciones ocultas.

Límites iniciales: veinte medios, cincuenta tarifas, mil cobros/inscripciones consultables y cien movimientos recientes. API: `/events/:eventId/payments`, `/settings`, `/charges`, `/mine` y acciones de comunicación/decisión; [OpenAPI](../api/openapi.json).
