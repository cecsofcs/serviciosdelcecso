const API_URL = "https://script.google.com/macros/s/AKfycbwvN6HrSUH1qTNEnXGruTGpFI0386sLHJnqZTWSKFvAAsPvmSddeYRlTLZtzERuf8NX/exec"; 
const COSTO_ENVIO = 100;
// ==========================================
// 1. VARIABLES GLOBALES Y ESTADO (Simplificado)
// ==========================================
let cacheCatalogo = {};
let db = [], filtered = [];
let licActual = "", semActual = "", tipoActual = "";
let conEnvio = false;
// Carrito presencial (no guarda en localStorage para que empiece de cero cada venta)
let carrito = []; 

// ==========================================
// 2. INICIO Y UTILIDADES
// ==========================================
window.onload = () => { 
    renderCarrito(); 
    navegarApp('step-carrera'); // Arranca directo en la selección de carrera
};

function sanearTexto(texto) {
    if (!texto) return "";
    const correcciones = { 'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ', 'à': 'á', 'è': 'é', 'ì': 'í', 'ò': 'ó', 'ù': 'ú', 'À': 'Á', 'È': 'É', 'Ì': 'Í', 'Ò': 'Ó', 'Ù': 'Ú' };
    let saneado = texto;
    Object.keys(correcciones).forEach(error => { saneado = saneado.split(error).join(correcciones[error]); });
    return saneado;
}

const normalizar = (str) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
};

window.navegarApp = function(step) {
    const steps = ['step-carrera', 'step-semestre', 'step-tipo', 'step-catalogo'];
    steps.forEach(s => {
        const el = document.getElementById(s);
        if(el) el.style.display = (s === step) ? (s === 'step-catalogo' ? 'block' : 'flex') : 'none';
    });
    
    const btn = document.getElementById('cart-toggle-btn');
    if (step === 'step-catalogo' && window.innerWidth < 900) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
        document.getElementById('carrito-panel').classList.remove('open');
    }
};

// ==========================================
// 3. BUSCADOR Y CATÁLOGO
// ==========================================
window.seleccionarCarrera = function(c) { licActual = c; document.getElementById('txt-carrera-header').innerText = c; navegarApp('step-semestre'); };
window.seleccionarSemestre = function(s) { semActual = s; document.getElementById('txt-semestre-header').innerText = `${licActual} - ${s}`; navegarApp('step-tipo'); };
window.iniciarCarga = function(t) { tipoActual = t; const hoja = `${licActual} ${semActual} ${t}`; document.getElementById('txt-hoja-sel').innerText = hoja; navegarApp('step-catalogo'); fetchAPI(hoja); };

function fetchAPI(hoja) {
    const lista = document.getElementById('lista-libros');
    if (cacheCatalogo[hoja]) { db = cacheCatalogo[hoja]; filtered = db; renderCatalogo(); return; }
    
    lista.innerHTML = "<p style='font-weight:900;'>Cargando catálogo...</p>";
    fetch(`${API_URL}?action=obtenerCatalogo&licenciatura=${encodeURIComponent(hoja)}`)
        .then(res => res.json())
        .then(data => { 
            const procesados = data.map(item => ({ ...item, titulo: sanearTexto(item.titulo) })); 
            cacheCatalogo[hoja] = procesados; 
            db = procesados; 
            filtered = db; 
            renderCatalogo(); 
        })
        .catch(err => { lista.innerHTML = "<p style='color:red;'>⚠️ Error: No se encontró la hoja.</p>"; });
}

function renderCatalogo() {
    const grid = document.getElementById('lista-libros');
    grid.innerHTML = "";
    if(filtered.length === 0) { grid.innerHTML = "<p>No hay libros disponibles en esta sección.</p>"; return; }
    
    filtered.forEach(item => {
        const isAdded = carrito.some(c => c.id === item.id);
        const card = document.createElement('div');
        card.className = 'lib-bubble';
        card.innerHTML = `<p class="lib-title">${item.titulo}</p>
            <div class="lib-footer">
                <p class="lib-price">$${item.precio}</p>
                <button class="btn-add ${isAdded ? 'active' : ''}" onclick="toggleCart('${item.id}', '${item.titulo.replace(/'/g,"")}', ${item.precio})">
                    ${isAdded ? 'LISTO' : 'AÑADIR'}
                </button>
            </div>`;
        grid.appendChild(card);
    });
}

document.getElementById('buscador-librillos').oninput = (e) => {
    const query = normalizar(e.target.value);
    filtered = db.filter(l => normalizar(l.titulo).includes(query));
    renderCatalogo();
};

// ==========================================
// 4. CARRITO Y FINALIZACIÓN (Formulario Presencial)
// ==========================================
window.toggleCartView = function() { document.getElementById('carrito-panel').classList.toggle('open'); };

window.toggleCart = function(id, titulo, precio) {
    const idx = carrito.findIndex(c => c.id === id);
    if(idx === -1) carrito.push({ id, titulo, precio: parseInt(precio) });
    else carrito.splice(idx, 1);
    renderCatalogo(); 
    renderCarrito();
};

window.toggleEnvio = function() {
    const check = document.getElementById('check-envio');
    if(event && event.target.tagName !== 'INPUT') check.checked = !check.checked;
    conEnvio = check.checked;
    renderCarrito();
};

function renderCarrito() {
    const container = document.getElementById('cart-items-container');
    container.innerHTML = "";
    let subtotal = 0;
    
    carrito.forEach((c, i) => {
        subtotal += c.precio;
        container.innerHTML += `<div class="cart-item">
            <span class="cart-item-title">${c.titulo}</span>
            <div class="cart-item-actions">
                <span style="font-weight:900; color:var(--terracota);">$${c.precio}</span>
                <button onclick="removeCart(${i})" style="border:none; background:none; cursor:pointer;">✕</button>
            </div>
        </div>`;
    });
    if (conEnvio) {
        subtotal += COSTO_ENVIO;
    }
    document.getElementById('display-total').innerText = `$${subtotal}`;
    document.getElementById('cart-toggle-btn').innerText = `🛒 Ver Pedido: $${subtotal}`;
}

window.removeCart = function(i) {
    carrito.splice(i, 1);
    renderCarrito(); renderCatalogo();
};

window.finalizarPresencial = function() {
    if(carrito.length === 0) return alert("El pedido está vacío.");
    
    let titulos = carrito.map(c => c.titulo).join(" + ");
    const total = document.getElementById('display-total').innerText.replace("$","");
    
    // Si hay envío, lo aclaramos en el texto que viaja a la planilla
    if (conEnvio) {
        titulos += " (CON ENVÍO AL INTERIOR)";
    }
    
    const urlFormulario = "https://docs.google.com/forms/d/e/1FAIpQLSfEylsrnpju-ncRy96vkcazPY0f8SnRHuEHQJYBA7OrudkLXg/viewform?usp=pp_url"
        + "&entry.1015275134=" + encodeURIComponent(titulos)
        + "&entry.24491170=" + encodeURIComponent(total);
        
    window.open(urlFormulario, "_blank");
    
    // Vaciamos la caja y reseteamos el envío
    carrito = [];
    conEnvio = false;
    document.getElementById('check-envio').checked = false;
    
    renderCarrito();
    renderCatalogo();
    if(window.innerWidth < 900) toggleCartView();
};
