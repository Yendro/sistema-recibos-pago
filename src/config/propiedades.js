function obtenerPropiedadesSistema_() {
  return PropertiesService.getScriptProperties();
}

function obtenerPropiedadObligatoria_(clave) {
  const valor = obtenerPropiedadesSistema_().getProperty(clave);
  if (!valor) {
    throw new Error(
      `No existe la propiedad ${clave}. Ejecuta inicializarSistemaPruebas antes de usar la aplicación.`,
    );
  }
  return valor;
}

function sistemaEstaInicializado_() {
  const propiedades = obtenerPropiedadesSistema_();
  return (
    propiedades.getProperty(CLAVES_PROPIEDADES.SISTEMA_INICIALIZADO) ===
      "SI" &&
    propiedades.getProperty(CLAVES_PROPIEDADES.VERSION_ESTRUCTURA) ===
      VERSION_ESTRUCTURA
  );
}
