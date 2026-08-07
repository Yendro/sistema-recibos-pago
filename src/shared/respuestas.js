function crearRespuestaExitosa_(datos, mensaje) {
  return {
    exito: true,
    mensaje: mensaje || "Operación completada.",
    datos: datos === undefined ? null : datos,
  };
}

function crearRespuestaError_(error) {
  console.error(error);
  return {
    exito: false,
    mensaje: error instanceof Error ? error.message : String(error),
    datos: null,
  };
}
