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

    // Las evidencias quedan vinculadas antes de convertir el PDF. Si el motor
    // falla, el recibo conserva sus identificadores y puede limpiarse después.
    recibo.identificadorFirma = archivoFirma.getId();
    recibo.identificadorFotografia = archivoFotografia.getId();

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
      // Se usa el recurso recibido directamente para evitar dos lecturas
      // adicionales de Drive y conservar su tipo MIME durante la conversión.
      plantilla.firmaUrlDatos = firmaBase64;
      plantilla.fotografiaUrlDatos = fotografiaBase64;

      validarUrlDatosImagen_(plantilla.firmaUrlDatos, "la firma");
      validarUrlDatosImagen_(plantilla.fotografiaUrlDatos, "la fotografía");
      if (tipoRecibo.identificadorLogotipo) {
        validarUrlDatosImagen_(plantilla.logotipoUrlDatos, "el logotipo");
      }

      const salidaHtml = plantilla.evaluate();
      const imagenesEsperadas = tipoRecibo.identificadorLogotipo ? 3 : 2;
      const contenidoPdf = salidaHtml
        .getAs(MimeType.PDF)
        .setName(`${nombreBase}.pdf`);
      const diagnosticoImagenes = diagnosticarImagenesPdf_(contenidoPdf);
      if (
        diagnosticoImagenes.cantidadObjetos < imagenesEsperadas ||
        diagnosticoImagenes.dimensionMayor < 100
      ) {
        throw new Error(
          `El conversor PDF incorporó ${diagnosticoImagenes.cantidadObjetos} de ${imagenesEsperadas} imagen(es). No se guardó un documento incompleto.`,
        );
      }

      const archivoPdf = directorioRecibos.createFile(
        contenidoPdf,
      );

      recibo.identificadorPdf = archivoPdf.getId();
      recibo.urlPdf = archivoPdf.getUrl();
      recibo.fechaFirma = obtenerFechaIso_(fechaProceso);
      recibo.fechaActualizacion = obtenerFechaIso_(fechaProceso);
      recibo.estado = ESTADOS_RECIBO.FIRMADO;
      recibo.ultimoError = "";
      guardarReciboEncontrado_(resultado);
      sincronizarReciboConReporte_(recibo);

      return crearRespuestaExitosa_(
        {
          recibo,
          urlPdf: archivoPdf.getUrl(),
          imagenesEsperadas,
          imagenesDetectadasPdf: diagnosticoImagenes.cantidadObjetos,
        },
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

function diagnosticarImagenesPdf_(contenidoPdf) {
  const bytes = contenidoPdf.getBytes();
  let contenidoAscii = "";
  for (let inicio = 0; inicio < bytes.length; inicio += 4096) {
    const segmento = bytes
      .slice(inicio, inicio + 4096)
      .map((valor) => (valor < 0 ? valor + 256 : valor));
    contenidoAscii += String.fromCharCode(...segmento);
  }
  const cantidadObjetos = (
    contenidoAscii.match(/\/Subtype\s*\/Image/g) || []
  ).length;
  const dimensiones = Array.from(
    contenidoAscii.matchAll(/\/(?:Width|Height)\s+(\d+)/g),
    (coincidencia) => Number(coincidencia[1]),
  );
  return {
    cantidadObjetos,
    dimensionMayor: dimensiones.length ? Math.max(...dimensiones) : 0,
  };
}

/**
 * Comprueba el recurso antes de entregarlo al motor HTML. La validación no se
 * hace sobre el HTML evaluado porque HtmlService puede normalizar los atributos
 * y producir falsos negativos aunque el recurso Base64 sea correcto.
 *
 * @param {string} urlDatos Recurso codificado para incrustar en el documento.
 * @param {string} nombreRecurso Nombre legible usado en el mensaje de error.
 */
function validarUrlDatosImagen_(urlDatos, nombreRecurso) {
  const coincidencia = String(urlDatos || "").match(
    /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!coincidencia || coincidencia[2].length < 100) {
    throw new Error(`No fue posible preparar ${nombreRecurso} para el PDF.`);
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
