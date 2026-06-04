// Vision Stick - Ubicación real con Firebase
// URL real de Firebase Realtime Database
const FIREBASE_BASE_URL = "https://vision-stick-14318-default-rtdb.firebaseio.com";

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });
}

function mostrarMapa(latitud, longitud) {
  const mapa = document.getElementById("mapaGPS");
  const placeholder = document.getElementById("mapPlaceholder");

  if (!mapa) return;

  mapa.src = `https://www.openstreetmap.org/export/embed.html?bbox=${longitud - 0.005},${latitud - 0.005},${longitud + 0.005},${latitud + 0.005}&layer=mapnik&marker=${latitud},${longitud}`;

  if (placeholder) {
    placeholder.classList.add("loc-hidden");
  }
}

// Función modificada para mostrar directamente la fecha enviada por el ESP32
function formatearFecha(timestamp) {
  return timestamp || "Actualizando...";
}

function limpiarMapa() {
  const mapa = document.getElementById("mapaGPS");
  const placeholder = document.getElementById("mapPlaceholder");

  if (mapa) {
    mapa.src = "";
  }

  if (placeholder) {
    placeholder.classList.remove("loc-hidden");
  }
}

async function buscarBaston() {
  const codigo = document.getElementById("codigoBaston").value.trim().toUpperCase();
  const resultado = document.getElementById("resultadoUbicacion");
  const estadoSistema = document.getElementById("estadoSistema");
  const ultimaActualizacion = document.getElementById("ultimaActualizacion");

  if (codigo === "") {
    resultado.innerHTML = "Debes ingresar un código de bastón.";

    if (estadoSistema) estadoSistema.textContent = "Esperando código válido...";
    if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

    limpiarMapa();
    return;
  }

  const formatoValido = /^VS-\d{3}$/;

  if (!formatoValido.test(codigo)) {
    resultado.innerHTML = "Código inválido, Comprueba que el codigo es el correcto";

    if (estadoSistema) estadoSistema.textContent = "Formato de código no válido.";
    if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

    limpiarMapa();
    return;
  }

  try {
    if (estadoSistema) {
      estadoSistema.textContent = "Buscando ubicación en Firebase...";
    }

    const url = `${FIREBASE_BASE_URL}/bastones/${codigo}.json`;

    console.log("Buscando en Firebase:", url);

    const respuesta = await fetch(url);
    const baston = await respuesta.json();

    console.log("Respuesta Firebase:", baston);

    if (baston === null) {
      resultado.innerHTML = "No se encontró un bastón con ese código.";

      if (estadoSistema) estadoSistema.textContent = "Código no encontrado.";
      if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

      limpiarMapa();
      return;
    }

    if (baston.latitud === undefined || baston.longitud === undefined) {
      resultado.innerHTML = "El bastón existe, pero todavía no tiene coordenadas registradas.";

      if (estadoSistema) estadoSistema.textContent = "Sin ubicación GPS disponible.";
      if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

      limpiarMapa();
      return;
    }

    const latitud = Number(baston.latitud);
    const longitud = Number(baston.longitud);

    if (isNaN(latitud) || isNaN(longitud)) {
      resultado.innerHTML = "Las coordenadas registradas no son válidas.";

      if (estadoSistema) estadoSistema.textContent = "Error en coordenadas.";
      if (ultimaActualizacion) ultimaActualizacion.textContent = "Sin datos";

      limpiarMapa();
      return;
    }

    resultado.innerHTML = `
      <strong>${baston.nombre || "Vision Stick"}</strong><br>
      Código: ${codigo}<br>
      Latitud: ${latitud.toFixed(6)}<br>
      Longitud: ${longitud.toFixed(6)}<br>
      Satélites: ${baston.satelites ?? "Sin dato"}<br>
      Estado: ${baston.estado || "Activo"}
    `;

    if (estadoSistema) {
      estadoSistema.textContent = "Ubicación encontrada correctamente.";
    }

    if (ultimaActualizacion) {
      // Mostramos directamente la fecha enviada desde ESP32
      ultimaActualizacion.textContent = baston.ultimaActualizacion || "Actualizando...";
    }

    mostrarMapa(latitud, longitud);

    const dashboard = document.querySelector(".loc-dashboard");

    if (dashboard) {
      dashboard.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }

  } catch (error) {
    resultado.innerHTML = "Error al conectar con Firebase. Revisa la URL o las reglas de la base de datos.";

    if (estadoSistema) estadoSistema.textContent = "Error de conexión.";

    limpiarMapa();
    console.error("Error:", error);
  }
}

const inputCodigo = document.getElementById("codigoBaston");

if (inputCodigo) {
  inputCodigo.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
      buscarBaston();
    }
  });
}
