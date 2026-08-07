function obtenerConfiguracionCompleta_() {
  if (!sistemaEstaInicializado_()) {
    return {
      inicializado: false,
      configuracion: null,
      tiposRecibo: [],
      contactos: [],
    };
  }

  const memoriaTemporal = CacheService.getScriptCache();
  const contenidoMemoriaTemporal = memoriaTemporal.get(
    CLAVES_MEMORIA_TEMPORAL.CONFIGURACION_WEB,
  );
  if (contenidoMemoriaTemporal) return JSON.parse(contenidoMemoriaTemporal);

  const configuracion = {
    inicializado: true,
    configuracion: leerArchivoJsonPorPropiedad_(
      CLAVES_PROPIEDADES.ARCHIVO_CONFIGURACION,
    ),
    tiposRecibo: obtenerTiposRecibo_(),
    contactos: obtenerContactos_(),
  };
  memoriaTemporal.put(
    CLAVES_MEMORIA_TEMPORAL.CONFIGURACION_WEB,
    JSON.stringify(configuracion),
    300,
  );
  return configuracion;
}

function invalidarMemoriaTemporalConfiguracion_() {
  CacheService.getScriptCache().remove(
    CLAVES_MEMORIA_TEMPORAL.CONFIGURACION_WEB,
  );
}

function obtenerTiposRecibo_() {
  const documento = leerArchivoJsonPorPropiedad_(
    CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
  );
  return Array.isArray(documento.tiposRecibo) ? documento.tiposRecibo : [];
}

function obtenerTipoReciboPorIdentificador_(identificadorTipoRecibo) {
  const tipoRecibo = obtenerConfiguracionCompleta_().tiposRecibo.find(
    (tipo) => tipo.identificadorTipoRecibo === identificadorTipoRecibo,
  );
  if (!tipoRecibo) throw new Error("El tipo de recibo no existe.");
  return tipoRecibo;
}

function guardarTipoRecibo(datosTipoRecibo, logotipoBase64) {
  try {
    if (!sistemaEstaInicializado_()) {
      throw new Error("El sistema todavía no está inicializado.");
    }

    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(30000);
    try {
      const documento = leerArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
      );
      const tiposRecibo = Array.isArray(documento.tiposRecibo)
        ? documento.tiposRecibo
        : [];
      const tipoExistente = tiposRecibo.find(
        (tipo) =>
          tipo.identificadorTipoRecibo ===
          datosTipoRecibo.identificadorTipoRecibo,
      );

      const nombreTipoRecibo = normalizarTextoMayusculas_(
        datosTipoRecibo.nombreTipoRecibo,
      );
      const nombreEmpresa = normalizarTextoMayusculas_(
        datosTipoRecibo.nombreEmpresa,
      );
      const nombreProveedor = normalizarTextoMayusculas_(
        datosTipoRecibo.nombreProveedor,
      );
      const prefijoFolio = normalizarTextoMayusculas_(
        datosTipoRecibo.prefijoFolio,
      ).replace(/[^A-Z0-9]/g, "");
      const textoPrincipal = TEXTO_PLANTILLA_GENERAL;

      if (!nombreTipoRecibo || !nombreEmpresa || !nombreProveedor) {
        throw new Error("Nombre, empresa y proveedor son obligatorios.");
      }
      if (!prefijoFolio) throw new Error("El prefijo del folio es obligatorio.");
      validarVariablesPlantilla_(textoPrincipal);

      let identificadorLogotipo = tipoExistente
        ? tipoExistente.identificadorLogotipo
        : "";
      if (logotipoBase64) {
        const directorioLogotipos = obtenerDirectorioPorPropiedad_(
          CLAVES_PROPIEDADES.DIRECTORIO_LOGOTIPOS,
        );
        const archivoLogotipo = crearArchivoDesdeBase64_(
          directorioLogotipos,
          logotipoBase64,
          `logo-${limpiarNombreArchivo_(nombreTipoRecibo)}`,
          ["image/png", "image/jpeg"],
        );
        identificadorLogotipo = archivoLogotipo.getId();
      }

      const tipoNormalizado = {
        identificadorTipoRecibo:
          tipoExistente?.identificadorTipoRecibo || Utilities.getUuid(),
        nombreTipoRecibo,
        nombreEmpresa,
        nombreProveedor,
        prefijoFolio,
        identificadorLogotipo,
        formatoPapel:
          datosTipoRecibo.formatoPapel === FORMATOS_PAPEL.A4
            ? FORMATOS_PAPEL.A4
            : FORMATOS_PAPEL.CARTA,
        colorPrincipal: /^#[0-9A-Fa-f]{6}$/.test(datosTipoRecibo.colorPrincipal)
          ? datosTipoRecibo.colorPrincipal.toUpperCase()
          : "#379FFF",
        textoPrincipal,
        activo: datosTipoRecibo.activo !== false,
        fechaActualizacion: obtenerFechaIso_(new Date()),
      };

      const posicion = tiposRecibo.findIndex(
        (tipo) =>
          tipo.identificadorTipoRecibo ===
          tipoNormalizado.identificadorTipoRecibo,
      );
      if (posicion >= 0) tiposRecibo[posicion] = tipoNormalizado;
      else tiposRecibo.push(tipoNormalizado);

      documento.version = Number(documento.version || 0) + 1;
      documento.tiposRecibo = tiposRecibo;
      guardarArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
        documento,
      );
      invalidarMemoriaTemporalConfiguracion_();

      return crearRespuestaExitosa_(tipoNormalizado, "Tipo de recibo guardado.");
    } finally {
      bloqueo.releaseLock();
    }
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

