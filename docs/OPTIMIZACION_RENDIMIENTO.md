# Optimización de rendimiento

## Objetivo

Reducir la espera percibida durante la creación, consulta y firma de recibos sin
cambiar la fuente de verdad ni el comportamiento funcional validado en
producción. Los archivos mensuales conservan el recibo completo; el índice,
por ser un dato reconstruible, puede utilizar una proyección más pequeña.

## Línea base revisada

La muestra revisada el 20 de octubre de 2026 contiene:

| Archivo | Tamaño | Registros |
| --- | ---: | ---: |
| `indice-recibos.json` | 358.35 KB | 298 recibos |
| `contactos.json` | 8.17 KB | 28 contactos |
| `tipos-recibo.json` | 1.15 KB | 2 tipos |
| `configuracion.json` | 0.15 KB | 4 propiedades |

El volumen no justifica por sí solo esperas superiores a cinco segundos. El
costo principal proviene de llamadas consecutivas a Drive y Sheets, así como de
la lectura y sobrescritura completa de los documentos JSON.

Después de reconstruir el índice con la versión de estructura 5, la misma
muestra ocupa aproximadamente 106 KB. La reducción observada es cercana al 70%,
pero el documento todavía supera el límite seguro de 95 KB definido para una
entrada de `CacheService`; por ello no se intenta conservar el índice completo
en una sola clave.

## Primera implementación

Al localizar un recibo, el repositorio ya necesita leer el índice para obtener
el archivo mensual correspondiente. Anteriormente, después de modificar el
recibo, volvía a descargar el índice completo antes de guardarlo.

La primera optimización conserva el índice leído durante la búsqueda y lo
reutiliza en:

- Firma y generación del PDF.
- Envío por correo.
- Eliminación de recibos no enviados.

El cambio elimina una lectura completa de `indice-recibos.json` por mutación y
mantiene sin cambios:

- Los archivos mensuales como fuente operativa.
- El esquema actual del índice.
- Los bloqueos y reglas de estados.
- La recuperación mediante reconstrucción del índice.
- El reporte, el PDF y el correo.

## Segunda implementación: carga progresiva

La apertura de Operación ya no espera una respuesta monolítica. El flujo se
divide en tres consultas según la necesidad real de la interfaz:

1. **Arranque:** comprueba la instalación y obtiene únicamente los tipos de
   recibo activos. La captura se habilita después de esta respuesta.
2. **Estado de recibos:** carga en segundo plano el resumen, los pendientes y la
   primera página del historial.
3. **Contactos:** se consultan solamente cuando se abre el diálogo de envío.

El estado operativo utiliza una proyección de ocho campos por recibo, suficiente
para las listas y acciones visibles. No transmite al navegador identificadores
de archivos mensuales, firma, fotografía, destinatarios ni otros campos que
solo requiere el servidor.

La proyección se conserva durante diez minutos en `CacheService` cuando ocupa
menos de 95 KB. Cada escritura del índice la vuelve a construir utilizando los
datos que ya están en memoria; por lo tanto, crear, firmar, enviar o eliminar un
recibo no obliga a descargar de nuevo el índice en la siguiente apertura.

La caché es una aceleración y no una fuente de verdad. Si Google la expulsa o no
está disponible, el sistema vuelve a leer `indice-recibos.json`, reconstruye la
respuesta y continúa operando. Un fallo de caché nunca invalida una escritura.

## Tercera implementación: índice derivado compacto

La muestra de 298 recibos tenía un índice de 358.35 KB porque cada entrada
duplicaba todos los campos conservados en el archivo mensual. Ese contenido se
descargaba y sobrescribía en cada mutación aunque la interfaz y la localización
de un recibo solo necesitan diez campos.

La versión de estructura 5 reconstruye `indice-recibos.json` con:

- Identificador, folio, cliente, concepto e importe.
- Nombre del tipo, estado, URL del PDF y fecha de creación.
- Identificador del archivo mensual que conserva el recibo completo.

El índice y los archivos mensuales se serializan sin espacios de presentación
al ser escritos. Esto no elimina información del recibo: firma, fotografía,
destinatarios, fechas operativas y demás campos permanecen en su archivo
mensual y en los artefactos correspondientes.

Después de desplegar esta implementación debe ejecutarse nuevamente
`inicializarSistemaPruebas()`. El inicializador es idempotente, reutiliza los
recursos existentes y reconstruye el índice compacto a partir de los archivos
mensuales ya importados.

## Cuarta implementación: apertura de firma por niveles

La preparación de la firma ya no necesita recorrer siempre el índice y los
documentos de configuración. La consulta utiliza los siguientes niveles, en
este orden:

1. **Recibo pendiente:** cada recibo recién creado se conserva durante diez
   minutos en una clave individual. Abrirlo para firmar no requiere volver a
   leer el índice ni el archivo mensual.
2. **Mapa de archivos:** se conserva durante hasta seis horas una relación
   compacta entre el identificador del recibo y su archivo mensual. El mapa se
   divide en 16 segmentos para no depender de una sola entrada de 100 KB y para
   mantener el mismo acceso conforme crezca el historial. Si el recibo
   individual ya no está en memoria, solo se descarga su archivo mensual.
