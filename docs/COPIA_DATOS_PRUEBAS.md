# Copia controlada de datos para pruebas

## Propósito

El importador reproduce en el proyecto de pruebas el volumen real de los
archivos mensuales de producción. La herramienta permite medir rendimiento con
datos representativos sin conectar la aplicación de pruebas a los archivos
operativos de producción.

El código vive en `tests/apps_script/importador_datos_produccion.js` y el
despliegue productivo lo excluye mediante `.claspignore`. Solamente
`.claspignore.pruebas` permite subirlo al proyecto independiente de pruebas.

## Contrato de seguridad

El importador cumple estas reglas:

- Producción es de solo lectura. No cambia propiedades, archivos ni carpetas
  del origen.
- El directorio productivo y el directorio de pruebas deben ser distintos y no
  pueden contenerse entre sí.
- Exige que `ENTORNO_EJECUCION` tenga el valor `PRUEBAS`.
- Exige una confirmación de un solo uso antes de reemplazar datos.
- Conserva la configuración de correo y los contactos propios de pruebas.
- No copia contactos, destinatarios, PDF, firma ni fotografía.
- Marca la copia operativa de cada recibo histórico como `ENVIADO`, sin URL de
  PDF, para impedir su envío o eliminación desde la interfaz.
- Reconstruye el índice con los identificadores de los nuevos archivos de
  pruebas; nunca copia `indice-recibos.json` de producción.
- Vacía el reporte general de pruebas. Los registros históricos copiados sirven
  para medir lectura y navegación, pero no se convierten en filas de reporte.
- Conserva el estado anterior de pruebas dentro de la instantánea antes de
  retirar sus referencias operativas.

La copia sigue conteniendo nombres, conceptos e importes reales. Debe permanecer
en una carpeta y un despliegue privados, accesibles únicamente por la cuenta
propietaria.

## Requisitos

1. Trabaja en una rama distinta de `main`.
2. Usa un proyecto independiente de Apps Script para pruebas.
3. Ejecuta `inicializarSistemaPruebas()` y confirma que termine correctamente.
4. Despliega la rama con `npm run desplegar:pruebas`.
5. Identifica la carpeta `Sistema Recibos Pagos` utilizada por producción. Se
   necesita su identificador, no el identificador del proyecto de Apps Script.

## Configurar las propiedades de pruebas

En **Configuración del proyecto > Propiedades de la secuencia de comandos** del
proyecto de Apps Script de pruebas, registra:

| Propiedad | Valor |
| --- | --- |
| `ENTORNO_EJECUCION` | `PRUEBAS` |
| `ID_DIRECTORIO_RAIZ_PRODUCCION` | Identificador de la carpeta raíz productiva |

No registres estos valores en Git ni en archivos versionados.

## Diagnosticar antes de copiar

Ejecuta desde el editor de Apps Script:

```javascript
diagnosticarImportadorPruebas()
```

La respuesta debe ser exitosa y mostrar las cantidades esperadas de periodos,
recibos, tipos y logotipos. Esta función analiza el origen, pero no modifica el
origen ni el destino.

## Ejecutar la importación

Agrega temporalmente la tercera propiedad:

| Propiedad | Valor exacto |
| --- | --- |
| `CONFIRMACION_IMPORTACION_PRUEBAS` | `COPIAR_PRODUCCION_A_PRUEBAS` |

Después ejecuta:

```javascript
importarDatosProduccionParaPruebas()
```

La confirmación se elimina al comenzar. Para repetir el proceso es obligatorio
volver a registrarla; esto evita reemplazos accidentales por una segunda
ejecución.

## Resultado en Drive

La operación crea la siguiente estructura bajo `config/respaldos` del entorno
de pruebas:

```text
instantaneas-produccion/
└── AAAAMMDD-HHMMSS/
    ├── manifiesto-importacion.json
    ├── origen-produccion/
    │   ├── manifiesto-origen.json
    │   ├── config/tipos-recibo.json
    │   ├── logos/
    │   └── datos/AAAA/recibos-AAAA-MM.json
    └── estado-pruebas-anterior/
        ├── referencias-anteriores.json
        ├── reporte-general-anterior.json
        └── archivos operativos anteriores
```

La carpeta `origen-produccion` es una instantánea cruda para auditoría. La
aplicación no lee esos archivos. La copia operativa se crea en los directorios
normales de `datos`, `config` y `logos`, con identificadores exclusivos del
entorno de pruebas.

## Validación posterior

1. Vuelve a ejecutar `diagnosticarImportadorPruebas()`; no es necesario volver
   a registrar la confirmación para diagnosticar.
2. Abre `?ruta=operacion` y compara la cantidad y la paginación del historial.
3. Confirma que los registros importados se muestren como enviados, sin botones
   para enviar, eliminar o abrir PDF.
4. Crea un recibo nuevo de pruebas y completa firma, fotografía, PDF y envío.
5. Comprueba que el recibo nuevo use los tipos y logotipos copiados.
6. Confirma que el reporte general contenga únicamente operaciones nuevas del
   entorno de pruebas.

## Fallos y recuperación

La preparación utiliza archivos nuevos y solo después cambia las propiedades
del entorno de pruebas. Si ocurre un error:

- restaura las propiedades anteriores;
- restaura el contenido anterior del reporte;
- envía a la papelera los archivos nuevos incompletos;
- conserva la instantánea y agrega `manifiesto-error.json` para poder auditar el
  intento sin arriesgar archivos anteriores que ya se hayan respaldado;
- conserva los archivos operativos que estaban activos antes del intento.

Si la importación termina correctamente, los archivos que antes estaban
activos se mueven a `estado-pruebas-anterior`. No se eliminan. Una restauración
manual debe hacerse únicamente en pruebas y utilizando
`referencias-anteriores.json` como inventario.
