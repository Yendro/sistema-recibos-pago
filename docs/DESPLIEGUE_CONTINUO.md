# Despliegue continuo con GitHub Actions

## Alcance de la primera etapa

El workflow `.github/workflows/desplegar-apps-script.yml` permite publicar
manualmente el commit actual de `main` desde la pestaña **Actions**. La ejecución
automática por cada cambio desplegable se habilitará únicamente después de
validar este procedimiento en producción.

El workflow:

1. Descarga el commit de `main`.
2. Instala las dependencias exactas de `package-lock.json`.
3. Ejecuta `npm run verificar`.
4. Reconstruye temporalmente las credenciales de `clasp`.
5. Lista los archivos que se enviarán a Apps Script.
6. Comprueba que el deployment pertenezca al proyecto configurado y no sea
   `@HEAD`.
7. Ejecuta `clasp push --force`.
8. Crea una versión y actualiza el deployment existente sin cambiar su URL.
9. Elimina los archivos de credenciales del runner.

## Requisitos previos

- El proyecto productivo debe estar vinculado localmente mediante `.clasp.json`.
- La cuenta autorizada debe poder modificar el proyecto y sus deployments.
- La API de Google Apps Script debe estar habilitada para la cuenta.
- Debe existir un deployment versionado que ya utilice Google Sites.
- `npm run verificar` y `npx clasp push` deben funcionar localmente.

## 1. Actualizar la autorización local

Desde la raíz del repositorio ejecuta:

```powershell
npx clasp login
npx clasp show-authorized-user
npx clasp list-deployments
```

El inicio de sesión crea o actualiza el archivo global:

```text
%USERPROFILE%\.clasprc.json
```

Este archivo contiene un token de renovación de Google y equivale a una
contraseña. No debe copiarse al repositorio, enviarse por correo, colocarse en
documentación ni compartirse en una conversación.

## 2. Identificar los tres valores de GitHub

### Secreto `CLASPRC_JSON`

Utiliza el contenido completo y sin modificaciones de:

```text
%USERPROFILE%\.clasprc.json
```

### Secreto `CLASP_JSON`

Utiliza el contenido completo del `.clasp.json` ubicado en la raíz de este
repositorio. Debe contener el `scriptId` productivo y conservar:

```json
{
  "rootDir": "",
  "skipSubdirectories": false
}
```

El ejemplo solo muestra las propiedades que valida el workflow; no reemplaza el
archivo completo ni incluye el `scriptId`.

### Variable `APPS_SCRIPT_DEPLOYMENT_ID`

Ejecuta:

```powershell
npx clasp list-deployments
```

Selecciona el identificador del deployment versionado cuya URL `/exec` utiliza
Google Sites. No uses el deployment `@HEAD`. El identificador del deployment no
es el `scriptId` y no debe obtenerse de la URL del editor.

## 3. Crear el entorno de GitHub

En el repositorio abre **Settings > Environments** y realiza lo siguiente:

1. Crea un entorno llamado exactamente `production`.
2. En **Environment secrets**, crea `CLASPRC_JSON`.
3. En **Environment secrets**, crea `CLASP_JSON`.
4. En **Environment variables**, crea `APPS_SCRIPT_DEPLOYMENT_ID`.
5. Conserva habilitadas las acciones del repositorio.

Los nombres distinguen entre secretos y variables. El workflow no encontrará un
valor colocado en la sección incorrecta.

## 4. Primera ejecución manual

Después de integrar el workflow en `main`:

1. Abre **Actions > Desplegar manualmente Google Apps Script**.
2. Selecciona **Run workflow** sobre la rama `main`.
3. Activa la confirmación requerida.
4. Ejecuta el workflow.
5. Revisa que terminen los pasos de verificación, sincronización y actualización
   del deployment.
6. Comprueba en el resumen el commit y el número de versión generado.
7. Ejecuta la prueba de humo descrita en
   [Despliegue a producción](DESPLIEGUE_PRODUCCION.md).

### Validación realizada

La primera ejecución manual se completó correctamente el 19 de octubre de
2026 sobre el commit `0898b3e` de `main`. El workflow verificó el proyecto,
sincronizó el código y actualizó el deployment productivo a la versión 14 sin
cambiar su URL. Posteriormente se validaron correctamente el flujo operativo,
el PDF y el envío en la Web App productiva, por lo que el despliegue automático
ya puede habilitarse.

## Seguridad y recuperación

- El job solo tiene permiso de lectura sobre el repositorio.
- El entorno `production` concentra las credenciales de despliegue.
- La concurrencia impide que dos publicaciones se ejecuten simultáneamente.
- Las credenciales temporales se eliminan incluso cuando falla un paso.
- `clasp push --force` reemplaza el código del proyecto remoto; por ello el
  repositorio debe seguir siendo la fuente de verdad.
- Si la sincronización termina pero falla la actualización del deployment, la
  URL pública continúa usando su versión inmutable anterior.

Si aparece `401`, `invalid_grant` o una autorización revocada, ejecuta nuevamente
`npx clasp login`, sustituye `CLASPRC_JSON` y repite el workflow manual. No es
necesario cambiar los otros valores mientras se mantengan el mismo proyecto y
deployment.