/**
 * Elimina un tipo que todavía no tenga recibos asociados. Los tipos usados se
 * conservan para que sus recibos pendientes e históricos sigan siendo legibles.
 *
 * @param {string} identificadorTipoRecibo Identidad del tipo por eliminar.
 * @returns {Object} Respuesta normalizada para la interfaz.
 */
function eliminarTipoRecibo(identificadorTipoRecibo) {
  try {
    if (!identificadorTipoRecibo) {
      throw new Error("Selecciona el tipo de recibo que deseas eliminar.");
    }
    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(30000);
    try {
      const documento = leerArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
      );
      const tiposRecibo = Array.isArray(documento.tiposRecibo)
        ? documento.tiposRecibo
        : [];
      const posicion = tiposRecibo.findIndex(
        (tipo) => tipo.identificadorTipoRecibo === identificadorTipoRecibo,
      );
      if (posicion < 0) throw new Error("El tipo de recibo ya no existe.");

      const estaEnUso = leerIndiceRecibos_().recibos.some(
        (recibo) => recibo.identificadorTipoRecibo === identificadorTipoRecibo,
      );
      if (estaEnUso) {
        throw new Error(
          "Este tipo ya tiene recibos asociados. Desactívalo para conservar el historial.",
        );
      }

      const [tipoEliminado] = tiposRecibo.splice(posicion, 1);
      documento.version = Number(documento.version || 0) + 1;
      documento.tiposRecibo = tiposRecibo;
      guardarArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_TIPOS_RECIBO,
        documento,
      );
      invalidarMemoriaTemporalConfiguracion_();

      if (tipoEliminado.identificadorLogotipo) {
        try {
          DriveApp.getFileById(tipoEliminado.identificadorLogotipo).setTrashed(true);
        } catch (error) {
          console.warn("El tipo se eliminó, pero no fue posible enviar su logotipo a la papelera.");
        }
      }
      return crearRespuestaExitosa_(tipoEliminado, "Tipo de recibo eliminado.");
    } finally {
      bloqueo.releaseLock();
    }
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function validarVariablesPlantilla_(textoPrincipal) {
  if (!textoPrincipal) throw new Error("El texto del recibo es obligatorio.");
  const coincidencias = textoPrincipal.match(/{{\s*([^{}]+)\s*}}/g) || [];
  const variablesInvalidas = coincidencias
    .map((variable) => variable.replace(/[{}]/g, "").trim())
    .filter((variable) => !VARIABLES_PLANTILLA_PERMITIDAS.includes(variable));
  if (variablesInvalidas.length) {
    throw new Error(`Variables no permitidas: ${variablesInvalidas.join(", ")}.`);
  }
}

