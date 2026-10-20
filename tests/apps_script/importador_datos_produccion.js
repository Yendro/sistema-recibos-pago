/**
 * Herramienta incluida únicamente en el despliegue de pruebas. Copia el
 * volumen operativo de producción sin modificar ningún recurso de origen.
 *
 * Antes de ejecutar importarDatosProduccionParaPruebas, registra estas
 * propiedades en el proyecto de Apps Script de pruebas:
 *
 * - ENTORNO_EJECUCION = PRUEBAS
 * - ID_DIRECTORIO_RAIZ_PRODUCCION = identificador de la carpeta raíz productiva
 * - CONFIRMACION_IMPORTACION_PRUEBAS = COPIAR_PRODUCCION_A_PRUEBAS
 */

const CONFIGURACION_IMPORTADOR_PRUEBAS = Object.freeze({
  CLAVE_ENTORNO: "ENTORNO_EJECUCION",
  VALOR_ENTORNO: "PRUEBAS",
  CLAVE_DIRECTORIO_ORIGEN: "ID_DIRECTORIO_RAIZ_PRODUCCION",
  CLAVE_CONFIRMACION: "CONFIRMACION_IMPORTACION_PRUEBAS",
  VALOR_CONFIRMACION: "COPIAR_PRODUCCION_A_PRUEBAS",
  NOMBRE_DIRECTORIO_INSTANTANEAS: "instantaneas-produccion",
  NOMBRE_DIRECTORIO_ESTADO_ANTERIOR: "estado-pruebas-anterior",
  NOMBRE_DIRECTORIO_ORIGEN: "origen-produccion",
});

/**
 * Comprueba la configuración sin leer ni escribir los archivos operativos.
 *
 * @returns {Object} Diagnóstico seguro del importador.
 */
