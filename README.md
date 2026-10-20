# Sistema de Recibos y Pagos

Aplicación web de Google Apps Script para crear, firmar, documentar, enviar y
consultar recibos de pagos.

El sistema está diseñado para una cuenta propietaria, operación de caja desde
computadora o tableta y firma presencial con fotografía de evidencia.

## Funcionalidades

- Configuración de tipos de recibo, empresas, proveedores, logotipos y contactos.
- Inicio con bienvenida, guía de uso y explicación del flujo principal.
- Captura manual o masiva mediante una cuadrícula editable.
- Firma sobre la representación visual del recibo.
- Fotografía obligatoria de identificación o evidencia presencial.
- Generación de PDF en formato carta o A4.
- Envío del PDF a contactos configurados.
- Historial con búsqueda, filtros y paginación.
- Eliminación protegida de recibos no enviados.
- Reporte general derivado en Google Sheets.
- Persistencia operativa en archivos JSON mensuales de Drive.
- Índice operativo, caché de lecturas y bloqueo de escrituras concurrentes.

## Requisitos

- Una cuenta de Google con acceso a Apps Script, Drive, Sheets y Mail.
- [Node.js](https://nodejs.org/) 20 o posterior y npm.
- `clasp` instalado como dependencia local mediante `npm ci`.

- Un proyecto independiente y _standalone_ de Google Apps Script, creado dentro
  de la carpeta de Drive donde se almacenarán las dependencias del sistema.

## Instalación local

1. Clona el repositorio y entra en su directorio:

   ```bash
   git clone https://github.com/Yendro/sistema-recibos-pago.git
   cd sistema-recibos-pago
   ```

2. Instala las dependencias y verifica el proyecto:

   ```bash
   npm ci
   npm run verificar
   ```

3. Inicia sesión en Google:

   ```bash
   npx clasp login
   ```

4. Crea `.clasp.json` en la raíz. Este archivo es local y Git lo ignora:

   ```json
   {
     "scriptId": "IDENTIFICADOR_DEL_PROYECTO_APPS_SCRIPT",
     "rootDir": "",
     "scriptExtensions": [".js", ".gs"],
     "htmlExtensions": [".html"],
     "jsonExtensions": [".json"],
     "filePushOrder": [],
     "skipSubdirectories": false
   }
   ```

5. Confirma que el `scriptId` corresponde al entorno correcto y sube el código:

   ```bash
   npx clasp push
   ```

## Inicialización de Google Apps Script

Desde el editor de Apps Script ejecuta una vez:

```text
inicializarSistemaPruebas()
```

Aunque conserva ese nombre por compatibilidad, la función es idempotente y sirve
para instalaciones de prueba o producción. Solicitará permisos y creará:

```text
Sistema Recibos Pagos/
├── config/
│   ├── configuracion.json
│   ├── contactos.json
│   └── tipos-recibo.json
├── datos/
│   ├── indice-recibos.json
│   └── AAAA/recibos-AAAA-MM.json
├── evidencias/AAAA/MM/
├── logos/
├── recibos/AAAA/MM/
└── respaldos/
```

También crea el archivo `Reporte General de Recibos` y registra todos los
identificadores en las propiedades del script.

Después ejecuta:

```text
diagnosticarSistema()
```

El resultado esperado debe incluir:

```text
inicializado: true
versionEsperada: 4
directorioRaizEnContenedor: true
```

No se necesitan triggers ni un proyecto vinculado a Sheets.

## Implementación de la aplicación web

1. Abre **Implementar > Nueva implementación** en Apps Script.
2. Selecciona **Aplicación web**.
3. Configura **Ejecutar como: yo**.
4. Configura **Quién tiene acceso: cualquier usuario con una cuenta de Google**.
5. Implementa y conserva la URL terminada en `/exec`.

Rutas disponibles:

```text
URL_IMPLEMENTACION/exec
URL_IMPLEMENTACION/exec?ruta=inicio
URL_IMPLEMENTACION/exec?ruta=operacion
URL_IMPLEMENTACION/exec?ruta=configuracion
```

Inicio es también la ruta predeterminada cuando no se proporciona un parámetro.
Las tres rutas pueden insertarse como páginas de ancho completo en Google Sites.
El Site se comparte únicamente con sus usuarios operativos y la Web App exige
que cada visitante mantenga una sesión de Google iniciada.

## Primera configuración

1. Abre `?ruta=configuracion`.
2. Edita el tipo general o crea los tipos necesarios.
3. Define empresa, proveedor, prefijo, papel, color y logotipo.
4. Registra los contactos de envío.
5. Abre `?ruta=operacion` y realiza una prueba completa:
   captura, firma, fotografía, PDF, correo y reporte.

## Actualización de una instalación

El repositorio despliega automáticamente los cambios relevantes enviados a
`main` mediante GitHub Actions. También conserva una ejecución manual para
recuperación o control operativo. Consulta la
[guía de despliegue continuo](docs/DESPLIEGUE_CONTINUO.md).

Como procedimiento de respaldo, las actualizaciones pueden publicarse desde una
copia local vinculada al proyecto correcto de Apps Script:

```bash
git pull --ff-only
npm ci
npm run verificar
npx clasp push
```

Después crea una versión nueva dentro de la implementación existente de Apps
Script. La URL se mantiene cuando se edita la misma implementación.

Ejecuta nuevamente `inicializarSistemaPruebas()` solo cuando el diagnóstico
indique una versión de estructura anterior o falten propiedades. La función no
duplica los recursos existentes.

El repositorio es la fuente de verdad del código. Evita editar directamente los
archivos dentro del editor de Apps Script porque una sincronización posterior
con `clasp` puede reemplazarlos.

## Desarrollo

- Ejecuta `npm run verificar` antes de cada commit.
- Usa nombres completos en español latinoamericano para el código propio.
- Conserva nombres convencionales para carpetas como `app`, `config`,
  `repositories`, `services` y `views`.
- Utiliza Conventional Commits, por ejemplo:

  ```text
  feat(recibos): agregar nueva capacidad
  fix(pdf): corregir conversión de imágenes
  docs(proyecto): actualizar guía de instalación
  ```

## Estructura del código

```text
src/
├── app/             Controladores web y casos de uso
├── config/          Constantes y propiedades de arranque
├── repositories/    Persistencia JSON de configuración y recibos
├── services/        Integraciones con Drive, Sheets, PDF y correo
├── shared/          Normalización, respuestas e importes
└── views/           Layout, páginas, scripts, estilos, PDF y correo
```

## Documentación

- [Índice de documentación](docs/README.md)
- [Arquitectura y almacenamiento](docs/ARQUITECTURA.md)
- [Despliegue a producción](docs/DESPLIEGUE_PRODUCCION.md)
- [Despliegue continuo](docs/DESPLIEGUE_CONTINUO.md)
- [Implementación y pruebas funcionales](docs/IMPLEMENTACION_PRUEBAS.md)
- [Paleta para Google Sites](docs/PALETA_GOOGLE_SITES.md)
- [Análisis de la fase 2](docs/ANALISIS_FASE_2.md)
- [Roadmap](ROADMAP.md)
- [Changelog](CHANGELOG.md)

## Seguridad y límites

- La Web App se ejecuta como la cuenta que la implementa y acepta usuarios con
  sesión de Google iniciada mediante `ANYONE`. No se utiliza acceso anónimo.
- Google Sites no transfiere sus permisos al contenido insertado. La URL de la
  Web App debe tratarse como información interna porque cualquier usuario con
  cuenta de Google que la obtenga podría abrirla.
- Fotografías, firmas y recibos contienen información sensible y deben conservar
  permisos privados en Drive.
- Sheets es un reporte derivado; la fuente operativa son los JSON de Drive.
- La carpeta `respaldos/` ya se crea, pero los respaldos versionados automáticos
  pertenecen a una fase posterior de robustecimiento.

## Licencia

Consulta [LICENSE](LICENSE).
