# Implementación del entorno de pruebas

## Advertencia

Una rama de Git no separa un proyecto de Apps Script. No ejecutes `clasp push`
mientras `.clasp.json` conserve el identificador del sistema en producción.

Esta rama debe vincularse con un proyecto independiente de Apps Script y con su
propio despliegue. El inicializador creará directorios, configuración, datos y
reporte exclusivos para la cuenta que lo ejecute.

## 1. Preparar el proyecto de Apps Script

1. Confirma que Git está en `refactor/reestructuracion-completa`.
2. Crea un proyecto **independiente y standalone** en Apps Script con el nombre
   `sistema-recibos-pagos-pruebas`.
3. Copia su identificador de proyecto.
4. Guarda fuera del repositorio una copia segura del `.clasp.json` que apunta a
   producción.
5. Sustituye localmente el valor `scriptId` de `.clasp.json` por el identificador
   del proyecto de pruebas. Este archivo está ignorado por Git.
6. No reutilices la hoja, carpetas ni despliegue de producción.

## 2. Verificar y subir el código

Desde la raíz del repositorio:

```bash
npm install
npm run verificar
clasp push
```

Antes de confirmar el `push`, verifica nuevamente que el `scriptId` sea el del
proyecto de pruebas.

## 3. Funciones que deben ejecutarse manualmente

### `inicializarSistemaPruebas()`

Ejecuta esta función una sola vez desde el editor de Apps Script. Google pedirá
autorización para Drive, Sheets y envío de correo.

La función es idempotente y debe volver a ejecutarse después de instalar esta
versión. Crea o migra:

- El directorio raíz `Sistema Recibos Pagos` dentro de la carpeta que contiene
  el proyecto independiente de Apps Script.
- Directorios de configuración, logos, datos, recibos y evidencias.
- `configuracion.json`.
- `tipos-recibo.json` con un tipo general inicial.
- `contactos.json`.
- `indice-recibos.json`, reconstruido a partir de los archivos mensuales.
- El reporte `Reporte General de Recibos`.
- Las propiedades con todos los identificadores.

Si Apps Script no logra detectar su carpeta, abre `?ruta=configuracion`, despliega
la opción avanzada y proporciona la URL de la carpeta contenedora. La aplicación
no volverá silenciosamente a la raíz de Mi unidad.

La migración mueve la carpeta raíz existente y conserva los identificadores de
sus archivos y subdirectorios.

### `diagnosticarSistema()`

Ejecútala después de inicializar. El resultado debe mostrar:

```text
inicializado: true
versionEsperada: 4
directorioRaizEnContenedor: true
```

Todas las verificaciones de identificadores deben tener `configurado: true`.

No se necesitan triggers, `onOpen`, Google Forms ni funciones vinculadas a una
hoja.

## 4. Crear el despliegue web

1. En Apps Script selecciona **Implementar > Nueva implementación**.
2. Elige **Aplicación web**.
3. Ejecutar como: **yo**.
4. Acceso: **solo yo**.
5. Implementa y copia la URL terminada en `/exec`.

El manifiesto también declara acceso `MYSELF`. Las páginas solo funcionarán en
dispositivos donde la cuenta propietaria tenga una sesión iniciada.

## 5. Validar las rutas directamente

Abre las dos rutas reemplazando `URL_IMPLEMENTACION`:

```text
URL_IMPLEMENTACION?ruta=operacion
URL_IMPLEMENTACION?ruta=configuracion
```

## 6. Secuencia de prueba funcional

1. Abre `?ruta=configuracion`.
2. Edita el tipo general o crea GLR y PV.
3. Carga un logotipo, define proveedor, prefijo y tamaño de papel.
4. Registra al menos un contacto.
5. Abre `?ruta=operacion` desde una computadora.
6. Captura directamente una fila o selecciona **Pegar desde hoja** para
   incorporar cuatro columnas:

   ```text
   Cliente | Importe | Concepto | Fecha de pago
   ```

7. Revisa la tabla y crea el lote.
8. En la misma ruta selecciona **Pendientes** desde la tableta.
9. Firma dentro del recibo y toma la fotografía.
10. Confirma y verifica el PDF guardado en Drive.
11. El sistema abrirá **Historial**; selecciona los contactos y envía.
12. Comprueba el correo y la fila del reporte general.

## 7. Integración con Google Sites

Crea dos páginas de inserción completa y utiliza el sidebar nativo de Google
Sites:

```text
Operación      → ?ruta=operacion
Configuración  → ?ruta=configuracion
```

Restringe el Google Site a la cuenta propietaria. El permiso del Site no
reemplaza el permiso de la aplicación web; ambos deben quedar restringidos.

## Limitación que debe validarse

La conversión de HTML a PDF solo puede validarse completamente dentro de Apps
Script. Antes de continuar con más funciones se deben revisar visualmente:

- Tamaño carta y A4.
- Márgenes y saltos de página.
- Calidad y proporción del logotipo.
- Posición y resolución de la firma.
- Posición y legibilidad de la fotografía.
- Coincidencia entre la vista web y el PDF.
- Presencia del logotipo, firma y fotografía. Si el conversor no detecta una
  imagen de dimensiones reales, el recibo queda en `ERROR_PDF` y no se guarda
  un PDF incompleto.

Si la conversión nativa no conserva el diseño requerido, el repositorio ya
separa la plantilla de los datos para sustituir únicamente el generador PDF.
