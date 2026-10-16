/* ==========================================
   CARPETAS FERRE - SUPABASE
========================================== */

const SUPABASE_URL = "https://vkuioccwklgngkouyxuv.supabase.co";
const SUPABASE_KEY = "sb_publishable_0eVJGfrdiU0EzGY0ITEKCQ_1J8OgWcY";

const API = `${SUPABASE_URL}/rest/v1/productos-ferre`;

const pantallaInicio = document.getElementById("pantallaInicio");
const pantallaProductos = document.getElementById("pantallaProductos");
const tituloCarpeta = document.getElementById("tituloCarpeta");
const contadorProductos = document.getElementById("contadorProductos");
const listaProductos = document.getElementById("listaProductos");
const buscador = document.getElementById("buscador");

const volverBtn = document.getElementById("volverBtn");
const agregarBtn = document.getElementById("agregarBtn");

const modal = document.getElementById("modal");
const modalTitulo = document.getElementById("modalTitulo");
const formulario = document.getElementById("formulario");
const nombreInput = document.getElementById("nombreInput");
const precioInput = document.getElementById("precioInput");
const cancelarBtn = document.getElementById("cancelarBtn");
const guardarBtn = document.getElementById("guardarBtn");
const eliminarBtn = document.getElementById("eliminarBtn");

const nombresCarpetas = {
    pvc: "PVC",
    varios: "Varios de tienda"
};

let carpetaActual = null;
let productos = [];
let productoEditando = null;
let guardando = false;
let cargaActual = 0;

const encabezados = {
    "apikey": SUPABASE_KEY,
    "Content-Type": "application/json"
};

async function peticion(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        headers: {
            ...encabezados,
            ...(opciones.headers || {})
        }
    });

    if (!respuesta.ok) {
        let mensaje = `Error ${respuesta.status}`;

        try {
            const error = await respuesta.json();
            mensaje = error.message || error.details || mensaje;
        } catch (_) {}

        throw new Error(mensaje);
    }

    if (respuesta.status === 204) return null;

    const texto = await respuesta.text();
    return texto ? JSON.parse(texto) : null;
}

async function abrirCarpeta(carpeta) {
    if (!nombresCarpetas[carpeta]) return;

    carpetaActual = carpeta;
    buscador.value = "";
    tituloCarpeta.textContent = nombresCarpetas[carpeta];

    pantallaInicio.classList.add("oculto");
    pantallaProductos.classList.remove("oculto");

    await cargarProductos();
}

async function cargarProductos() {
    if (!carpetaActual) return;

    const carpetaSolicitada = carpetaActual;
    const solicitud = ++cargaActual;

    contadorProductos.textContent = "Cargando...";
    listaProductos.replaceChildren();

    try {
        const url =
            `${API}?select=id,carpeta,nombre,precio,created_at` +
            `&carpeta=eq.${encodeURIComponent(carpetaSolicitada)}` +
            `&order=id.asc`;

        const resultado = await peticion(url);

        if (
            solicitud !== cargaActual ||
            carpetaSolicitada !== carpetaActual
        ) return;

        productos = resultado;
        mostrarProductos();

    } catch (error) {
        if (solicitud !== cargaActual) return;

        console.error(error);
        contadorProductos.textContent = "Error de conexión";
        alert("No se pudieron cargar los productos: " + error.message);
    }
}

function mostrarProductos() {
    const busqueda = buscador.value.trim().toLocaleLowerCase("es");

    const filtrados = productos.filter(producto =>
        producto.nombre.toLocaleLowerCase("es").includes(busqueda)
    );

    contadorProductos.textContent =
        `${filtrados.length} de ${productos.length} productos`;

    listaProductos.replaceChildren();

    if (filtrados.length === 0) {
        const vacio = document.createElement("div");
        vacio.className = "lista-vacia";
        vacio.textContent = productos.length === 0
            ? "Todavía no hay productos en esta carpeta."
            : "No se encontraron productos.";

        listaProductos.appendChild(vacio);
        return;
    }

    for (const producto of filtrados) {
        const tarjeta = document.createElement("div");
        tarjeta.className = "producto";

        const info = document.createElement("div");
        info.className = "producto-info";

        const nombre = document.createElement("span");
        nombre.className = "producto-nombre";
        nombre.textContent = producto.nombre;

        const precio = document.createElement("span");
        precio.className = "producto-precio";
        precio.textContent = Number(producto.precio).toLocaleString(
            "es-MX",
            { style: "currency", currency: "MXN" }
        );

        const editar = document.createElement("button");
        editar.type = "button";
        editar.className = "editar-btn";
        editar.textContent = "Editar";
        editar.addEventListener("click", () => abrirEditar(producto.id));

        info.append(nombre, precio);
        tarjeta.append(info, editar);
        listaProductos.appendChild(tarjeta);
    }
}

