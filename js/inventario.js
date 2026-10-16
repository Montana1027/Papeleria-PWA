
import {
    db,
    collection,
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc
} from "./firebase.js";

const lista = document.getElementById("listaProductos");
const buscar = document.getElementById("buscarProducto");
const filtroCategoria = document.getElementById("categoriaFiltro");
const filtroEstado = document.getElementById("estadoFiltro");
const botonAgregar = document.getElementById("agregarProducto");

let productos = [];
let productoEditando = null;

const estilos = document.createElement("style");
estilos.textContent = `
.modal-producto {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(25, 15, 45, .55);
    backdrop-filter: blur(4px);
}
.modal-producto.visible { display: flex; }

.formulario-producto {
    background: #fff;
    color: #302344;
    width: 100%;
    max-width: 490px;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 18px;
    padding: 28px;
    box-shadow: 0 20px 60px rgba(30, 15, 60, .25);
    font-family: inherit;
}
.formulario-producto h2 {
    margin: 0 0 7px;
    font-size: 23px;
    color: #6534a5;
}
.formulario-producto .subtitulo {
    margin: 0 0 24px;
    color: #81768f;
    font-size: 13px;
}
.formulario-producto .grupo { margin-bottom: 16px; }
.formulario-producto label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 7px;
    color: #49375f;
}
.formulario-producto input,
.formulario-producto select {
    box-sizing: border-box;
    width: 100%;
    padding: 12px 13px;
    border: 1px solid #e1d8ed;
    border-radius: 9px;
    background: #fff;
    color: #302344;
    font: inherit;
    font-size: 14px;
    outline: none;
}
.formulario-producto input:focus,
.formulario-producto select:focus {
    border-color: #8651c8;
    box-shadow: 0 0 0 3px rgba(134, 81, 200, .12);
}
.formulario-producto .dos-columnas {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
}
.formulario-producto .acciones {
    display: flex;
    gap: 10px;
    margin-top: 24px;
}
.formulario-producto .acciones button {
    flex: 1;
    padding: 12px;
    border-radius: 9px;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 14px;
}
.formulario-producto .cancelar {
    background: #f1edf6;
    color: #5d4c70;
}
.formulario-producto .guardar {
    background: #7542b5;
    color: white;
}
.formulario-producto .guardar:hover { background: #603298; }
.formulario-producto button:disabled {
    opacity: .6;
    cursor: wait;
}
.modal-mensaje {
    margin-top: 12px;
    font-size: 13px;
    color: #b42318;
}
.acciones-producto {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
}
.boton-editar-producto,
.boton-eliminar-producto {
    border: none;
    border-radius: 7px;
    padding: 8px 10px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 600;
}
.boton-editar-producto {
    background: #eee5fb;
    color: #6534a5;
}
.boton-eliminar-producto {
    background: #fee8e7;
    color: #b42318;
}
.boton-editar-producto:hover { background: #dfcef8; }
.boton-eliminar-producto:hover { background: #fbd0cd; }
@media (max-width: 480px) {
    .formulario-producto { padding: 21px; }
    .formulario-producto .dos-columnas {
        grid-template-columns: 1fr;
        gap: 0;
    }
}
`;
document.head.appendChild(estilos);

const modal = document.createElement("div");
modal.className = "modal-producto";
modal.innerHTML = `
    <form class="formulario-producto" id="formularioProducto">
        <h2 id="tituloFormulario">Agregar producto</h2>
        <p class="subtitulo" id="subtituloFormulario">
            Registra un nuevo artículo en tu inventario.
        </p>

        <div class="grupo">
            <label for="productoNombre">Nombre del producto</label>
            <input id="productoNombre" required maxlength="100"
                placeholder="Ej. Cuaderno profesional">
        </div>

        <div class="grupo">
            <label for="productoCategoria">Categoría</label>
            <select id="productoCategoria" required>
                <option value="">Selecciona una categoría</option>
                <option>Escritura</option>
                <option>Cuadernos</option>
                <option>Papel</option>
                <option>Manualidades</option>
                <option>Oficina</option>
            </select>
        </div>

        <div class="dos-columnas">
            <div class="grupo">
                <label for="productoPrecio">Precio (MXN)</label>
                <input id="productoPrecio" type="number"
                    min="0" step="0.01" required placeholder="0.00">
            </div>
            <div class="grupo">
                <label for="productoStock">Existencias</label>
                <input id="productoStock" type="number"
                    min="0" step="1" required placeholder="0">
            </div>
        </div>

        <div class="acciones">
            <button type="button" class="cancelar" id="cancelarProducto">
                Cancelar
            </button>
            <button type="submit" class="guardar" id="guardarProducto">
                Guardar producto
            </button>
        </div>
        <p class="modal-mensaje" id="mensajeProducto" role="status"></p>
    </form>
`;
document.body.appendChild(modal);

