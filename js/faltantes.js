
import {
    db,
    collection,
    onSnapshot
} from "./firebase.js";

const listaFaltantes = document.getElementById("listaFaltantes");
const buscarFaltante = document.getElementById("buscarFaltante");
const filtroPrioridad = document.getElementById("filtroPrioridad");
const resumenFaltantes = document.getElementById("resumenFaltantes");

const totalBajos = document.getElementById("totalBajos");
const totalAgotados = document.getElementById("totalAgotados");
const totalSugeridas = document.getElementById("totalSugeridas");
const totalPrioridadAlta = document.getElementById("totalPrioridadAlta");

// Configuración de reabastecimiento.
const STOCK_MINIMO = 5;
const STOCK_OBJETIVO = 20;

let productos = [];

function crearCelda(texto) {
    const celda = document.createElement("td");
    celda.textContent = texto;
    return celda;
}

function calcularFaltantes(producto) {
    const existencias = Math.max(
        0,
        Number(producto.existencias) || 0
    );

    return {
        ...producto,
        existencias,
        minimo: STOCK_MINIMO,
        sugeridas: Math.max(0, STOCK_OBJETIVO - existencias),
        prioridad: existencias === 0 ? "Alta" : "Media"
    };
}

function actualizarResumen() {
    const faltantes = productos
        .map(calcularFaltantes)
        .filter(producto => producto.existencias <= STOCK_MINIMO);

    const agotados = faltantes.filter(
        producto => producto.existencias === 0
    );

    const unidades = faltantes.reduce(
        (suma, producto) => suma + producto.sugeridas,
        0
    );

    totalBajos.textContent = faltantes.length;
    totalAgotados.textContent = agotados.length;
    totalSugeridas.textContent = unidades;
    totalPrioridadAlta.textContent = agotados.length;
}

function renderizarFaltantes() {
    const busqueda = buscarFaltante.value.trim().toLowerCase();
    const prioridadSeleccionada = filtroPrioridad.value;

    const faltantes = productos
        .map(calcularFaltantes)
        .filter(producto => producto.existencias <= STOCK_MINIMO)
        .filter(producto => {
            const nombre = (producto.nombre || "").toLowerCase();
            const codigo = (producto.codigo || "").toLowerCase();
            const categoria = (producto.categoria || "").toLowerCase();

            const coincideBusqueda =
                nombre.includes(busqueda) ||
                codigo.includes(busqueda) ||
                categoria.includes(busqueda);

            const coincidePrioridad =
                !prioridadSeleccionada ||
                producto.prioridad === prioridadSeleccionada;

            return coincideBusqueda && coincidePrioridad;
        })
        .sort((a, b) => {
            if (a.existencias === 0 && b.existencias !== 0) return -1;
            if (b.existencias === 0 && a.existencias !== 0) return 1;
            return a.existencias - b.existencias;
        });

    listaFaltantes.innerHTML = "";

    if (faltantes.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "mensaje-faltantes";

        celda.textContent = productos.length === 0
            ? "Todavía no hay productos registrados en el inventario."
            : "No hay productos faltantes que coincidan con los filtros.";

        fila.appendChild(celda);
        listaFaltantes.appendChild(fila);
    } else {
        faltantes.forEach(producto => {
            const fila = document.createElement("tr");

            fila.appendChild(
                crearCelda(producto.nombre || "Producto sin nombre")
            );

            fila.appendChild(
                crearCelda(producto.categoria || "Sin categoría")
            );

            fila.appendChild(
                crearCelda(String(producto.existencias))
            );

            fila.appendChild(
                crearCelda(String(producto.minimo))
            );

            fila.appendChild(
                crearCelda(String(producto.sugeridas))
            );

            const celdaPrioridad = document.createElement("td");
            const etiqueta = document.createElement("span");

            etiqueta.className = producto.prioridad === "Alta"
                ? "estado estado-agotado"
                : "estado estado-bajo";

            etiqueta.textContent = producto.prioridad;

            celdaPrioridad.appendChild(etiqueta);
            fila.appendChild(celdaPrioridad);

            listaFaltantes.appendChild(fila);
        });
    }

    resumenFaltantes.textContent =
        `Mostrando ${faltantes.length} productos que necesitan reposición. ` +
        `Mínimo: ${STOCK_MINIMO} unidades; meta de reposición: ${STOCK_OBJETIVO} unidades.`;
}

buscarFaltante.addEventListener("input", renderizarFaltantes);
filtroPrioridad.addEventListener("change", renderizarFaltantes);

onSnapshot(
    collection(db, "productos"),
    snapshot => {
        productos = snapshot.docs.map(documento => {
            const datos = documento.data();

            return {
                id: documento.id,
                nombre: datos.nombre || "Producto sin nombre",
                codigo: datos.codigo || "",
                categoria: datos.categoria || "",
                existencias: Number(datos.existencias) || 0
            };
        });

        actualizarResumen();
        renderizarFaltantes();
    },
    error => {
        console.error("Error al cargar productos faltantes:", error);

        listaFaltantes.innerHTML = "";

        const fila = document.createElement("tr");
        const celda = document.createElement("td");

        celda.colSpan = 6;
        celda.className = "mensaje-faltantes";
        celda.textContent =
            "No se pudo consultar el inventario. Revisa la conexión y los permisos de Firebase.";

        fila.appendChild(celda);
        listaFaltantes.appendChild(fila);

        resumenFaltantes.textContent = "Error al consultar el inventario.";
    }
);