function volverInicio() {
    if (guardando) return;

    cerrarModal();
    cargaActual++;
    carpetaActual = null;
    productos = [];

    pantallaProductos.classList.add("oculto");
    pantallaInicio.classList.remove("oculto");
}

function abrirAgregar() {
    if (!carpetaActual || guardando) return;

    productoEditando = null;
    formulario.reset();
    modalTitulo.textContent = "Agregar producto";
    eliminarBtn.classList.add("oculto");
    modal.classList.remove("oculto");
    nombreInput.focus();
}

function abrirEditar(id) {
    if (guardando) return;

    const producto = productos.find(item => item.id === id);
    if (!producto) return;

    productoEditando = id;
    modalTitulo.textContent = "Editar producto";
    nombreInput.value = producto.nombre;
    precioInput.value = producto.precio;

    eliminarBtn.classList.remove("oculto");
    modal.classList.remove("oculto");
    nombreInput.focus();
}

function cerrarModal() {
    if (guardando) return;

    modal.classList.add("oculto");
    formulario.reset();
    productoEditando = null;
}

formulario.addEventListener("submit", async event => {
    event.preventDefault();

    if (!carpetaActual || guardando) return;

    const nombre = nombreInput.value.trim();
    const precio = precioInput.value.trim();

    if (!nombre || nombre.length > 250) {
        alert("Escribe un nombre válido.");
        return;
    }

    if (
        !/^\d+(\.\d{1,2})?$/.test(precio) ||
        !Number.isFinite(Number(precio))
    ) {
        alert("Introduce un precio válido.");
        return;
    }

    guardando = true;
    guardarBtn.disabled = true;
    eliminarBtn.disabled = true;

    try {
        if (productoEditando === null) {
            await peticion(API, {
                method: "POST",
                headers: { "Prefer": "return=minimal" },
                body: JSON.stringify({
                    carpeta: carpetaActual,
                    nombre,
                    precio: Number(precio)
                })
            });
        } else {
            const id = productoEditando;

            await peticion(`${API}?id=eq.${id}`, {
                method: "PATCH",
                headers: { "Prefer": "return=minimal" },
                body: JSON.stringify({
                    nombre,
                    precio: Number(precio)
                })
            });
        }

        guardando = false;
        cerrarModal();
        await cargarProductos();

    } catch (error) {
        console.error(error);
        alert("No se pudo guardar: " + error.message);

    } finally {
        guardando = false;
        guardarBtn.disabled = false;
        eliminarBtn.disabled = false;
    }
});

eliminarBtn.addEventListener("click", async () => {
    if (!carpetaActual || productoEditando === null || guardando) return;

    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    guardando = true;
    guardarBtn.disabled = true;
    eliminarBtn.disabled = true;

    try {
        await peticion(`${API}?id=eq.${productoEditando}`, {
            method: "DELETE",
            headers: { "Prefer": "return=minimal" }
        });

        guardando = false;
        cerrarModal();
        await cargarProductos();

    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar: " + error.message);

    } finally {
        guardando = false;
        guardarBtn.disabled = false;
        eliminarBtn.disabled = false;
    }
});

document.querySelectorAll("[data-carpeta]").forEach(boton => {
    boton.addEventListener("click", () => {
        abrirCarpeta(boton.dataset.carpeta);
    });
});

volverBtn.addEventListener("click", volverInicio);
agregarBtn.addEventListener("click", abrirAgregar);
cancelarBtn.addEventListener("click", cerrarModal);
buscador.addEventListener("input", mostrarProductos);

modal.addEventListener("click", event => {
    if (event.target === modal) cerrarModal();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") cerrarModal();
});