# Optimización de rendimiento

## Objetivo

Reducir la espera percibida durante la creación, consulta y firma de recibos sin
cambiar la fuente de verdad, el formato de los JSON ni el comportamiento
funcional validado en producción.

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

1. Abre Operación después de desplegar y mide por separado el tiempo hasta que
   aparece la captura y el tiempo hasta que termina el historial.
2. Recarga la ruta dentro de los siguientes diez minutos. El estado de recibos
   debe resolverse desde la proyección en caché.
3. Crea un recibo de prueba y vuelve a cargar. La captura y el historial deben
   conservar el comportamiento rápido sin esperar una lectura adicional para
   reconstruir la caché.
4. Abre el diálogo de envío y confirma que los contactos se carguen en ese
   momento, sin formar parte de la apertura inicial.

## Siguientes optimizaciones candidatas

Después de medir esta implementación se evaluarán, por separado:

1. Almacenar en caché páginas de historial solicitadas repetidamente.
2. Guardar los identificadores de carpetas por periodo.
3. Evitar la actualización de Sheets durante la firma si el reporte solo debe
   contener recibos enviados.
4. Reducir el alcance del bloqueo global durante la conversión del PDF.

No se aplicarán todas simultáneamente: cada cambio debe medirse y conservar una
ruta de reversión clara.