function diagnosticarImportadorPruebas() {
  try {
    const contexto = obtenerContextoImportadorPruebas_(false);
    const origen = inspeccionarOrigenProduccion_(contexto.directorioOrigen);
    return crearRespuestaExitosa_({
      entorno: CONFIGURACION_IMPORTADOR_PRUEBAS.VALOR_ENTORNO,
      nombreDirectorioOrigen: contexto.directorioOrigen.getName(),
      nombreDirectorioDestino: contexto.directorioDestino.getName(),
      periodos: origen.periodos.length,
      recibos: origen.cantidadRecibos,
      tiposRecibo: origen.documentoTiposRecibo.tiposRecibo.length,
      logotipos: origen.logotipos.length,
      confirmacionPreparada:
        contexto.propiedades.getProperty(
          CONFIGURACION_IMPORTADOR_PRUEBAS.CLAVE_CONFIRMACION,
        ) === CONFIGURACION_IMPORTADOR_PRUEBAS.VALOR_CONFIRMACION,
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

/**
 * Crea una instantánea del origen y reemplaza exclusivamente los datos del
 * entorno de pruebas. Los contactos y la configuración de correo de pruebas
 * permanecen intactos.
 *
 * @returns {Object} Resumen de la importación completada.
 */
function importarDatosProduccionParaPruebas() {
  const bloqueo = LockService.getScriptLock();
  let contexto;
  let propiedadesAnteriores;
  let directorioInstantanea;
  let filasReporteAnteriores;
  const recursosNuevos = [];

  try {
    contexto = obtenerContextoImportadorPruebas_(true);
    bloqueo.waitLock(30000);
    contexto.propiedades.deleteProperty(
      CONFIGURACION_IMPORTADOR_PRUEBAS.CLAVE_CONFIRMACION,
    );
    propiedadesAnteriores = contexto.propiedades.getProperties();

    const origen = inspeccionarOrigenProduccion_(contexto.directorioOrigen);
    const marcaTiempo = Utilities.formatDate(
      new Date(),
      Session.getScriptTimeZone(),
      "yyyyMMdd-HHmmss",
    );

    const directorioRespaldos = obtenerDirectorioPorPropiedad_(
      CLAVES_PROPIEDADES.DIRECTORIO_RESPALDOS,
    );
    const directorioInstantaneas = obtenerOCrearSubdirectorio_(
      directorioRespaldos,
      CONFIGURACION_IMPORTADOR_PRUEBAS.NOMBRE_DIRECTORIO_INSTANTANEAS,
    );
    directorioInstantanea = directorioInstantaneas.createFolder(marcaTiempo);
    const directorioEstadoAnterior = directorioInstantanea.createFolder(
      CONFIGURACION_IMPORTADOR_PRUEBAS.NOMBRE_DIRECTORIO_ESTADO_ANTERIOR,
    );
    const directorioCopiaOrigen = directorioInstantanea.createFolder(
      CONFIGURACION_IMPORTADOR_PRUEBAS.NOMBRE_DIRECTORIO_ORIGEN,
    );

    respaldarOrigenProduccion_(origen, directorioCopiaOrigen);
    const referenciasAnteriores = respaldarEstadoPruebas_(
      directorioEstadoAnterior,
    );
    filasReporteAnteriores = obtenerFilasReportePruebas_();
    guardarJsonEnDirectorio_(
      directorioEstadoAnterior,
      "reporte-general-anterior.json",
      { filas: filasReporteAnteriores },
    );

    const resultadoPreparacion = prepararCopiaOperativaPruebas_(
      origen,
      marcaTiempo,
      recursosNuevos,
    );
    aplicarReferenciasCopiaOperativa_(
      resultadoPreparacion,
      referenciasAnteriores,
      contexto.propiedades,
    );

    const cantidadIndexada = reconstruirIndiceRecibos_();
    if (cantidadIndexada !== origen.cantidadRecibos) {
      throw new Error(
        `El índice reconstruido contiene ${cantidadIndexada} recibo(s), ` +
          `pero el origen contiene ${origen.cantidadRecibos}.`,
      );
    }

    limpiarReporteGeneralPruebas_();
    finalizarArchivosImportados_(
      resultadoPreparacion,
      referenciasAnteriores,
      directorioEstadoAnterior,
    );
    invalidarMemoriaTemporalConfiguracion_();
    invalidarMemoriaTemporalResumenRecibos_();

    const manifiesto = {
      fechaImportacion: obtenerFechaIso_(new Date()),
      identificadorDirectorioOrigen: contexto.directorioOrigen.getId(),
      identificadorDirectorioDestino: contexto.directorioDestino.getId(),
      cantidadPeriodos: origen.periodos.length,
      cantidadRecibos: origen.cantidadRecibos,
      cantidadTiposRecibo: origen.documentoTiposRecibo.tiposRecibo.length,
      cantidadLogotipos: origen.logotipos.length,
      contactosImportados: 0,
      evidenciasImportadas: 0,
      archivosPdfImportados: 0,
      estado: "COMPLETADA",
    };
    guardarJsonEnDirectorio_(
      directorioInstantanea,
      "manifiesto-importacion.json",
      manifiesto,
    );

    return crearRespuestaExitosa_(
      {
        ...manifiesto,
        urlInstantanea: directorioInstantanea.getUrl(),
      },
      `${origen.cantidadRecibos} recibo(s) fueron copiados al entorno de pruebas.`,
    );
  } catch (error) {
    if (contexto && propiedadesAnteriores) {
      restaurarPropiedadesImportador_(
        contexto.propiedades,
        propiedadesAnteriores,
      );
    }
    if (filasReporteAnteriores) {
      try {
        restaurarReporteGeneralPruebas_(filasReporteAnteriores);
      } catch (errorRestauracion) {
        console.error(
          `No se pudo restaurar el reporte de pruebas: ${errorRestauracion.message}`,
        );
      }
    }
    recursosNuevos.forEach((recurso) => {
      try {
        recurso.setTrashed(true);
      } catch (errorLimpieza) {
        console.warn(`No se pudo limpiar un recurso temporal: ${errorLimpieza.message}`);
      }
    });
    if (directorioInstantanea) {
      try {
        guardarJsonEnDirectorio_(
          directorioInstantanea,
          "manifiesto-error.json",
          {
            fecha: obtenerFechaIso_(new Date()),
            estado: "ERROR",
            mensaje: error.message,
          },
        );
      } catch (errorLimpieza) {
        console.warn(`No se pudo registrar el error de importación: ${errorLimpieza.message}`);
      }
    }
    return crearRespuestaError_(error);
  } finally {
    if (bloqueo.hasLock()) bloqueo.releaseLock();
  }
}

function obtenerContextoImportadorPruebas_(exigirConfirmacion) {
  if (!sistemaEstaInicializado_()) {
    throw new Error(
      "Inicializa primero el proyecto de pruebas con inicializarSistemaPruebas().",
    );
  }

  const propiedades = obtenerPropiedadesSistema_();
  if (
    propiedades.getProperty(CONFIGURACION_IMPORTADOR_PRUEBAS.CLAVE_ENTORNO) !==
    CONFIGURACION_IMPORTADOR_PRUEBAS.VALOR_ENTORNO
  ) {
    throw new Error(
      "El importador solo se ejecuta cuando ENTORNO_EJECUCION tiene el valor PRUEBAS.",
    );
  }

  if (
    exigirConfirmacion &&
    propiedades.getProperty(
      CONFIGURACION_IMPORTADOR_PRUEBAS.CLAVE_CONFIRMACION,
    ) !== CONFIGURACION_IMPORTADOR_PRUEBAS.VALOR_CONFIRMACION
  ) {
    throw new Error(
      "Registra CONFIRMACION_IMPORTACION_PRUEBAS con el valor " +
        "COPIAR_PRODUCCION_A_PRUEBAS antes de importar.",
    );
  }

  const identificadorOrigen = propiedades.getProperty(
    CONFIGURACION_IMPORTADOR_PRUEBAS.CLAVE_DIRECTORIO_ORIGEN,
  );
  if (!identificadorOrigen) {
    throw new Error(
      "Registra ID_DIRECTORIO_RAIZ_PRODUCCION en las propiedades del proyecto de pruebas.",
    );
  }

  const identificadorDestino = obtenerPropiedadObligatoria_(
    CLAVES_PROPIEDADES.DIRECTORIO_RAIZ,
  );
  if (identificadorOrigen === identificadorDestino) {
    throw new Error("El origen de producción no puede ser el directorio de pruebas.");
  }

  const directorioOrigen = DriveApp.getFolderById(identificadorOrigen);
  const directorioDestino = DriveApp.getFolderById(identificadorDestino);
  if (directorioContieneDirectorio_(directorioOrigen, directorioDestino)) {
    throw new Error("El directorio de pruebas no puede estar dentro del origen productivo.");
  }
  if (directorioContieneDirectorio_(directorioDestino, directorioOrigen)) {
    throw new Error("El directorio productivo no puede estar dentro del entorno de pruebas.");
  }

  return {
    propiedades,
    directorioOrigen,
    directorioDestino,
  };
}

function directorioContieneDirectorio_(posiblePadre, posibleDescendiente) {
  const identificadorPadre = posiblePadre.getId();
  let directoriosPendientes = [posibleDescendiente];
  const identificadoresRevisados = new Set();

  while (directoriosPendientes.length) {
    const directorio = directoriosPendientes.shift();
    if (identificadoresRevisados.has(directorio.getId())) continue;
    identificadoresRevisados.add(directorio.getId());
    const padres = directorio.getParents();
    while (padres.hasNext()) {
      const padre = padres.next();
      if (padre.getId() === identificadorPadre) return true;
      directoriosPendientes.push(padre);
    }
  }
  return false;
}

function inspeccionarOrigenProduccion_(directorioOrigen) {
  const directorioConfiguracion = obtenerSubdirectorioUnico_(
    directorioOrigen,
    NOMBRES_DIRECTORIOS.CONFIGURACION,
  );
  const directorioDatos = obtenerSubdirectorioUnico_(
    directorioOrigen,
    NOMBRES_DIRECTORIOS.DATOS,
  );
  const archivoTiposRecibo = obtenerArchivoUnico_(
    directorioConfiguracion,
    NOMBRES_ARCHIVOS.TIPOS_RECIBO,
  );
  const contenidoTiposRecibo = leerContenidoArchivoTexto_(archivoTiposRecibo);
  const documentoTiposRecibo = interpretarJsonImportacion_(
    contenidoTiposRecibo,
    NOMBRES_ARCHIVOS.TIPOS_RECIBO,
  );
  if (!Array.isArray(documentoTiposRecibo.tiposRecibo)) {
    throw new Error("El archivo de tipos de recibo del origen no es válido.");
  }

  const periodos = recolectarPeriodosProduccion_(directorioDatos);
  if (!periodos.length) {
    throw new Error("El origen no contiene archivos mensuales de recibos.");
  }

  const identificadoresRecibos = new Set();
  let cantidadRecibos = 0;
  periodos.forEach((periodo) => {
    periodo.documento.recibos.forEach((recibo) => {
      if (!recibo.identificadorRecibo) {
        throw new Error(`El periodo ${periodo.clavePeriodo} contiene un recibo sin identificador.`);
      }
      if (identificadoresRecibos.has(recibo.identificadorRecibo)) {
        throw new Error(`El recibo ${recibo.identificadorRecibo} está duplicado en el origen.`);
      }
      identificadoresRecibos.add(recibo.identificadorRecibo);
      cantidadRecibos += 1;
    });
  });

  const logotipos = obtenerLogotiposOrigen_(documentoTiposRecibo.tiposRecibo);
  return {
    archivoTiposRecibo,
    contenidoTiposRecibo,
    documentoTiposRecibo,
    periodos,
    cantidadRecibos,
    logotipos,
  };
}

function obtenerSubdirectorioUnico_(directorioPadre, nombreDirectorio) {
  const coincidencias = directorioPadre.getFoldersByName(nombreDirectorio);
  if (!coincidencias.hasNext()) {
    throw new Error(`No existe el directorio ${nombreDirectorio} en el origen.`);
  }
  const directorio = coincidencias.next();
  if (coincidencias.hasNext()) {
    throw new Error(`Existe más de un directorio ${nombreDirectorio} en el origen.`);
  }
  return directorio;
}

function obtenerArchivoUnico_(directorio, nombreArchivo) {
  const coincidencias = directorio.getFilesByName(nombreArchivo);
  if (!coincidencias.hasNext()) {
    throw new Error(`No existe el archivo ${nombreArchivo} en el origen.`);
  }
  const archivo = coincidencias.next();
  if (coincidencias.hasNext()) {
    throw new Error(`Existe más de un archivo ${nombreArchivo} en el origen.`);
  }
  return archivo;
}

function recolectarPeriodosProduccion_(directorioDatos) {
  const periodos = [];
  const clavesEncontradas = new Set();
  recorrerDirectorioDatosProduccion_(directorioDatos, periodos, clavesEncontradas);
  return periodos.sort((primero, segundo) =>
    primero.clavePeriodo.localeCompare(segundo.clavePeriodo),
  );
}

function recorrerDirectorioDatosProduccion_(
  directorio,
  periodos,
  clavesEncontradas,
) {
  const archivos = directorio.getFiles();
  while (archivos.hasNext()) {
    const archivo = archivos.next();
    const coincidencia = archivo.getName().match(/^recibos-(\d{4}-\d{2})\.json$/);
    if (!coincidencia) continue;
    const clavePeriodo = coincidencia[1];
    if (clavesEncontradas.has(clavePeriodo)) {
      throw new Error(`Existe más de un archivo para el periodo ${clavePeriodo}.`);
    }
    const contenido = leerContenidoArchivoTexto_(archivo);
    const documento = interpretarJsonImportacion_(contenido, archivo.getName());
    if (!Array.isArray(documento.recibos)) {
      throw new Error(`${archivo.getName()} no contiene una lista de recibos.`);
    }
    if (documento.periodo && documento.periodo !== clavePeriodo) {
      throw new Error(`${archivo.getName()} declara el periodo ${documento.periodo}.`);
    }
    clavesEncontradas.add(clavePeriodo);
    periodos.push({
      clavePeriodo,
      archivo,
      contenido,
      documento,
    });
  }

  const subdirectorios = directorio.getFolders();
  while (subdirectorios.hasNext()) {
    recorrerDirectorioDatosProduccion_(
      subdirectorios.next(),
      periodos,
      clavesEncontradas,
    );
  }
}

function leerContenidoArchivoTexto_(archivo) {
  return archivo.getBlob().getDataAsString("UTF-8");
}

function interpretarJsonImportacion_(contenido, nombreArchivo) {
  try {
    return JSON.parse(contenido);
  } catch (error) {
    throw new Error(`${nombreArchivo} no contiene JSON válido.`);
  }
}

function obtenerLogotiposOrigen_(tiposRecibo) {
  const identificadores = Array.from(
    new Set(
      tiposRecibo
        .map((tipoRecibo) => String(tipoRecibo.identificadorLogotipo || "").trim())
        .filter(Boolean),
    ),
  );
  return identificadores.map((identificadorArchivo) => {
    const archivo = DriveApp.getFileById(identificadorArchivo);
    archivo.getName();
    return { identificadorArchivo, archivo };
  });
}

function respaldarOrigenProduccion_(origen, directorioCopiaOrigen) {
  const directorioConfiguracion = directorioCopiaOrigen.createFolder(
    NOMBRES_DIRECTORIOS.CONFIGURACION,
  );
  const directorioDatos = directorioCopiaOrigen.createFolder(
    NOMBRES_DIRECTORIOS.DATOS,
  );
  const directorioLogotipos = directorioCopiaOrigen.createFolder(
    NOMBRES_DIRECTORIOS.LOGOTIPOS,
  );

  origen.archivoTiposRecibo.makeCopy(
    NOMBRES_ARCHIVOS.TIPOS_RECIBO,
    directorioConfiguracion,
  );
  origen.periodos.forEach((periodo) => {
    const anio = periodo.clavePeriodo.split("-")[0];
    const directorioAnio = obtenerOCrearSubdirectorio_(directorioDatos, anio);
    periodo.archivo.makeCopy(periodo.archivo.getName(), directorioAnio);
  });
  origen.logotipos.forEach((logotipo) => {
    logotipo.archivo.makeCopy(logotipo.archivo.getName(), directorioLogotipos);
  });

  const archivos = [
    {
      nombre: NOMBRES_ARCHIVOS.TIPOS_RECIBO,
      identificadorOrigen: origen.archivoTiposRecibo.getId(),
      huellaSha256: calcularHuellaSha256_(origen.contenidoTiposRecibo),
    },
    ...origen.periodos.map((periodo) => ({
      nombre: periodo.archivo.getName(),
      identificadorOrigen: periodo.archivo.getId(),
      periodo: periodo.clavePeriodo,
      recibos: periodo.documento.recibos.length,
      huellaSha256: calcularHuellaSha256_(periodo.contenido),
    })),
  ];
  guardarJsonEnDirectorio_(directorioCopiaOrigen, "manifiesto-origen.json", {
    archivos,
    logotipos: origen.logotipos.map((logotipo) => ({
      nombre: logotipo.archivo.getName(),
      identificadorOrigen: logotipo.identificadorArchivo,
    })),
  });
}

function calcularHuellaSha256_(contenido) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    contenido,
    Utilities.Charset.UTF_8,
  );
  return bytes
    .map((valor) => (valor < 0 ? valor + 256 : valor))
    .map((valor) => valor.toString(16).padStart(2, "0"))
    .join("");
}

function guardarJsonEnDirectorio_(directorio, nombreArchivo, contenido) {
  return directorio.createFile(
    nombreArchivo,
    JSON.stringify(contenido, null, 2),
    MimeType.PLAIN_TEXT,
  );
}

function respaldarEstadoPruebas_(directorioEstadoAnterior) {
  const propiedades = obtenerPropiedadesSistema_();
  const referenciasPeriodos = obtenerDocumentosRecibosExistentes_();
  const documentoTiposRecibo = leerArchivoJsonPorPropiedad_(
    CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
  );
  const referencias = {
    archivoTiposRecibo: obtenerPropiedadObligatoria_(
      CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
    ),
    archivoIndiceRecibos: obtenerPropiedadObligatoria_(
      CLAVES_PROPIEDADES.ARCHIVO_INDICE_RECIBOS,
    ),
    periodos: referenciasPeriodos,
    logotipos: Array.from(
      new Set(
        (documentoTiposRecibo.tiposRecibo || [])
          .map((tipoRecibo) => tipoRecibo.identificadorLogotipo)
          .filter(Boolean),
      ),
    ),
  };

  guardarJsonEnDirectorio_(directorioEstadoAnterior, "referencias-anteriores.json", {
    archivoTiposRecibo: referencias.archivoTiposRecibo,
    archivoIndiceRecibos: referencias.archivoIndiceRecibos,
    periodos: referenciasPeriodos,
    logotipos: referencias.logotipos,
    versionEstructura: propiedades.getProperty(
      CLAVES_PROPIEDADES.VERSION_ESTRUCTURA,
    ),
  });
  return referencias;
}

function obtenerFilasReportePruebas_() {
  const hoja = obtenerHojaRecibosReporte_();
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila < 1) return [CABECERAS_REPORTE];
  return hoja.getRange(1, 1, ultimaFila, CABECERAS_REPORTE.length).getValues();
}

function prepararCopiaOperativaPruebas_(origen, marcaTiempo, recursosNuevos) {
  const directorioLogotipos = obtenerDirectorioPorPropiedad_(
    CLAVES_PROPIEDADES.DIRECTORIO_LOGOTIPOS,
  );
  const directorioDatos = obtenerDirectorioPorPropiedad_(
    CLAVES_PROPIEDADES.DIRECTORIO_DATOS,
  );
  const directorioConfiguracion = obtenerDirectorioPorPropiedad_(
    CLAVES_PROPIEDADES.DIRECTORIO_CONFIGURACION,
  );
  const logotiposNuevos = new Map();

  origen.logotipos.forEach((logotipo) => {
    const blob = logotipo.archivo.getBlob().copyBlob();
    blob.setName(`${marcaTiempo}-${logotipo.archivo.getName()}`);
    const archivoNuevo = directorioLogotipos.createFile(blob);
    recursosNuevos.push(archivoNuevo);
    logotiposNuevos.set(logotipo.identificadorArchivo, archivoNuevo.getId());
  });

  const documentoTiposRecibo = JSON.parse(
    JSON.stringify(origen.documentoTiposRecibo),
  );
  documentoTiposRecibo.tiposRecibo = documentoTiposRecibo.tiposRecibo.map(
    (tipoRecibo) => ({
      ...tipoRecibo,
      identificadorLogotipo: tipoRecibo.identificadorLogotipo
        ? logotiposNuevos.get(tipoRecibo.identificadorLogotipo)
        : "",
    }),
  );
  const archivoTiposRecibo = guardarJsonEnDirectorio_(
    directorioConfiguracion,
    `${marcaTiempo}-${NOMBRES_ARCHIVOS.TIPOS_RECIBO}`,
    documentoTiposRecibo,
  );
  recursosNuevos.push(archivoTiposRecibo);

  const archivosPeriodos = origen.periodos.map((periodo) => {
    const [anio] = periodo.clavePeriodo.split("-");
    const directorioAnio = obtenerOCrearSubdirectorio_(directorioDatos, anio);
    const documento = {
      ...periodo.documento,
      recibos: periodo.documento.recibos.map(sanitizarReciboParaPruebas_),
    };
    const archivo = guardarJsonEnDirectorio_(
      directorioAnio,
      `${marcaTiempo}-recibos-${periodo.clavePeriodo}.json`,
      documento,
    );
    recursosNuevos.push(archivo);
    const documentoVerificado = leerArchivoJsonPorIdentificador_(archivo.getId());
    if (documentoVerificado.recibos.length !== documento.recibos.length) {
      throw new Error(`No fue posible verificar la copia del periodo ${periodo.clavePeriodo}.`);
    }
    return {
      clavePeriodo: periodo.clavePeriodo,
      archivo,
    };
  });

  const archivoIndice = guardarJsonEnDirectorio_(
    directorioDatos,
    `${marcaTiempo}-${NOMBRES_ARCHIVOS.INDICE_RECIBOS}`,
    { version: 1, recibos: [] },
  );
  recursosNuevos.push(archivoIndice);

  return {
    archivoTiposRecibo,
    archivoIndice,
    archivosPeriodos,
  };
}

function sanitizarReciboParaPruebas_(recibo) {
  return {
    ...recibo,
    estado: ESTADOS_RECIBO.ENVIADO,
    identificadorFotografia: "",
    identificadorFirma: "",
    identificadorPdf: "",
    urlPdf: "",
    destinatarios: [],
    ultimoError: "",
  };
}

function aplicarReferenciasCopiaOperativa_(
  resultadoPreparacion,
  referenciasAnteriores,
  propiedades,
) {
  propiedades.setProperty(
    CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
    resultadoPreparacion.archivoTiposRecibo.getId(),
  );
  propiedades.setProperty(
    CLAVES_PROPIEDADES.ARCHIVO_INDICE_RECIBOS,
    resultadoPreparacion.archivoIndice.getId(),
  );

  referenciasAnteriores.periodos.forEach((referencia) => {
    propiedades.deleteProperty(referencia.clavePropiedad);
  });
  resultadoPreparacion.archivosPeriodos.forEach((periodo) => {
    propiedades.setProperty(
      obtenerClavePropiedadArchivoPeriodo_(periodo.clavePeriodo),
      periodo.archivo.getId(),
    );
  });
}

function limpiarReporteGeneralPruebas_() {
  const hoja = obtenerHojaRecibosReporte_();
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila > 1) hoja.deleteRows(2, ultimaFila - 1);
}

