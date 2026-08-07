function sincronizarReciboConReporte_(recibo) {
  try {
    const identificadorReporte = obtenerPropiedadObligatoria_(
      CLAVES_PROPIEDADES.HOJA_REPORTE,
    );
    const hoja = SpreadsheetApp.openById(identificadorReporte).getSheetByName(
      "Recibos",
    );
    if (!hoja) throw new Error("La hoja Recibos no existe en el reporte.");

    const fila = convertirReciboEnFilaReporte_(recibo);
    const ultimaFila = hoja.getLastRow();
    let numeroFila = 0;
    if (ultimaFila > 1) {
      const identificadores = hoja
        .getRange(2, 1, ultimaFila - 1, 1)
        .getDisplayValues()
        .flat();
      const posicion = identificadores.indexOf(recibo.identificadorRecibo);
      if (posicion >= 0) numeroFila = posicion + 2;
    }

    if (numeroFila) {
      hoja
        .getRange(numeroFila, 1, 1, CABECERAS_REPORTE.length)
        .setValues([fila]);
    } else {
      hoja.appendRow(fila);
    }
  } catch (error) {
    console.error(`No se pudo sincronizar el reporte: ${error.message}`);
  }
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
