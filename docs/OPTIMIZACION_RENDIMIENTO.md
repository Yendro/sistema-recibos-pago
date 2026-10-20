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

## Siguientes optimizaciones candidatas

Después de medir esta implementación se evaluarán, por separado:

1. Convertir el índice global en una proyección compacta.
2. Almacenar en caché pendientes y páginas frecuentes menores de 100 KB.
3. Guardar los identificadores de carpetas por periodo.
4. Evitar la actualización de Sheets durante la firma si el reporte solo debe
   contener recibos enviados.
5. Reducir el alcance del bloqueo global durante la conversión del PDF.

No se aplicarán todas simultáneamente: cada cambio debe medirse y conservar una
ruta de reversión clara.