const formulario = document.getElementById("formularioProducto");
const mensaje = document.getElementById("mensajeProducto");
const guardar = document.getElementById("guardarProducto");
const tituloFormulario = document.getElementById("tituloFormulario");
const subtituloFormulario = document.getElementById("subtituloFormulario");

function abrirFormulario() {
    productoEditando = null;
    formulario.reset();
    mensaje.textContent = "";

    tituloFormulario.textContent = "Agregar producto";
    subtituloFormulario.textContent =
        "Registra un nuevo artículo en tu inventario.";
    guardar.textContent = "Guardar producto";

    modal.classList.add("visible");
    document.getElementById("productoNombre").focus();
}

function abrirEdicion(producto) {
    productoEditando = producto.id;
    formulario.reset();
    mensaje.textContent = "";

    document.getElementById("productoNombre").value =
        producto.nombre || "";

    document.getElementById("productoCategoria").value =
        producto.categoria || "";

    document.getElementById("productoPrecio").value =
        producto.precio ?? 0;

    document.getElementById("productoStock").value =
        producto.existencias ?? 0;

    tituloFormulario.textContent = "Editar producto";
    subtituloFormulario.textContent =
        "Modifica los datos del artículo seleccionado.";
    guardar.textContent = "Guardar cambios";

    modal.classList.add("visible");
    document.getElementById("productoNombre").focus();
}

function cerrarFormulario() {
    modal.classList.remove("visible");
}

botonAgregar.addEventListener("click", abrirFormulario);

document.getElementById("cancelarProducto")
    .addEventListener("click", cerrarFormulario);

modal.addEventListener("click", e => {
    if (e.target === modal) cerrarFormulario();
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape") cerrarFormulario();
});

function obtenerEstado(stock) {
    if (stock === 0) return "Agotado";
    if (stock <= 5) return "Stock bajo";
    return "Disponible";
}

function actualizarResumen() {
    document.getElementById("totalProductos").textContent =
        productos.length;

    document.getElementById("productosDisponibles").textContent =
        productos.filter(p => p.existencias > 5).length;

    document.getElementById("productosBajos").textContent =
        productos.filter(
            p => p.existencias > 0 && p.existencias <= 5
        ).length;

    document.getElementById("productosAgotados").textContent =
        productos.filter(p => p.existencias === 0).length;
}

function crearBoton(texto, clase, accion) {
    const boton = document.createElement("button");
    boton.type = "button";
    boton.textContent = texto;
    boton.className = clase;
    boton.addEventListener("click", accion);
    return boton;
}