function restaurarReporteGeneralPruebas_(filas) {
  const hoja = obtenerHojaRecibosReporte_();
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila > 1) hoja.deleteRows(2, ultimaFila - 1);
  if (!filas.length) return;
  const filasDatos = filas.slice(1);
  hoja.getRange(1, 1, 1, CABECERAS_REPORTE.length).setValues([
    filas[0].slice(0, CABECERAS_REPORTE.length),
  ]);
  if (filasDatos.length) {
    hoja
      .getRange(2, 1, filasDatos.length, CABECERAS_REPORTE.length)
      .setValues(
        filasDatos.map((fila) => fila.slice(0, CABECERAS_REPORTE.length)),
      );
  }
}

function finalizarArchivosImportados_(
  resultadoPreparacion,
  referenciasAnteriores,
  directorioEstadoAnterior,
) {
  resultadoPreparacion.archivoTiposRecibo.setName(NOMBRES_ARCHIVOS.TIPOS_RECIBO);
  resultadoPreparacion.archivoIndice.setName(NOMBRES_ARCHIVOS.INDICE_RECIBOS);
  resultadoPreparacion.archivosPeriodos.forEach((periodo) => {
    periodo.archivo.setName(`recibos-${periodo.clavePeriodo}.json`);
  });

  const identificadoresNuevos = new Set([
    resultadoPreparacion.archivoTiposRecibo.getId(),
    resultadoPreparacion.archivoIndice.getId(),
    ...resultadoPreparacion.archivosPeriodos.map((periodo) => periodo.archivo.getId()),
  ]);
  const identificadoresAnteriores = [
    referenciasAnteriores.archivoTiposRecibo,
    referenciasAnteriores.archivoIndiceRecibos,
    ...referenciasAnteriores.logotipos,
    ...referenciasAnteriores.periodos.map(
      (referencia) => referencia.identificadorArchivo,
    ),
  ];
  Array.from(new Set(identificadoresAnteriores))
    .filter((identificador) => !identificadoresNuevos.has(identificador))
    .forEach((identificador) => {
      try {
        const archivo = DriveApp.getFileById(identificador);
        archivo.moveTo(directorioEstadoAnterior);
      } catch (error) {
        console.warn(
          `No se pudo mover el archivo anterior ${identificador}: ${error.message}`,
        );
      }
    });
}

function restaurarPropiedadesImportador_(propiedades, propiedadesAnteriores) {
  propiedades.setProperties(propiedadesAnteriores, true);
  propiedades.deleteProperty(
    CONFIGURACION_IMPORTADOR_PRUEBAS.CLAVE_CONFIRMACION,
  );
  invalidarMemoriaTemporalConfiguracion_();
  invalidarMemoriaTemporalResumenRecibos_();
}
