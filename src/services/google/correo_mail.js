/**
 * Envía únicamente a contactos activos resueltos en el servidor. El navegador
 * nunca puede proporcionar direcciones arbitrarias al servicio de correo.
 *
 * @param {string} identificadorRecibo Identidad estable del recibo firmado.
 * @param {string[]} identificadoresContactos Contactos seleccionados.
 * @returns {Object} Resultado del envío.
 */
function enviarReciboPorCorreo(identificadorRecibo, identificadoresContactos) {
  const bloqueo = LockService.getScriptLock();
  try {
    const contactosSeleccionados = Array.isArray(identificadoresContactos)
      ? identificadoresContactos
      : [];
    if (!contactosSeleccionados.length) {
      throw new Error("Selecciona al menos un contacto.");
    }

    bloqueo.waitLock(30000);
    const resultado = encontrarRecibo_(identificadorRecibo);
    const recibo = resultado.recibo;
    if (
      recibo.estado !== ESTADOS_RECIBO.FIRMADO &&
      recibo.estado !== ESTADOS_RECIBO.ERROR_ENVIO
    ) {
      throw new Error("El recibo debe estar firmado antes de enviarse.");
    }
    if (!recibo.identificadorPdf) throw new Error("El recibo no tiene un PDF.");

    const configuracionCompleta = obtenerConfiguracionCompleta_();
    const contactosActivos = configuracionCompleta.contactos.filter(
      (contacto) =>
        contacto.activo &&
        contactosSeleccionados.includes(contacto.identificadorContacto),
    );
    if (contactosActivos.length !== new Set(contactosSeleccionados).size) {
      throw new Error("Uno o más contactos no existen o están inactivos.");
    }

    const configuracion = configuracionCompleta.configuracion;
    const plantilla = HtmlService.createTemplateFromFile(
      "src/views/emails/recibo",
    );
    plantilla.recibo = recibo;
    const cuerpoHtml = plantilla.evaluate().getContent();
    const correos = contactosActivos.map((contacto) => contacto.correoOriginal);
    const asunto = String(
      configuracion.asuntoCorreo || "Recibo confirmado - {{Folio}}",
    ).replace(/{{\s*Folio\s*}}/g, recibo.folio);

    try {
      MailApp.sendEmail(
        correos.join(","),
        asunto,
        `Se adjunta el recibo ${recibo.folio}.`,
        {
          htmlBody: cuerpoHtml,
          attachments: [DriveApp.getFileById(recibo.identificadorPdf).getBlob()],
          name: configuracion.nombreRemitente || "Caja",
        },
      );

      recibo.destinatarios = correos;
      recibo.fechaEnvio = obtenerFechaIso_(new Date());
      recibo.fechaActualizacion = recibo.fechaEnvio;
      recibo.estado = ESTADOS_RECIBO.ENVIADO;
      recibo.ultimoError = "";
      guardarReciboEncontrado_(resultado);
      sincronizarReciboConReporte_(recibo);
      return crearRespuestaExitosa_(recibo, "El recibo fue enviado.");
    } catch (error) {
      recibo.estado = ESTADOS_RECIBO.ERROR_ENVIO;
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