function mostrarProductos() {
    const texto = buscar.value.trim().toLowerCase();
    const categoria = filtroCategoria.value;
    const estado = filtroEstado.value;

    const filtrados = productos.filter(p =>
        (
            (p.nombre || "").toLowerCase().includes(texto) ||
            (p.codigo || "").toLowerCase().includes(texto)
        ) &&
        (!categoria || p.categoria === categoria) &&
        (!estado || obtenerEstado(p.existencias) === estado)
    );

    lista.replaceChildren();

    if (filtrados.length === 0) {
        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 7;
        celda.textContent = "No se encontraron productos.";
        fila.appendChild(celda);
        lista.appendChild(fila);
    } else {
        filtrados.forEach(p => {
            const fila = document.createElement("tr");

            const valores = [
                p.codigo || "—",
                p.nombre || "Sin nombre",
                p.categoria || "Sin categoría",
                `$${Number(p.precio).toFixed(2)}`,
                `${p.existencias} piezas`,
                obtenerEstado(p.existencias)
            ];

            valores.forEach((valor, indice) => {
                const celda = document.createElement("td");

                if (indice === 5) {
                    const etiqueta = document.createElement("span");
                    etiqueta.textContent = valor;
                    etiqueta.className = "estado " +
                        (valor === "Agotado" ? "estado-agotado" :
                         valor === "Stock bajo" ? "estado-bajo" :
                         "estado-ok");
                    celda.appendChild(etiqueta);
                } else {
                    celda.textContent = valor;
                }

                fila.appendChild(celda);
            });

            const celdaAcciones = document.createElement("td");
            const acciones = document.createElement("div");
            acciones.className = "acciones-producto";

            acciones.appendChild(
                crearBoton(
                    "Editar",
                    "boton-editar-producto",
                    () => abrirEdicion(p)
                )
            );

            acciones.appendChild(
                crearBoton(
                    "Eliminar",
                    "boton-eliminar-producto",
                    () => eliminarProducto(p)
                )
            );

            celdaAcciones.appendChild(acciones);
            fila.appendChild(celdaAcciones);
            lista.appendChild(fila);
        });
    }

    document.getElementById("totalMostrados").textContent =
        `Mostrando ${filtrados.length} de ${productos.length} productos`;

    actualizarResumen();
}

async function eliminarProducto(producto) {
    const confirmar = window.confirm(
        `¿Seguro que deseas eliminar "${producto.nombre}" del inventario?\n\n` +
        "Esta acción no se puede deshacer."
    );

    if (!confirmar) return;

    try {
        await deleteDoc(doc(db, "productos", producto.id));
        window.alert("Producto eliminado correctamente.");
    } catch (error) {
        console.error("Error al eliminar producto:", error);
        window.alert(
            "No se pudo eliminar el producto. Revisa tu conexión e inténtalo de nuevo."
        );
    }
}

buscar.addEventListener("input", mostrarProductos);
filtroCategoria.addEventListener("change", mostrarProductos);
filtroEstado.addEventListener("change", mostrarProductos);

formulario.addEventListener("submit", async e => {
    e.preventDefault();
    mensaje.textContent = "";

    const nombre =
        document.getElementById("productoNombre").value.trim();

    const categoria =
        document.getElementById("productoCategoria").value;

    const precioTexto =
        document.getElementById("productoPrecio").value;

    const stockTexto =
        document.getElementById("productoStock").value;

    const precio = Number(precioTexto);
    const existencias = Number(stockTexto);

    if (
        !nombre ||
        !categoria ||
        precioTexto === "" ||
        stockTexto === "" ||
        !Number.isFinite(precio) ||
        precio < 0 ||
        !Number.isInteger(existencias) ||
        existencias < 0
    ) {
        mensaje.textContent = "Revisa los datos ingresados.";
        return;
    }

    guardar.disabled = true;
    guardar.textContent = productoEditando
        ? "Guardando cambios..."
        : "Guardando...";

    try {
        if (productoEditando) {
            await updateDoc(
                doc(db, "productos", productoEditando),
                {
                    nombre,
                    categoria,
                    precio,
                    existencias
                }
            );
        } else {
            await addDoc(collection(db, "productos"), {
                codigo: "PR-" + Date.now(),
                nombre,
                categoria,
                precio,
                existencias,
                creado: new Date().toISOString()
            });
        }

        cerrarFormulario();
    } catch (error) {
        console.error("Error al guardar producto:", error);
        mensaje.textContent =
            "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.";
    } finally {
        guardar.disabled = false;
        guardar.textContent = productoEditando
            ? "Guardar cambios"
            : "Guardar producto";
    }
});

onSnapshot(
    collection(db, "productos"),
    snapshot => {
        productos = snapshot.docs.map(d => ({
            id: d.id,
            ...d.data()
        }));

        mostrarProductos();
    },
    error => {
        console.error("Error al cargar productos:", error);
        lista.replaceChildren();

        const fila = document.createElement("tr");
        const celda = document.createElement("td");
        celda.colSpan = 7;
        celda.textContent = "No se pudieron cargar los productos.";
        fila.appendChild(celda);
        lista.appendChild(fila);
    }
);
