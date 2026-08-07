/**
 * Prepara un entorno nuevo y aislado. Puede ejecutarse varias veces: reutiliza
 * recursos válidos y repara las referencias que ya no estén disponibles.
 *
 * @param {string=} identificadorODireccionContenedor Carpeta manual opcional.
 * @returns {Object} Resultado y diagnóstico de la instalación.
 */
function inicializarSistemaPruebas(identificadorODireccionContenedor) {
  const bloqueo = LockService.getScriptLock();
  bloqueo.waitLock(30000);

  try {
    const propiedades = obtenerPropiedadesSistema_();
    const identificadorContenedor = extraerIdentificadorDrive_(
      identificadorODireccionContenedor,
    );
    if (identificadorContenedor) {
      DriveApp.getFolderById(identificadorContenedor).getName();
      propiedades.setProperty(
        CLAVES_PROPIEDADES.DIRECTORIO_CONTENEDOR,
        identificadorContenedor,
      );
    }
    const directorioContenedor = obtenerDirectorioContenedorProyecto_();
    const directorioRaiz = obtenerOCrearDirectorio_(
      directorioContenedor,
      NOMBRES_DIRECTORIOS.RAIZ,
      CLAVES_PROPIEDADES.DIRECTORIO_RAIZ,
    );
    asegurarDirectorioDentroDe_(directorioRaiz, directorioContenedor);

    const directorioConfiguracion = obtenerOCrearDirectorio_(
      directorioRaiz,
      NOMBRES_DIRECTORIOS.CONFIGURACION,
      CLAVES_PROPIEDADES.DIRECTORIO_CONFIGURACION,
    );
    obtenerOCrearDirectorio_(
      directorioRaiz,
      NOMBRES_DIRECTORIOS.LOGOTIPOS,
      CLAVES_PROPIEDADES.DIRECTORIO_LOGOTIPOS,
    );
    const directorioDatos = obtenerOCrearDirectorio_(
      directorioRaiz,
      NOMBRES_DIRECTORIOS.DATOS,
      CLAVES_PROPIEDADES.DIRECTORIO_DATOS,
    );
    obtenerOCrearDirectorio_(
      directorioRaiz,
      NOMBRES_DIRECTORIOS.RECIBOS,
      CLAVES_PROPIEDADES.DIRECTORIO_RECIBOS,
    );
    obtenerOCrearDirectorio_(
      directorioRaiz,
      NOMBRES_DIRECTORIOS.EVIDENCIAS,
      CLAVES_PROPIEDADES.DIRECTORIO_EVIDENCIAS,
    );
    obtenerOCrearDirectorio_(
      directorioConfiguracion,
      NOMBRES_DIRECTORIOS.RESPALDOS,
      CLAVES_PROPIEDADES.DIRECTORIO_RESPALDOS,
    );

    obtenerOCrearArchivoJson_(
      directorioConfiguracion,
      NOMBRES_ARCHIVOS.CONFIGURACION,
      CLAVES_PROPIEDADES.ARCHIVO_CONFIGURACION,
      {
        version: 1,
        nombreAplicacion: NOMBRE_APLICACION,
        nombreRemitente: "Caja",
        asuntoCorreo: "Recibo confirmado - {{Folio}}",
      },
    );

    obtenerOCrearArchivoJson_(
      directorioConfiguracion,
      NOMBRES_ARCHIVOS.TIPOS_RECIBO,
      CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
      {
        version: 1,
        tiposRecibo: [crearTipoReciboInicial_()],
      },
    );

    obtenerOCrearArchivoJson_(
      directorioConfiguracion,
      NOMBRES_ARCHIVOS.CONTACTOS,
      CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
      { version: 1, contactos: [] },
    );

    obtenerOCrearArchivoJson_(
      directorioDatos,
      NOMBRES_ARCHIVOS.INDICE_RECIBOS,
      CLAVES_PROPIEDADES.ARCHIVO_INDICE_RECIBOS,
      { version: 1, recibos: [] },
    );

    obtenerOCrearReporteGeneral_(directorioRaiz);

    reconstruirIndiceRecibos_();

    propiedades.setProperties({
      [CLAVES_PROPIEDADES.SISTEMA_INICIALIZADO]: "SI",
      [CLAVES_PROPIEDADES.VERSION_ESTRUCTURA]: VERSION_ESTRUCTURA,
    });

    return crearRespuestaExitosa_(
      diagnosticarSistemaInterno_(),
      "El entorno de pruebas quedó inicializado.",
    );
  } catch (error) {
    return crearRespuestaError_(error);
  } finally {
    if (bloqueo.hasLock()) bloqueo.releaseLock();
  }
}

