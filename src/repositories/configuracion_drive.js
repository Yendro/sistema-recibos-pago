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
  const memoriaTemporal = CacheService.getScriptCache();
  memoriaTemporal.remove(CLAVES_MEMORIA_TEMPORAL.CONFIGURACION_WEB);
  memoriaTemporal.remove(CLAVES_MEMORIA_TEMPORAL.TIPOS_RECIBO_OPERACION);
  memoriaTemporal.remove(CLAVES_MEMORIA_TEMPORAL.CONTACTOS_OPERACION);
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

function obtenerTiposReciboActivosParaOperacion_() {
  const memoriaTemporal = CacheService.getScriptCache();
  const contenidoMemoriaTemporal = memoriaTemporal.get(
    CLAVES_MEMORIA_TEMPORAL.TIPOS_RECIBO_OPERACION,
  );
  if (contenidoMemoriaTemporal) return JSON.parse(contenidoMemoriaTemporal);

  const tiposRecibo = obtenerTiposRecibo_()
    .filter((tipoRecibo) => tipoRecibo.activo)
    .map((tipoRecibo) => ({
      identificadorTipoRecibo: tipoRecibo.identificadorTipoRecibo,
      nombreTipoRecibo: tipoRecibo.nombreTipoRecibo,
      nombreProveedor: tipoRecibo.nombreProveedor,
    }));
  memoriaTemporal.put(
    CLAVES_MEMORIA_TEMPORAL.TIPOS_RECIBO_OPERACION,
    JSON.stringify(tiposRecibo),
    600,
  );
  return tiposRecibo;
}