3. **Fuente de verdad:** si Google expulsa la caché, el sistema utiliza el flujo
   anterior, lee el índice y localiza el recibo sin perder funcionalidad.

Los tipos de recibo completos también se conservan hasta seis horas y se
invalidan inmediatamente al modificar la configuración. Los logotipos menores
de 95 KB se conservan como URL de datos durante el mismo periodo. Un logotipo
mayor continúa leyéndose desde Drive para respetar el límite de tamaño por clave
de `CacheService`.

La caché individual solo admite recibos en estado `PENDIENTE_FIRMA` o
`ERROR_PDF`. Se actualiza si falla la generación y se elimina al firmar, enviar
o borrar el recibo. Los archivos JSON mensuales siguen siendo la fuente de
verdad y las operaciones de escritura conservan los bloqueos existentes.

Cada llamada a `obtenerReciboParaFirma` registra un evento
`RENDIMIENTO_APERTURA_FIRMA` en **Ejecuciones** de Apps Script. El evento no
incluye folio, cliente, concepto ni identificadores; únicamente informa:

- `origenRecibo`: `MEMORIA_RECIBO`, `MAPA_ARCHIVO` o `INDICE`.
- `lecturaReciboMs`: tiempo dedicado a localizar el recibo.
- `tipoReciboMs`: tiempo de lectura de su configuración.
- `logotipoMs`: tiempo de preparación del logotipo.
- `totalMs`: duración del trabajo del servidor antes de responder.

Como objetivo práctico para este volumen, una apertura desde memoria debería
resolverse en menos de 1.5 segundos y una apertura fría entre 2 y 3 segundos.
Son objetivos de medición del proyecto, no garantías de Google: el arranque en
frío de Apps Script y la red todavía pueden añadir variación. La generación del
PDF realiza escrituras, conversión y validación de imágenes; entre 4 y 8
segundos se considera un resultado saludable para esta arquitectura.

## Validación en el entorno aislado

1. Despliega la rama mediante la
   [guía del entorno de pruebas](IMPLEMENTACION_PRUEBAS.md).
2. Inserta únicamente `?ruta=operacion` en el Google Site de pruebas.
3. Utiliza un conjunto representativo de recibos. La
   [copia controlada de datos](COPIA_DATOS_PRUEBAS.md) reproduce los archivos
   mensuales sin conectar pruebas a los recursos operativos de producción.
4. Ejecuta al menos cinco veces cada flujo y separa la primera ejecución de las
   siguientes:
   - Abrir Operación.
   - Crear un recibo.
   - Abrirlo para firma.
   - Firmar y generar el PDF.
   - Enviar el correo.
5. Registra la duración visible y la duración informada en **Ejecuciones** de
   Apps Script.
6. Comprueba que el recibo mensual, el índice, el PDF y el reporte conserven el
   mismo resultado funcional.

Para validar la carga progresiva con los 298 registros importados:

1. Ejecuta `inicializarSistemaPruebas()` y confirma `versionEsperada: 5`.
2. Abre Operación después de desplegar y mide por separado el tiempo hasta que
   aparece la captura y el tiempo hasta que termina el historial.
3. Recarga la ruta dentro de los siguientes diez minutos. El estado de recibos
   debe resolverse desde la proyección en caché.
4. Crea un recibo de prueba y vuelve a cargar. La captura y el historial deben
   conservar el comportamiento rápido sin esperar una lectura adicional para
   reconstruir la caché.
5. Abre el diálogo de envío y confirma que los contactos se carguen en ese
   momento, sin formar parte de la apertura inicial.

Para validar la apertura optimizada:

1. No vuelvas a ejecutar el inicializador; esta implementación no cambia la
   estructura persistida.
2. Crea un lote de cuatro recibos y abre cada uno una sola vez. En
   **Ejecuciones**, los cuatro eventos deben indicar
   `origenRecibo: MEMORIA_RECIBO`.
3. Cierra y vuelve a abrir uno dentro de diez minutos. Debe conservar el mismo
   origen y no realizar lecturas del índice o del archivo mensual.
4. Después de que expire la caché individual, abre un pendiente existente. Si
   el mapa continúa disponible, el evento debe indicar `MAPA_ARCHIVO`.
5. Compara `lecturaReciboMs`, `tipoReciboMs`, `logotipoMs` y `totalMs` en al
   menos cinco aperturas. Esto permite identificar si la espera restante es del
   servidor o del renderizado en la tableta.
6. Firma uno de los recibos y confirma que el PDF, el índice, el archivo mensual
   y el reporte conserven el mismo resultado funcional.

## Siguientes optimizaciones candidatas

Después de medir esta implementación se evaluarán, por separado:

1. Almacenar en caché páginas de historial solicitadas repetidamente.
2. Guardar los identificadores de carpetas por periodo.
3. Dividir en fragmentos la caché de logotipos únicamente si las métricas
   demuestran que sus archivos superan 95 KB y dominan la apertura.
4. Evitar la actualización de Sheets durante la firma si el reporte solo debe
   contener recibos enviados.
5. Reducir el alcance del bloqueo global durante la conversión del PDF.

No se aplicarán todas simultáneamente: cada cambio debe medirse y conservar una
ruta de reversión clara.
