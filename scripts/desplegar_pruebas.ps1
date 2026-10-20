[CmdletBinding()]
param(
  [string]$RutaProyectoPruebas = ".clasp.pruebas.json",
  [string]$RutaIgnoradosPruebas = ".claspignore.pruebas",
  [string]$RutaEstadoDespliegue = ".despliegue-pruebas.json",
  [switch]$PermitirCambiosSinCommit
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Confirmar-UltimoComandoNativo {
  param([string]$Descripcion)

  if ($LASTEXITCODE -ne 0) {
    throw "$Descripcion terminó con el código $LASTEXITCODE."
  }
}

$directorioRepositorio = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$rutaManifiesto = Join-Path $directorioRepositorio "appsscript.json"
$bytesManifiestoOriginal = $null
$manifiestoAlterado = $false
Push-Location $directorioRepositorio

try {
  $ramaActual = (& git branch --show-current).Trim()
  Confirmar-UltimoComandoNativo "La consulta de la rama actual"
  if (-not $ramaActual) {
    throw "No fue posible identificar la rama actual."
  }
  if ($ramaActual -eq "main") {
    throw "El despliegue de pruebas no se ejecuta desde main. Cambia a una rama de trabajo."
  }

  $cambiosLocales = @(& git status --porcelain)
  Confirmar-UltimoComandoNativo "La revisión del estado de Git"
  if ($cambiosLocales.Count -gt 0 -and -not $PermitirCambiosSinCommit) {
    throw (
      "Existen cambios sin commit. Registra un commit reproducible o agrega " +
      "-PermitirCambiosSinCommit únicamente para una prueba temporal."
    )
  }

  if (-not (Test-Path -LiteralPath $RutaProyectoPruebas -PathType Leaf)) {
    throw (
      "No existe $RutaProyectoPruebas. Copia .clasp.pruebas.ejemplo.json y " +
      "configura el scriptId del proyecto independiente de pruebas."
    )
  }

  $rutaProyectoPruebasAbsoluta = (
    Resolve-Path -LiteralPath $RutaProyectoPruebas
  ).Path
  if (-not (Test-Path -LiteralPath $RutaIgnoradosPruebas -PathType Leaf)) {
    throw "No existe el archivo exclusivo de despliegue $RutaIgnoradosPruebas."
  }
  $rutaIgnoradosAbsoluta = (
    Resolve-Path -LiteralPath $RutaIgnoradosPruebas
  ).Path

  $proyectoPruebas = Get-Content -LiteralPath $rutaProyectoPruebasAbsoluta -Raw |
    ConvertFrom-Json
  if (
    -not $proyectoPruebas.scriptId -or
    $proyectoPruebas.scriptId -like "REEMPLAZAR_*" -or
    [string]$proyectoPruebas.rootDir -ne "" -or
    $proyectoPruebas.skipSubdirectories -ne $false
  ) {
    throw "$RutaProyectoPruebas no contiene una configuración válida de clasp."
  }

  if (Test-Path -LiteralPath ".clasp.json" -PathType Leaf) {
    $proyectoProduccion = Get-Content -LiteralPath ".clasp.json" -Raw |
      ConvertFrom-Json
    if ($proyectoProduccion.scriptId -eq $proyectoPruebas.scriptId) {
      throw (
        "El proyecto de pruebas coincide con producción. Crea un proyecto " +
        "independiente antes de continuar."
      )
    }
  }

  & npm run verificar
  Confirmar-UltimoComandoNativo "La verificación del proyecto"

  $bytesManifiestoOriginal = [System.IO.File]::ReadAllBytes($rutaManifiesto)
  $manifiestoPruebas = Get-Content -LiteralPath $rutaManifiesto -Raw |
    ConvertFrom-Json
  $manifiestoPruebas.webapp.access = "MYSELF"
  $contenidoManifiestoPruebas = $manifiestoPruebas |
    ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText(
    $rutaManifiesto,
    $contenidoManifiestoPruebas + [Environment]::NewLine,
    [System.Text.UTF8Encoding]::new($false)
  )
  $manifiestoAlterado = $true

  & npx clasp -P $rutaProyectoPruebasAbsoluta -I $rutaIgnoradosAbsoluta `
    show-file-status
  Confirmar-UltimoComandoNativo "La revisión de archivos desplegables"

  & npx clasp -P $rutaProyectoPruebasAbsoluta -I $rutaIgnoradosAbsoluta `
    push --force
  Confirmar-UltimoComandoNativo "La sincronización con Apps Script de pruebas"

  $commitCorto = (& git rev-parse --short HEAD).Trim()
  Confirmar-UltimoComandoNativo "La consulta del commit actual"
  $descripcion = "pruebas: $ramaActual@$commitCorto"

  $identificadorDeployment = ""
  if (Test-Path -LiteralPath $RutaEstadoDespliegue -PathType Leaf) {
    $estadoDespliegue = Get-Content -LiteralPath $RutaEstadoDespliegue -Raw |
      ConvertFrom-Json
    $identificadorDeployment = [string]$estadoDespliegue.identificadorDeployment
    if (-not $identificadorDeployment) {
      throw "$RutaEstadoDespliegue no contiene identificadorDeployment."
    }

    $salidaDespliegue = & npx clasp -P $rutaProyectoPruebasAbsoluta `
      update-deployment $identificadorDeployment --description $descripcion `
      --json
    Confirmar-UltimoComandoNativo "La actualización del deployment de pruebas"
  } else {
    $salidaDespliegue = & npx clasp --json -P $rutaProyectoPruebasAbsoluta `
      create-deployment --description $descripcion
    Confirmar-UltimoComandoNativo "La creación del deployment de pruebas"
    $resultadoDespliegue = ($salidaDespliegue -join [Environment]::NewLine) |
      ConvertFrom-Json
    $identificadorDeployment = [string]$resultadoDespliegue.deploymentId
    if (-not $identificadorDeployment) {
      throw "clasp no devolvió el identificador del deployment creado."
    }

    @{
      identificadorDeployment = $identificadorDeployment
      identificadorProyecto = [string]$proyectoPruebas.scriptId
    } | ConvertTo-Json | Set-Content -LiteralPath $RutaEstadoDespliegue -Encoding utf8
  }

  $direccionBase = "https://script.google.com/macros/s/$identificadorDeployment/exec"
  Write-Host ""
  Write-Host "Despliegue de pruebas completado." -ForegroundColor Green
  Write-Host "Operación:     $direccionBase`?ruta=operacion"
  Write-Host "Configuración: $direccionBase`?ruta=configuracion"
  Write-Host "Inicio:        $direccionBase`?ruta=inicio"
} finally {
  try {
    if ($manifiestoAlterado -and $null -ne $bytesManifiestoOriginal) {
      [System.IO.File]::WriteAllBytes(
        $rutaManifiesto,
        $bytesManifiestoOriginal
      )
    }
  } finally {
    Pop-Location
  }
}