function obtenerContactosActivosParaOperacion_() {
  const memoriaTemporal = CacheService.getScriptCache();
  const contenidoMemoriaTemporal = memoriaTemporal.get(
    CLAVES_MEMORIA_TEMPORAL.CONTACTOS_OPERACION,
  );
  if (contenidoMemoriaTemporal) return JSON.parse(contenidoMemoriaTemporal);

  const contactos = obtenerContactos_()
    .filter((contacto) => contacto.activo)
    .map((contacto) => ({
      identificadorContacto: contacto.identificadorContacto,
      nombre: contacto.nombre,
      correoOriginal: contacto.correoOriginal,
    }));
  memoriaTemporal.put(
    CLAVES_MEMORIA_TEMPORAL.CONTACTOS_OPERACION,
    JSON.stringify(contactos),
    600,
  );
  return contactos;
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
          : "#0E6BA8",
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

/**
 * Normaliza un contacto sin alterar la escritura original del correo.
 *
 * @param {Object} datosContacto Nombre, correo y estado recibidos.
 * @param {string} identificadorContacto Identificador nuevo o existente.
 * @param {string} fechaActualizacion Fecha compartida por la operación.
 * @returns {Object} Contacto listo para persistir.
 */
function normalizarDatosContacto_(
  datosContacto,
  identificadorContacto,
  fechaActualizacion,
) {
  const correoOriginal = String(datosContacto?.correo || "").trim();
  const correoNormalizado = normalizarCorreoParaComparacion_(correoOriginal);
  const nombre = normalizarTextoMayusculas_(datosContacto?.nombre);

  if (!nombre) throw new Error("El nombre del contacto es obligatorio.");
  if (!validarCorreo_(correoOriginal)) throw new Error("El correo no es válido.");

  return {
    identificadorContacto: identificadorContacto || Utilities.getUuid(),
    nombre,
    correoOriginal,
    correoNormalizado,
    activo: datosContacto?.activo !== false,
    fechaActualizacion,
  };
}

function guardarContacto(datosContacto) {
  try {
    if (!sistemaEstaInicializado_()) {
      throw new Error("El sistema todavía no está inicializado.");
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
      const identificadorSolicitado = String(
        datosContacto?.identificadorContacto || "",
      ).trim();
      const existente = contactos.find(
        (contacto) =>
          contacto.identificadorContacto === identificadorSolicitado,
      );
      if (identificadorSolicitado && !existente) {
        throw new Error("El contacto que intentas editar ya no existe.");
      }
      const contactoNormalizado = normalizarDatosContacto_(
        datosContacto,
        existente?.identificadorContacto,
        obtenerFechaIso_(new Date()),
      );

      const duplicado = contactos.find(
        (contacto) =>
          normalizarCorreoParaComparacion_(
            contacto.correoNormalizado || contacto.correoOriginal,
          ) === contactoNormalizado.correoNormalizado &&
          contacto.identificadorContacto !==
            contactoNormalizado.identificadorContacto,
      );
      if (duplicado) throw new Error("Ya existe un contacto con ese correo.");

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
 * Guarda varios contactos con una sola lectura y escritura. La operación es
 * atómica: si una fila es inválida o repetida, no se guarda ningún contacto.
 *
 * @param {Object[]} datosContactos Contactos nuevos por registrar.
 * @returns {Object} Respuesta normalizada con los contactos creados.
 */
function guardarContactosMasivos(datosContactos) {
  try {
    if (!sistemaEstaInicializado_()) {
      throw new Error("El sistema todavía no está inicializado.");
    }
    if (!Array.isArray(datosContactos) || !datosContactos.length) {
      throw new Error("Agrega al menos un contacto.");
    }
    if (datosContactos.length > 100) {
      throw new Error("Puedes guardar hasta 100 contactos por lote.");
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
      const correosRegistrados = new Set(
        contactos.map((contacto) =>
          normalizarCorreoParaComparacion_(
            contacto.correoNormalizado || contacto.correoOriginal,
          ),
        ),
      );
      const fechaActualizacion = obtenerFechaIso_(new Date());
      const contactosNuevos = datosContactos.map((datosContacto, indice) => {
        let contacto;
        try {
          contacto = normalizarDatosContacto_(
            datosContacto,
            "",
            fechaActualizacion,
          );
        } catch (error) {
          throw new Error(`Fila ${indice + 1}: ${error.message}`);
        }
        if (correosRegistrados.has(contacto.correoNormalizado)) {
          throw new Error(
            `Fila ${indice + 1}: ya existe un contacto con ese correo.`,
          );
        }
        correosRegistrados.add(contacto.correoNormalizado);
        return contacto;
      });

      documento.version = Number(documento.version || 0) + 1;
      documento.contactos = contactos.concat(contactosNuevos);
      guardarArchivoJsonPorPropiedad_(
        CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
        documento,
      );
      invalidarMemoriaTemporalConfiguracion_();
      return crearRespuestaExitosa_(
        {
          contactos: contactosNuevos,
          cantidad: contactosNuevos.length,
        },
        `${contactosNuevos.length} contacto(s) guardados.`,
      );
    } finally {
      bloqueo.releaseLock();
    }
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

/**
 * Elimina contactos en una sola escritura. Los correos ya enviados permanecen
 * registrados dentro de cada recibo y en el reporte general.
 *
 * @param {string[]} identificadoresContactos Identidades por eliminar.
 * @returns {Object[]} Contactos eliminados.
 */
function eliminarContactosPorIdentificadores_(identificadoresContactos) {
  if (!sistemaEstaInicializado_()) {
    throw new Error("El sistema todavía no está inicializado.");
  }
  const identificadoresUnicos = Array.from(
    new Set(
      (Array.isArray(identificadoresContactos) ? identificadoresContactos : [])
        .map((identificador) => String(identificador || "").trim())
        .filter(Boolean),
    ),
  );
  if (!identificadoresUnicos.length) {
    throw new Error("Selecciona al menos un contacto para eliminar.");
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
    const identificadoresExistentes = new Set(
      contactos.map((contacto) => contacto.identificadorContacto),
    );
    const identificadorInexistente = identificadoresUnicos.find(
      (identificador) => !identificadoresExistentes.has(identificador),
    );
    if (identificadorInexistente) {
      throw new Error(
        "Uno o más contactos seleccionados ya no existen. Actualiza la lista.",
      );
    }

    const conjuntoEliminacion = new Set(identificadoresUnicos);
    const contactosEliminados = contactos.filter((contacto) =>
      conjuntoEliminacion.has(contacto.identificadorContacto),
    );
    documento.version = Number(documento.version || 0) + 1;
    documento.contactos = contactos.filter(
      (contacto) => !conjuntoEliminacion.has(contacto.identificadorContacto),
    );
    guardarArchivoJsonPorPropiedad_(
      CLAVES_PROPIEDADES.ARCHIVO_CONTACTOS,
      documento,
    );
    invalidarMemoriaTemporalConfiguracion_();
    return contactosEliminados;
  } finally {
    bloqueo.releaseLock();
  }
}

function eliminarContacto(identificadorContacto) {
  try {
    const contactosEliminados = eliminarContactosPorIdentificadores_([
      identificadorContacto,
    ]);
    return crearRespuestaExitosa_(contactosEliminados[0], "Contacto eliminado.");
  } catch (error) {
    return crearRespuestaError_(error);
  }
}

function eliminarContactosMasivos(identificadoresContactos) {
  try {
    const contactosEliminados = eliminarContactosPorIdentificadores_(
      identificadoresContactos,
    );
    return crearRespuestaExitosa_(
      {
        contactos: contactosEliminados,
        cantidad: contactosEliminados.length,
      },
      `${contactosEliminados.length} contacto(s) eliminados.`,
    );
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
