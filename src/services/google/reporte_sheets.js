function sincronizarReciboConReporte_(recibo) {
  try {
    guardarReciboEnReporte_(recibo);
  } catch (error) {
    console.error(`No se pudo sincronizar el reporte: ${error.message}`);
  }
}

function obtenerHojaRecibosReporte_() {
  const identificadorReporte = obtenerPropiedadObligatoria_(
    CLAVES_PROPIEDADES.HOJA_REPORTE,
  );
  const hoja = SpreadsheetApp.openById(identificadorReporte).getSheetByName(
    "Recibos",
  );
  if (!hoja) throw new Error("La hoja Recibos no existe en el reporte.");
  return hoja;
}

function buscarNumeroFilaReciboReporte_(hoja, identificadorRecibo) {
  const ultimaFila = hoja.getLastRow();
  if (ultimaFila <= 1) return 0;
  const identificadores = hoja
    .getRange(2, 1, ultimaFila - 1, 1)
    .getDisplayValues()
    .flat();
  const posicion = identificadores.indexOf(identificadorRecibo);
  return posicion >= 0 ? posicion + 2 : 0;
}

function guardarReciboEnReporte_(recibo) {
  const hoja = obtenerHojaRecibosReporte_();
  const fila = convertirReciboEnFilaReporte_(recibo);
  const numeroFila = buscarNumeroFilaReciboReporte_(
    hoja,
    recibo.identificadorRecibo,
  );
  if (numeroFila) {
    hoja
      .getRange(numeroFila, 1, 1, CABECERAS_REPORTE.length)
      .setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }
}

/**
 * Retira una fila por su identificador estable. La ausencia de una fila es
 * válida porque los recibos pendientes todavía no se escriben en el reporte.
 *
 * @param {string} identificadorRecibo Identidad del recibo eliminado.
 * @returns {boolean} Verdadero cuando se eliminó una fila existente.
 */
function eliminarReciboDeReporte_(identificadorRecibo) {
  const hoja = obtenerHojaRecibosReporte_();
  const numeroFila = buscarNumeroFilaReciboReporte_(hoja, identificadorRecibo);
  if (!numeroFila) return false;
  hoja.deleteRow(numeroFila);
  return true;
}

function convertirReciboEnFilaReporte_(recibo) {
  return [
    recibo.identificadorRecibo,
    recibo.folio,
    recibo.nombreTipoRecibo,
    recibo.nombreEmpresa,
    recibo.nombreProveedor,
    recibo.cliente,
    recibo.importe,
    recibo.concepto,
    recibo.fechaPago,
    recibo.fechaCreacion,
    recibo.fechaFirma,
    recibo.fechaEnvio,
    recibo.estado,
    (recibo.destinatarios || []).join(", "),
    recibo.identificadorPdf,
    recibo.urlPdf,
  ];
}

function obtenerUrlReporteGeneral() {
  try {
    const identificadorReporte = obtenerPropiedadObligatoria_(
      CLAVES_PROPIEDADES.HOJA_REPORTE,
    );
    return crearRespuestaExitosa_({
      url: SpreadsheetApp.openById(identificadorReporte).getUrl(),
    });
  } catch (error) {
    return crearRespuestaError_(error);
  }
}
