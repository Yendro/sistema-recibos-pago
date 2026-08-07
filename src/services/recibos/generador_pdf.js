/**
 * Integra las evidencias, genera el PDF definitivo y actualiza el estado del
 * recibo bajo un bloqueo global para evitar firmas concurrentes.
 *
 * @param {string} identificadorRecibo Identidad estable del recibo.
 * @param {string} firmaBase64 Firma capturada en formato PNG.
 * @param {string} fotografiaBase64 Evidencia capturada en JPEG o PNG.
 * @returns {Object} Resultado con el recibo firmado.
 */
function firmarYGenerarPdf(
  identificadorRecibo,
  firmaBase64,
  fotografiaBase64,
) {
  const bloqueo = LockService.getScriptLock();
  try {
    if (!firmaBase64) throw new Error("La firma es obligatoria.");
    if (!fotografiaBase64) {
      throw new Error("La fotografía de identificación o rostro es obligatoria.");
    }

    bloqueo.waitLock(30000);
    const resultado = encontrarRecibo_(identificadorRecibo);
    const recibo = resultado.recibo;
    if (
      recibo.estado !== ESTADOS_RECIBO.PENDIENTE_FIRMA &&
      recibo.estado !== ESTADOS_RECIBO.ERROR_PDF
    ) {
      throw new Error("El recibo ya no está disponible para firma.");
    }

    const tipoRecibo = obtenerTipoReciboPorIdentificador_(
      recibo.identificadorTipoRecibo,
    );
    const fechaProceso = new Date();
    const directorioEvidencias = obtenerDirectorioPeriodo_(
      CLAVES_PROPIEDADES.DIRECTORIO_EVIDENCIAS,
      fechaProceso,
    );
    const directorioRecibos = obtenerDirectorioPeriodo_(
      CLAVES_PROPIEDADES.DIRECTORIO_RECIBOS,
      fechaProceso,
    );

    const nombreBase = limpiarNombreArchivo_(`${recibo.folio}-${recibo.cliente}`);
    const archivoFirma = crearArchivoDesdeBase64_(
      directorioEvidencias,
      firmaBase64,
      `${nombreBase}-firma.png`,
      ["image/png"],
    );
    const archivoFotografia = crearArchivoDesdeBase64_(
      directorioEvidencias,
      fotografiaBase64,
      `${nombreBase}-identificacion.jpg`,
      ["image/jpeg", "image/png"],
    );

    try {
      const plantilla = HtmlService.createTemplateFromFile(
        "src/views/pdf/recibo",
      );
      plantilla.recibo = recibo;
      plantilla.tipoRecibo = tipoRecibo;
      plantilla.textoPrincipal = resolverTextoPlantilla_(
        tipoRecibo.textoPrincipal,
        recibo,
        tipoRecibo,
      );
      plantilla.importeFormateado = formatearImporte_(recibo.importe);
      plantilla.fechaPagoFormateada = formatearFechaParaRecibo_(
        recibo.fechaPago,
      );
      plantilla.logotipoUrlDatos = tipoRecibo.identificadorLogotipo
        ? obtenerArchivoComoUrlDatos_(tipoRecibo.identificadorLogotipo)
        : "";
      plantilla.firmaUrlDatos = obtenerArchivoComoUrlDatos_(archivoFirma.getId());
      plantilla.fotografiaUrlDatos = obtenerArchivoComoUrlDatos_(
        archivoFotografia.getId(),
      );

      const archivoPdf = directorioRecibos.createFile(
        plantilla
          .evaluate()
          .getBlob()
          .getAs(MimeType.PDF)
          .setName(`${nombreBase}.pdf`),
      );

      recibo.identificadorFirma = archivoFirma.getId();
      recibo.identificadorFotografia = archivoFotografia.getId();
      recibo.identificadorPdf = archivoPdf.getId();
      recibo.urlPdf = archivoPdf.getUrl();
      recibo.fechaFirma = obtenerFechaIso_(fechaProceso);
      recibo.fechaActualizacion = obtenerFechaIso_(fechaProceso);
      recibo.estado = ESTADOS_RECIBO.FIRMADO;
      recibo.ultimoError = "";
      guardarReciboEncontrado_(resultado);
      sincronizarReciboConReporte_(recibo);

      return crearRespuestaExitosa_(
        { recibo, urlPdf: archivoPdf.getUrl() },
        "Firma, fotografía y PDF guardados correctamente.",
      );
    } catch (error) {
      recibo.estado = ESTADOS_RECIBO.ERROR_PDF;
      recibo.ultimoError = error.message;
      recibo.fechaActualizacion = obtenerFechaIso_(new Date());
      guardarReciboEncontrado_(resultado);
      throw error;
    }
  } catch (error) {
    return crearRespuestaError_(error);
  } finally {
    if (bloqueo.hasLock()) bloqueo.releaseLock();
  }
}

function obtenerDirectorioPeriodo_(claveDirectorioBase, fecha) {
  const directorioBase = obtenerDirectorioPorPropiedad_(claveDirectorioBase);
  const anio = Utilities.formatDate(
    fecha,
    Session.getScriptTimeZone(),
    "yyyy",
  );
  const mes = Utilities.formatDate(fecha, Session.getScriptTimeZone(), "MM");
  return obtenerOCrearSubdirectorio_(
    obtenerOCrearSubdirectorio_(directorioBase, anio),
    mes,
  );
}

function resolverTextoPlantilla_(texto, recibo, tipoRecibo) {
  const valores = {
    Folio: recibo.folio,
    FechaPago: formatearFechaParaRecibo_(recibo.fechaPago),
    FechaCreacion: formatearFechaParaRecibo_(recibo.fechaCreacion),
    Cliente: recibo.cliente,
    Proveedor: tipoRecibo.nombreProveedor,
    Importe: formatearImporte_(recibo.importe),
    ImporteLetra: recibo.importeLetra,
    Concepto: recibo.concepto,
  };

  return String(texto || "").replace(
    /{{\s*([^{}]+)\s*}}/g,
    (coincidencia, variable) =>
      Object.prototype.hasOwnProperty.call(valores, variable.trim())
        ? valores[variable.trim()]
        : coincidencia,
  );
}
