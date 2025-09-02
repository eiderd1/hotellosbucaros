// Animaciones AOS
AOS.init({
  duration: 1000,
  once: false
});

// Swiper Config
var swiper = new Swiper(".mySwiper", {
  loop: true,
  autoplay: {
    delay: 4000,
    disableOnInteraction: false,
  },
  pagination: {
    el: ".swiper-pagination",
    clickable: true,
  },
  navigation: {
    nextEl: ".swiper-button-next",
    prevEl: ".swiper-button-prev",
  },
});

// Fancybox (ya se activa automático con data-fancybox)
Fancybox.bind("[data-fancybox]", {
  Toolbar: {
    display: ["zoom", "slideshow", "fullscreen", "download", "thumbs", "close"],
  },
});
// =============================
// 💰 Cálculo de precios habitaciones
// =============================
document.addEventListener("DOMContentLoaded", () => {
  const tipoReserva = document.getElementById("tipo_reserva");
  const habitacionSelect = document.getElementById("habitacion_tipo");
  const adultosInput = document.getElementById("adultos_hab");
  const parejasInput = document.getElementById("parejas_hab");
  const precioTotal = document.getElementById("precio-total");
  const precioInput = document.getElementById("precio_input");

  function esFinDeSemana(fecha) {
    const d = new Date(fecha);
    const dia = d.getDay(); // 0 domingo, 6 sábado
    return dia === 0 || dia === 5 || dia === 6;
  }

  function calcularPrecio() {
    let precio = 0;
    const habitacion = habitacionSelect.value;
    const fechaIngreso = document.querySelector("input[name='fechaIngreso']").value;

    // Definir tarifas
    const tarifas = {
      "suite-familiar": { persona: 235000 },
      "cabaña-familiar": { persona: 230000 },
      "habitacion-sencilla": { semana: 430000, finde: 450000 },
      "habitacion-estandar": { semana: 450000, finde: 470000 },
      "suite-jacuzzi": { semana: 530000, finde: 550000 },
    };

    if (!fechaIngreso) {
      precioTotal.innerHTML = "<strong>$0</strong>";
      precioInput.value = 0;
      return;
    }

    const finDeSemana = esFinDeSemana(fechaIngreso);

    if (habitacion === "suite-familiar") {
      precio = (adultosInput.value || 0) * tarifas["suite-familiar"].persona;
    } else if (habitacion === "cabaña-familiar") {
      precio = (adultosInput.value || 0) * tarifas["cabaña-familiar"].persona;
    } else if (habitacion === "habitacion-sencilla") {
      precio = (parejasInput.value || 0) * (finDeSemana ? tarifas["habitacion-sencilla"].finde : tarifas["habitacion-sencilla"].semana);
    } else if (habitacion === "habitacion-estandar") {
      precio = (parejasInput.value || 0) * (finDeSemana ? tarifas["habitacion-estandar"].finde : tarifas["habitacion-estandar"].semana);
    } else if (habitacion === "suite-jacuzzi") {
      precio = (parejasInput.value || 0) * (finDeSemana ? tarifas["suite-jacuzzi"].finde : tarifas["suite-jacuzzi"].semana);
    }

    // Mostrar precio
    precioTotal.innerHTML = `<strong>$${precio.toLocaleString("es-CO")}</strong>`;
    precioInput.value = precio;
  }

  // Mostrar campos dinámicamente
  habitacionSelect.addEventListener("change", () => {
    const hab = habitacionSelect.value;
    if (hab === "suite-familiar" || hab === "cabaña-familiar") {
      document.getElementById("personas_field").style.display = "block";
      document.getElementById("parejas_field").style.display = "none";
    } else {
      document.getElementById("personas_field").style.display = "none";
      document.getElementById("parejas_field").style.display = "block";
    }
    calcularPrecio();
  });

  adultosInput.addEventListener("input", calcularPrecio);
  parejasInput.addEventListener("input", calcularPrecio);
  document.querySelector("input[name='fechaIngreso']").addEventListener("change", calcularPrecio);

  calcularPrecio();
});

// 📉 Detectar internet lento o ahorro de datos
// =============================
document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector(".hero-video");

  
  if (!video) return;

  // Verificar si el navegador indica "ahorro de datos"
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    const ahorroDatos = connection.saveData; // usuario activó ahorro de datos
    const conexionLenta = connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";

    if (ahorroDatos || conexionLenta) {
      // 🔹 Reemplazar video por imagen de fondo
      video.parentNode.replaceChild(crearImagenFallback(), video);
    }
  }
});

// =============================
// 📉 Detectar internet lento, ahorro de datos o autoplay bloqueado
// =============================
document.addEventListener("DOMContentLoaded", function () {
  const video = document.querySelector(".hero-video");

  if (!video) return;

  // --- Detectar si hay ahorro de datos o conexión lenta ---
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  if (connection) {
    const ahorroDatos = connection.saveData;
    const conexionLenta = connection.effectiveType === "2g" || connection.effectiveType === "slow-2g";

    if (ahorroDatos || conexionLenta) {
      reemplazarPorImagen(video);
      return;
    }
  }

  // --- Detectar si el autoplay está bloqueado ---
  video.play().catch(() => {
    // Si el autoplay falla → mostrar imagen
    reemplazarPorImagen(video);
  });
});

// Función que crea la imagen de respaldo
function reemplazarPorImagen(videoElement) {
  const img = document.createElement("img");
  img.src = "img/hero.jpg";
  img.alt = "Fondo Hacienda Hotel Los Bucaros";
  img.classList.add("hero-fallback");

  // Reemplazar el video por la imagen
  videoElement.parentNode.replaceChild(img, videoElement);
}

