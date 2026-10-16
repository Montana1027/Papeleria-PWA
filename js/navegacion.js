
document.addEventListener("DOMContentLoaded", function () {

    // Restaurar el tema guardado
    const botonTema = document.getElementById("botonTema");
    const temaGuardado = localStorage.getItem("modoOscuro") === "true";

    function aplicarTema(oscuro) {
        document.documentElement.classList.toggle("modo-oscuro", oscuro);
        document.body.classList.toggle("modo-oscuro", oscuro);

        if (botonTema) {
            botonTema.textContent = oscuro ? "☀️" : "🌙";
        }

        localStorage.setItem("modoOscuro", String(oscuro));
    }

    // Aplicar el tema al cargar
    aplicarTema(temaGuardado);

    // Cambiar el tema inmediatamente
    if (botonTema) {
        botonTema.addEventListener("click", function () {
            const oscuro =
                !document.documentElement.classList.contains("modo-oscuro");

            aplicarTema(oscuro);
        });
    }

    // Menú para celulares
    const botonMenu = document.querySelector(".menu-movil");
    const sidebar = document.querySelector(".sidebar");

    if (botonMenu && sidebar) {
        botonMenu.addEventListener("click", function () {
            sidebar.classList.toggle("abierto");
        });
    }

    // Fecha actual
    const fecha = document.querySelector(".fecha");

    if (fecha) {
        fecha.textContent = new Date().toLocaleDateString("es-MX", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    // Marcar la página activa
    const paginaActual = window.location.pathname.split("/").pop();

    document.querySelectorAll(".menu a").forEach(function (enlace) {
        const destino = enlace.getAttribute("href").split("/").pop();

        if (destino === paginaActual) {
            enlace.classList.add("activo");
        } else {
            enlace.classList.remove("activo");
        }
    });

});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
        const rutaSW = window.location.pathname.includes("/paginas/")
            ? "../service-worker.js"
            : "./service-worker.js";

        navigator.serviceWorker.register(rutaSW)
            .then(function () {
                console.log("PWA: Service Worker registrado correctamente");
            })
            .catch(function (error) {
                console.error("Error al registrar el Service Worker:", error);
            });
    });
}