function crearTipoReciboInicial_() {
  return {
    identificadorTipoRecibo: "general",
    nombreTipoRecibo: "RECIBO GENERAL",
    nombreEmpresa: "EMPRESA",
    nombreProveedor: "PROVEEDOR",
    prefijoFolio: "REC",
    identificadorLogotipo: "",
    formatoPapel: FORMATOS_PAPEL.CARTA,
    colorPrincipal: "#0E6BA8",
    textoPrincipal: TEXTO_PLANTILLA_GENERAL,
    activo: true,
    fechaActualizacion: obtenerFechaIso_(new Date()),
  };
}

function obtenerOCrearReporteGeneral_(directorioRaiz) {
  const propiedades = obtenerPropiedadesSistema_();
  const identificadorRegistrado = propiedades.getProperty(
    CLAVES_PROPIEDADES.HOJA_REPORTE,
  );

  if (identificadorRegistrado) {
    try {
      return SpreadsheetApp.openById(identificadorRegistrado);
    } catch (error) {
      console.warn(`Se reparará el reporte general: ${error.message}`);
    }
  }

  const reporte = SpreadsheetApp.create(NOMBRES_ARCHIVOS.REPORTE);
  const hoja = reporte.getSheets()[0];
  hoja.setName("Recibos");
  hoja
    .getRange(1, 1, 1, CABECERAS_REPORTE.length)
    .setValues([CABECERAS_REPORTE])
    .setFontWeight("bold")
    .setBackground("#00639C")
    .setFontColor("#FFFFFF");
  hoja.setFrozenRows(1);
  hoja.getRange("G:G").setNumberFormat("$#,##0.00");
  hoja.autoResizeColumns(1, CABECERAS_REPORTE.length);

  DriveApp.getFileById(reporte.getId()).moveTo(directorioRaiz);
  propiedades.setProperty(CLAVES_PROPIEDADES.HOJA_REPORTE, reporte.getId());
  return reporte;
}

/**
 * Comprueba que las propiedades mínimas de la instalación estén registradas.
 * No crea, elimina ni modifica recursos.
 *
 * @returns {Object} Resultado del diagnóstico.
 */
function diagnosticarSistema() {
  try {
    return crearRespuestaExitosa_(diagnosticarSistemaInterno_());
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function diagnosticarSistemaInterno_() {
  const propiedades = obtenerPropiedadesSistema_();
  const verificaciones = Object.values(CLAVES_PROPIEDADES)
    .filter((clave) => clave.startsWith("ID_"))
    .map((clave) => ({
      clave,
      configurado: Boolean(propiedades.getProperty(clave)),
    }));

  let directorioRaizEnContenedor = false;
  let urlDirectorioRaiz = "";
  try {
    const directorioRaiz = DriveApp.getFolderById(
      propiedades.getProperty(CLAVES_PROPIEDADES.DIRECTORIO_RAIZ),
    );
    urlDirectorioRaiz = directorioRaiz.getUrl();
    const identificadorContenedor = propiedades.getProperty(
      CLAVES_PROPIEDADES.DIRECTORIO_CONTENEDOR,
    );
    const directoriosPadre = directorioRaiz.getParents();
    while (directoriosPadre.hasNext()) {
      if (directoriosPadre.next().getId() === identificadorContenedor) {
        directorioRaizEnContenedor = true;
        break;
      }
    }
  } catch (error) {
    console.warn(`No se pudo verificar la ubicación del directorio raíz: ${error.message}`);
  }

  return {
    inicializado: sistemaEstaInicializado_(),
    versionEsperada: VERSION_ESTRUCTURA,
    directorioRaizEnContenedor,
    urlDirectorioRaiz,
    verificaciones,
  };
}
