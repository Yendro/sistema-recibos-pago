# Implementación del entorno de pruebas

Esta guía conserva el procedimiento para un entorno aislado. Para realizar el
corte definitivo consulta [Despliegue a producción](DESPLIEGUE_PRODUCCION.md).

## Advertencia

Una rama de Git no separa un proyecto de Apps Script. No ejecutes `clasp push`
mientras `.clasp.json` conserve el identificador del sistema en producción.

El código que se quiera validar debe vincularse con un proyecto independiente de
Apps Script y con su propio despliegue. El inicializador creará directorios,
configuración, datos y reporte exclusivos para la cuenta que lo ejecute.

## 1. Preparar el proyecto de Apps Script

1. Confirma la rama y el commit que se probarán con `git status` y `git log -1`.
2. Crea un proyecto **independiente y standalone** en Apps Script con el nombre
   `sistema-recibos-pagos-pruebas`.
3. Copia su identificador de proyecto.
4. Copia la plantilla local de configuración:

   ```powershell
   Copy-Item .clasp.pruebas.ejemplo.json .clasp.pruebas.json
   ```

5. Sustituye únicamente el valor `scriptId` de `.clasp.pruebas.json` por el
   identificador del proyecto de pruebas. El archivo queda ignorado por Git.
6. Conserva `.clasp.json` sin cambios. El comando de pruebas utiliza la opción
   `-P` de `clasp` para seleccionar el proyecto aislado.
7. No reutilices la hoja, carpetas ni despliegue de producción.

## 2. Verificar y subir el código

Registra primero un commit reproducible en la rama de trabajo y, desde la raíz
del repositorio, ejecuta:

```powershell
npm ci
npm run verificar
npm run desplegar:pruebas
```

El comando realiza las siguientes protecciones:

- Rechaza la rama `main`.
- Rechaza cambios sin commit, salvo que se solicite explícitamente una prueba
  temporal con `-PermitirCambiosSinCommit`.
- Comprueba que el `scriptId` de pruebas sea distinto del productivo.
- Verifica el proyecto y muestra los archivos desplegables.
- Sincroniza exclusivamente el proyecto definido en `.clasp.pruebas.json`.
- Incluye las herramientas de `tests/apps_script` mediante un archivo de
  exclusión exclusivo; el despliegue productivo continúa omitiéndolas.
- Crea el primer deployment o actualiza el existente sin cambiar su URL.
- Guarda el identificador local en `.despliegue-pruebas.json`, también ignorado
  por Git.

Al finalizar imprime las direcciones de Inicio, Operación y Configuración. Para
una prueba temporal con cambios todavía no registrados puede utilizarse:

```powershell
pwsh -NoProfile -File scripts/desplegar_pruebas.ps1 -PermitirCambiosSinCommit
```

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

La primera ejecución de `npm run desplegar:pruebas` crea el deployment con la
configuración declarada en `appsscript.json`:

- Ejecutar como: **usuario que implementa**.
- Acceso: **solo yo**.

Las siguientes ejecuciones crean una versión y actualizan el mismo deployment,
por lo que la URL terminada en `/exec` permanece estable.

El manifiesto también declara acceso `MYSELF`. Las páginas solo funcionarán en
dispositivos donde la cuenta propietaria tenga una sesión iniciada.

## 5. Validar las rutas directamente

Para trabajar en rendimiento basta con abrir Operación. Configuración se utiliza
únicamente durante la preparación del entorno y la ruta de Inicio no necesita
insertarse en el Google Site de pruebas.

Las tres rutas continúan disponibles reemplazando `URL_IMPLEMENTACION`:

```text
URL_IMPLEMENTACION
URL_IMPLEMENTACION?ruta=inicio
URL_IMPLEMENTACION?ruta=operacion
URL_IMPLEMENTACION?ruta=configuracion
```

La URL sin parámetros debe mostrar Inicio. La navegación entre páginas se
realiza exclusivamente desde el sidebar de Google Sites.

## 6. Secuencia de prueba funcional

1. Abre `?ruta=configuracion`.
2. Edita el tipo general o crea GLR y PV.
3. Carga un logotipo, define proveedor, prefijo y tamaño de papel.
4. Registra al menos un contacto.
5. Abre `?ruta=operacion` desde una computadora.
6. Captura directamente una fila o selecciona **Pegar desde hoja** para
   incorporar cuatro columnas:

   ```text
   Cliente | Concepto | Importe | Fecha de pago
   ```

7. Revisa la tabla y crea el lote.
8. En la misma ruta selecciona **Pendientes** desde la tableta.
9. Firma dentro del recibo y toma la fotografía.
10. Confirma y verifica el PDF guardado en Drive.
11. El sistema abrirá **Historial**; selecciona los contactos y envía.
12. Comprueba el correo y la fila del reporte general.
13. Repite la firma con un tipo A4 que tenga logotipo y comprueba que el PDF
    muestre logotipo, firma y fotografía.
14. Crea un contacto temporal de forma individual y edítalo.
15. Selecciona **Agregar varios**, captura filas manualmente y pega al menos dos
    columnas de nombres y correos desde una hoja de cálculo.
16. Selecciona **Guardar contactos**, confirma la cantidad indicada y comprueba
    que el diálogo muestre el progreso antes de cerrarse y actualizar la lista.
17. Comprueba que una fila inválida o un correo repetido muestre el error dentro
    del diálogo y rechace el lote completo sin guardar filas parciales.
18. Selecciona varios contactos mediante sus casillas, confirma la eliminación y
    verifica que desaparezcan en una sola actualización.
19. Crea un tipo temporal sin recibos y elimínalo. Comprueba también que un tipo
    ya utilizado no se pueda borrar y sí se pueda desactivar.
20. Crea un recibo pendiente, elimínalo desde **Historial** y confirma que ya no
    aparezca en pendientes, en el índice ni en el reporte general.
21. Firma otro recibo sin enviarlo, elimínalo y comprueba que la fila desaparezca
    del reporte y que PDF, firma y fotografía estén en la papelera de Drive.
22. Envía un recibo y confirma que su fila de historial no muestre la acción
    **Eliminar**.

## 7. Integración mínima con Google Sites

Crea un Google Site privado de pruebas con una sola página de inserción
completa:

```text
Operación      → ?ruta=operacion
```

El despliegue conserva todas las rutas y el mismo código que producción; solo el
contenedor de pruebas abre directamente la página operativa. Esta paridad evita
validar una compilación especial que después no se publicaría.

Cuando necesites preparar tipos o contactos, abre temporalmente
`?ruta=configuracion` en una pestaña directa, sin agregarla al Site.

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

## 8. Utilizar un volumen representativo

Para medir el rendimiento con los archivos mensuales de producción no cambies
las propiedades operativas manualmente ni copies el índice productivo. Sigue la
guía de [copia controlada de datos para pruebas](COPIA_DATOS_PRUEBAS.md).

El importador exclusivo de pruebas genera una instantánea, sanea referencias a
correo y evidencias, crea archivos mensuales propios y reconstruye el índice con
los identificadores del entorno aislado.