function obtenerContactos_() {
  const documento = leerArchivoJsonPorPropiedad_(
    CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
  );
  return Array.isArray(documento.contactos) ? documento.contactos : [];
}

function guardarContacto(datosContacto) {
  try {
    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(30000);
    try {
      const documento = leerArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
      );
      const contactos = Array.isArray(documento.contactos)
        ? documento.contactos
        : [];
      const correoOriginal = String(datosContacto.correo || "").trim();
      const correoNormalizado = normalizarCorreoParaComparacion_(correoOriginal);
      const nombre = normalizarTextoMayusculas_(datosContacto.nombre);

      if (!nombre) throw new Error("El nombre del contacto es obligatorio.");
      if (!validarCorreo_(correoOriginal)) throw new Error("El correo no es válido.");

      const duplicado = contactos.find(
        (contacto) =>
          contacto.correoNormalizado === correoNormalizado &&
          contacto.identificadorContacto !== datosContacto.identificadorContacto,
      );
      if (duplicado) throw new Error("Ya existe un contacto con ese correo.");

      const existente = contactos.find(
        (contacto) =>
          contacto.identificadorContacto === datosContacto.identificadorContacto,
      );
      const contactoNormalizado = {
        identificadorContacto:
          existente?.identificadorContacto || Utilities.getUuid(),
        nombre,
        correoOriginal,
        correoNormalizado,
        activo: datosContacto.activo !== false,
        fechaActualizacion: obtenerFechaIso_(new Date()),
      };

      const posicion = contactos.findIndex(
        (contacto) =>
          contacto.identificadorContacto ===
          contactoNormalizado.identificadorContacto,
      );
      if (posicion >= 0) contactos[posicion] = contactoNormalizado;
      else contactos.push(contactoNormalizado);

      documento.version = Number(documento.version || 0) + 1;
      documento.contactos = contactos;
      guardarArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
        documento,
      );
      invalidarMemoriaTemporalConfiguracion_();
      return crearRespuestaExitosa_(contactoNormalizado, "Contacto guardado.");
    } finally {
      bloqueo.releaseLock();
    }
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

/**
 * Elimina un contacto de la libreta de destinatarios. Los correos ya enviados
 * permanecen registrados dentro de cada recibo y en el reporte general.
 *
 * @param {string} identificadorContacto Identidad del contacto por eliminar.
 * @returns {Object} Respuesta normalizada para la interfaz.
 */
function eliminarContacto(identificadorContacto) {
  try {
    if (!identificadorContacto) {
      throw new Error("Selecciona el contacto que deseas eliminar.");
    }
    const bloqueo = LockService.getScriptLock();
    bloqueo.waitLock(30000);
    try {
      const documento = leerArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
      );
      const contactos = Array.isArray(documento.contactos)
        ? documento.contactos
        : [];
      const posicion = contactos.findIndex(
        (contacto) => contacto.identificadorContacto === identificadorContacto,
      );
      if (posicion < 0) throw new Error("El contacto ya no existe.");

      const [contactoEliminado] = contactos.splice(posicion, 1);
      documento.version = Number(documento.version || 0) + 1;
      documento.contactos = contactos;
      guardarArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
        documento,
      );
      invalidarMemoriaTemporalConfiguracion_();
      return crearRespuestaExitosa_(contactoEliminado, "Contacto eliminado.");
    } finally {
      bloqueo.releaseLock();
    }
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function obtenerConfiguracionParaWeb() {
  try {
    return crearRespuestaExitosa_(obtenerConfiguracionCompleta_());
  } catch (error) {
    return crearRespuestaError_(error);
  }
}
