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

La función es idempotente y puede volver a ejecutarse para reparar elementos
faltantes. Crea:

- El directorio raíz `Sistema Recibos Pagos`.
- Directorios de configuración, logos, datos, recibos y evidencias.
- `configuracion.json`.
- `tipos-recibo.json` con un tipo general inicial.
- `contactos.json`.
- El reporte `Reporte General de Recibos`.
- Las propiedades con todos los identificadores.

No ejecutes esta función desde el proyecto de producción anterior.

### `diagnosticarSistema()`

Ejecútala después de inicializar. El resultado debe mostrar:

```text
inicializado: true
versionEsperada: 3
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

Abre cada URL reemplazando `URL_IMPLEMENTACION`:

```text
URL_IMPLEMENTACION?ruta=inicio
URL_IMPLEMENTACION?ruta=configuracion
URL_IMPLEMENTACION?ruta=nuevo-recibo
URL_IMPLEMENTACION?ruta=firmas
URL_IMPLEMENTACION?ruta=recibos
```

## 6. Secuencia de prueba funcional

1. Abre `?ruta=configuracion`.
2. Edita el tipo general o crea GLR y PV.
3. Carga un logotipo, define proveedor, prefijo y tamaño de papel.
4. Registra al menos un contacto.
5. Abre `?ruta=nuevo-recibo` desde una computadora.
6. Pega cuatro columnas desde Excel o Sheets:

   ```text
   Cliente | Importe | Concepto | Fecha de pago
   ```

7. Revisa la tabla y crea el lote.
8. Abre `?ruta=firmas` desde la tableta.
9. Firma dentro del recibo y toma la fotografía.
10. Confirma y verifica el PDF guardado en Drive.
11. Abre `?ruta=recibos`, selecciona Enviar y elige contactos.
12. Comprueba el correo y la fila del reporte general.

## 7. Integración con Google Sites

Crea una página de inserción completa para cada ruta y utiliza el sidebar nativo
de Google Sites:

```text
Inicio         → ?ruta=inicio
Crear recibos → ?ruta=nuevo-recibo
Firmas         → ?ruta=firmas
Recibos        → ?ruta=recibos
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

Si la conversión nativa no conserva el diseño requerido, el repositorio ya
separa la plantilla de los datos para sustituir únicamente el generador PDF.
