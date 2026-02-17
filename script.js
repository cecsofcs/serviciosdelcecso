const API_URL = "https://script.google.com/macros/s/AKfycbwvN6HrSUH1qTNEnXGruTGpFI0386sLHJnqZTWSKFvAAsPvmSddeYRlTLZtzERuf8NX/exec"; 

const COSTO_ENVIO = 200; 

// ==========================================
// 1. VARIABLES GLOBALES Y CARRITOS
// ==========================================
let cacheCatalogo = {};
let db = [], filtered = [];
let licActual = "", semActual = "", tipoActual = "", conEnvio = false;
let planesEstudio = null;
let estadoTrayectoria = JSON.parse(localStorage.getItem("cecso_trayectoria")) || {};
let carreraActivaId = null;
let optativasActuales = []; 

// Carrito General (Buscador)
let carrito = JSON.parse(localStorage.getItem("cecsocart")) || []; 

// Carrito Aislado (Modal Cursar)
let carritoCursar = []; 
let conEnvioCursar = false;
let librillosCursarEncontrados = [];

// ==========================================
// 2. INICIO Y UTILIDADES
// ==========================================
window.onload = () => { 
    renderCarrito(); 
    navegar('inicio'); 
    fetch(`${API_URL}?action=obtenerMallas`)
        .then(res => res.json())
        .then(data => {
            if(data.error) console.error("Error desde el Apps Script:", data.error);
            else planesEstudio = data;
        }).catch(err => console.error("Error al sincronizar las mallas: ", err));
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

window.navegar = function(seccion) {
    window.scrollTo(0,0);
    document.getElementById('seccion-inicio').style.display = (seccion === 'inicio') ? 'block' : 'none';
    document.getElementById('app-container').style.display = (seccion === 'app') ? 'block' : 'none';
    document.getElementById('seccion-trayectoria').style.display = (seccion === 'trayectoria') ? 'block' : 'none';
    document.getElementById('cart-toggle-btn').style.display = 'none';
    if(seccion === 'app') navegarApp('step-carrera');
};

window.navegarApp = function(step) {
    const steps = ['step-carrera', 'step-semestre', 'step-tipo', 'step-catalogo'];
    steps.forEach(s => {
        document.getElementById(s).style.display = (s === step) ? (s === 'step-catalogo' ? 'block' : 'flex') : 'none';
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
// 3. BUSCADOR Y CARRITO GENERAL
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
        .then(data => { const procesados = data.map(item => ({ ...item, titulo: sanearTexto(item.titulo) })); cacheCatalogo[hoja] = procesados; db = procesados; filtered = db; renderCatalogo(); })
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

window.toggleCartView = function() { document.getElementById('carrito-panel').classList.toggle('open'); };
window.toggleEnvio = function() {
    const check = document.getElementById('check-envio');
    if(event && event.target.tagName !== 'INPUT') check.checked = !check.checked;
    conEnvio = check.checked;
    renderCarrito();
};

window.toggleCart = function(id, titulo, precio) {
    const idx = carrito.findIndex(c => c.id === id);
    if(idx === -1) carrito.push({ id, titulo, precio: parseInt(precio) });
    else carrito.splice(idx, 1);
    localStorage.setItem("cecsocart", JSON.stringify(carrito));
    renderCatalogo(); 
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
    if(conEnvio) subtotal += COSTO_ENVIO;
    document.getElementById('display-total').innerText = `$${subtotal}`;
    document.getElementById('cart-toggle-btn').innerText = `🛒 Mi Pedido: $${subtotal}`;
}

window.removeCart = function(i) {
    carrito.splice(i, 1);
    localStorage.setItem("cecsocart", JSON.stringify(carrito));
    renderCarrito(); renderCatalogo();
}

document.getElementById('buscador-librillos').oninput = (e) => {
    const query = normalizar(e.target.value);
    filtered = db.filter(l => normalizar(l.titulo).includes(query));
    renderCatalogo();
};

window.finalizar = function() {
    if(carrito.length === 0) return alert("El carrito está vacío.");
    const titulos = carrito.map(c => c.titulo).join(", ");
    const total = document.getElementById('display-total').innerText.replace("$","");
    const envio = conEnvio ? "Sí" : "No";
    const url = "https://docs.google.com/forms/d/e/1FAIpQLSfdrntWehRkIJFXNd4SYQ7dczmur09LZ9ApGFjl5GA0J7wFTQ/viewform?usp=pp_url"
        + "&entry.539670442=" + encodeURIComponent(titulos) + "&entry.482914514=" + encodeURIComponent(total) + "&entry.1104329366=" + encodeURIComponent(envio);
    window.open(url, "_blank");
};

// ========================================================
// 4. MI TRAYECTORIA (CARGA Y RENDERIZADO)
// ========================================================
window.cargarPlan = function(idCarrera) {
    if (!planesEstudio || Object.keys(planesEstudio).length === 0) {
        alert("Las trayectorias se están actualizando desde la nube. ¡Esperá unos segunditos e intentá de nuevo!");
        return;
    }
    carreraActivaId = idCarrera;
    document.getElementById('trayectoria-content').style.display = 'block';
    
    if (!estadoTrayectoria[idCarrera]) {
        estadoTrayectoria[idCarrera] = { aprobadas: [], cursar: [], creditos_optativos: {}, cursar_optativos: {} };
    }
    if (!estadoTrayectoria[idCarrera].creditos_optativos) estadoTrayectoria[idCarrera].creditos_optativos = {};
    if (!estadoTrayectoria[idCarrera].cursar_optativos) estadoTrayectoria[idCarrera].cursar_optativos = {};
    
    const panelZen = document.querySelector('.panel-zen');
    panelZen.innerHTML = `
        <div class="panel-zen-info">
            <h3 id="titulo-carrera-activa" class="titulo-zen"></h3>
        </div>
        <div class="panel-zen-acciones">
            <button id="btn-estado-inscripcion" class="btn-estado" style="display:none; margin:0;" onclick="abrirModalInscripcion()">
                📋 Ver Requisitos
            </button>
            <div class="contador-box">
                <span id="texto-progreso-global" class="numero-zen">0 / 0 cr.</span>
            </div>
        </div>
    `;

    renderPlan(idCarrera);
};

function renderPlan(idCarrera) {
    const plan = planesEstudio[idCarrera];
    if (!plan) return; 

    document.getElementById('titulo-carrera-activa').innerText = plan.nombre;
    const container = document.getElementById('modulos-container');
    container.innerHTML = '';

    let creditosTotalesAprobados = 0;
    let moiRenderizado = false;

    // ----- MOI DESARROLLO -----
    function inyectarMOI() {
        if (idCarrera !== 'desarrollo' || moiRenderizado) return;
        moiRenderizado = true;

        const moiActual = estadoTrayectoria[idCarrera].tipo_moi || 'pendiente';
        let contenidoMOI = '';

        if (moiActual === 'pendiente') {
            contenidoMOI = `
                <p style="font-size:0.95rem; margin-bottom:15px; font-weight:600;">A partir del 6to semestre tenés que elegir un Módulo Optativo Integral (MOI) de 35 créditos.</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn-estado" style="background:#d1ecf1; border-color:#17a2b8;" onclick="seleccionarMOI('${idCarrera}', 'elegir_pre')">📘 Elegir un MOI existente</button>
                    <button class="btn-estado" style="background:#fff3cd; border-color:#ffc107;" onclick="seleccionarMOI('${idCarrera}', 'propio')">🛠️ Voy a armar el mío propio</button>
                    <button class="btn-estado" style="background:var(--rosa-suave);" onclick="seleccionarMOI('${idCarrera}', 'nose')">🤔 Todavía no elegí</button>
                </div>
            `;
        } else if (moiActual === 'nose') {
            contenidoMOI = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0; color:var(--petroleo);">🤔 Todavía no elegí MOI</h4>
                    <button class="btn-back" style="margin:0; font-size:0.8rem;" onclick="seleccionarMOI('${idCarrera}', 'pendiente')">Cambiar</button>
                </div>
                <p style="margin:10px 0 0 0; font-size:0.85rem;">El MOI se define en el Ciclo Avanzado. Aprovechá estos primeros semestres para explorar materias.</p>
            `;
        } else if (moiActual === 'propio') {
            const credsPropios = parseInt(estadoTrayectoria[idCarrera].creditos_moi_propio || 0);
            creditosTotalesAprobados += credsPropios; 
            
            contenidoMOI = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                    <h4 style="margin:0; color:#856404; font-size:1.1rem;">🛠️ MOI Libre (Armado por estudiante)</h4>
                    <button class="btn-back" style="margin:0; font-size:0.8rem;" onclick="seleccionarMOI('${idCarrera}', 'pendiente')">Cambiar</button>
                </div>
                <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px;">
                    <p style="margin:0 0 15px 0; font-size:0.85rem; color:#856404;">Recordá que para armar tu propio MOI tenés que presentar una carta a la Comisión de Carrera.</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed #ffeeba; padding-top: 15px;">
                        <span style="font-weight: 800; color: #856404; font-size: 0.9rem;">Créditos listos de tu MOI:</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <input type="number" min="0" max="35" value="${credsPropios}" class="input-optativos" style="border-color:#856404; color:#856404; box-shadow: 3px 3px 0px #856404;" onchange="actualizarCreditosMOIPropio('${idCarrera}', this.value)">
                            <span style="font-weight:900; color:#856404; font-size:1rem;">/ 35 cr.</span>
                        </div>
                    </div>
                </div>
            `;
        } else if (moiActual === 'elegir_pre') {
            contenidoMOI = `
                <p style="font-size:0.95rem; margin-bottom:15px; font-weight:600;">Seleccioná cuál de los 3 MOI querés cursar:</p>
                <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;">
                    <button class="btn-estado" onclick="seleccionarMOI('${idCarrera}', 'moi_eco')">Desarrollo Económico</button>
                    <button class="btn-estado" onclick="seleccionarMOI('${idCarrera}', 'moi_terr')">Desarrollo Territorial</button>
                    <button class="btn-estado" onclick="seleccionarMOI('${idCarrera}', 'moi_gpp')">Gestión y Políticas Públicas</button>
                </div>
                <button class="btn-back" style="margin:0; font-size:0.8rem;" onclick="seleccionarMOI('${idCarrera}', 'pendiente')">← Volver atrás</button>
            `;
        } else if (['moi_eco', 'moi_terr', 'moi_gpp'].includes(moiActual)) {
            let titulos = { 'moi_eco': '📈 MOI: Desarrollo Económico', 'moi_terr': '🗺️ MOI: Desarrollo Territorial', 'moi_gpp': '🏛️ MOI: Gestión y Políticas Públicas' };
            contenidoMOI = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="margin:0; color:#155724; font-size: 1.1rem;">${titulos[moiActual]}</h4>
                    <button class="btn-back" style="margin:0; font-size:0.8rem;" onclick="seleccionarMOI('${idCarrera}', 'elegir_pre')">Cambiar MOI</button>
                </div>
            `;
        }

        container.innerHTML += `<div class="modulo-box modulo-moi">
            <div class="modulo-header">
                <h3 style="color:var(--petroleo); display: ${['moi_eco', 'moi_terr', 'moi_gpp'].includes(moiActual) ? 'block' : 'none'};">🎯 Tu MOI Elegido</h3>
            </div>
            ${contenidoMOI}
        </div>`;

        if (['moi_eco', 'moi_terr', 'moi_gpp'].includes(moiActual) && planesEstudio[moiActual]) {
            renderizarModulos(planesEstudio[moiActual].modulos, idCarrera);
        }
    }

    // ----- RENDERIZADO DE MÓDULOS -----
    function renderizarModulos(modulosArray, idGuardado) {
        modulosArray.forEach(modulo => {
            
            if (idCarrera === 'desarrollo' && modulo.nombre.toLowerCase().includes('trabajo final')) {
                inyectarMOI();
            }

            const nMod = modulo.nombre.toLowerCase();
            let claseColor = (nMod.includes('optativa') || nMod.includes('electiva') || nMod.includes('bolsa')) ? 'modulo-optativa' : 'modulo-obligatoria';

            let creditosModulo = 0;
            let creditosTotalesModulo = 0; 
            let htmlMaterias = '';

            modulo.materias.forEach(mat => {
                creditosTotalesModulo += mat.creditos; 
                let htmlVectorEconomico = "";

                // VECTOR ECONÓMICO (CIENCIA POLÍTICA)
                if (mat.id === 'cp_dc_eco_elec') {
                    const aprobadas = estadoTrayectoria[idGuardado]?.aprobadas || [];
                    const tieneMacro = aprobadas.includes('cp_dc_eco_core1');
                    const tieneMicro = aprobadas.includes('cp_dc_eco_core2');

                    if (tieneMacro && tieneMicro) {
                        htmlVectorEconomico = `<div style="background: #d4edda; border-left: 4px solid #28a745; padding: 10px; margin-top: 10px; font-size: 0.85rem; color: #155724; border-radius: 4px;">✅ <strong>¡Tenés Micro y Macro!</strong> Estás habilitado para cursar <strong>todas</strong> las optativas del vector económico.</div>`;
                    } else if (tieneMacro) {
                        htmlVectorEconomico = `<div style="background: #d1ecf1; border-left: 4px solid #17a2b8; padding: 10px; margin-top: 10px; font-size: 0.85rem; color: #0c5460; border-radius: 4px;">📈 <strong>Al tener Análisis Macro aprobado</strong>, podés cursar electivas como:<br>• Educación y desarrollo (6 cr)<br>• Economía internacional (6 cr)<br>• Economía de la discriminación (6 cr)<br>• Desigualdad y pobreza (10 cr)<br><em>(Para Economía Pública o Mercado de Trabajo se recomienda Análisis Micro).</em></div>`;
                    } else if (tieneMicro) {
                        htmlVectorEconomico = `<div style="background: #e2e3e5; border-left: 4px solid #6c757d; padding: 10px; margin-top: 10px; font-size: 0.85rem; color: #383d41; border-radius: 4px;">📊 <strong>Al tener Análisis Micro aprobado</strong>, podés cursar electivas como:<br>• Economía pública (6 cr)<br>• Mercado de trabajo y familia (6 cr)<br>• Educación y desarrollo (6 cr)<br>• Economía de la discriminación (6 cr)<br>• Desigualdad y pobreza (10 cr)<br><em>(Para Economía Internacional se recomienda Análisis Macro).</em></div>`;
                    } else {
                        htmlVectorEconomico = `<div style="background: #fff3cd; border-left: 4px solid #ffeeba; padding: 10px; margin-top: 10px; font-size: 0.85rem; color: #856404; border-radius: 4px;">⚠️ <strong>Aviso sobre el Vector Económico:</strong> Marcá Macro o Micro como aprobada para ver las electivas habilitadas.</div>`;
                    }
                }

                // PREVIAS Y NOTAS EXTRAS
                let cartelLlave = mat.llave_de ? `
                    <div style="background: rgba(217, 125, 96, 0.1); border-left: 4px solid var(--terracota); padding: 8px 12px; margin-top: 10px; font-size: 0.8rem; font-weight: 700; color: var(--negro); border-radius: 4px;">
                        🔑 Materia previa de <strong>${mat.llave_de}</strong>. ¡Importante priorizar!
                    </div>` : '';

                let txtSemestre = mat.semestre ? ((mat.semestre % 2 === 0) ? 'Semestre Par' : 'Semestre Impar') : 'Semestre variable';
                let notaExtra = mat.nota ? `<div style="color:var(--terracota); font-weight:700; font-size: 0.8rem; margin-top: 5px;">📝 ${mat.nota}</div>` : '';

                // BOLSAS VS MATERIAS NORMALES
                if (mat.es_bolsa_creditos) {
                    const valorOptativo = estadoTrayectoria[idGuardado].creditos_optativos[mat.id] || 0;
                    const valorCursar = estadoTrayectoria[idGuardado].cursar_optativos?.[mat.id] || 0;
                    
                    creditosModulo += parseInt(valorOptativo);
                    creditosTotalesAprobados += parseInt(valorOptativo);

                    htmlMaterias += `
                        <div class="materia-item">
                            <div class="materia-info">
                                <h4 class="materia-nombre">${mat.nombre}</h4>
                                ${notaExtra}
                                <button class="btn-estado" style="margin-top: 10px; font-size: 0.7rem; background: rgba(255,255,255,0.8);" onclick="abrirModalOptativas('${mat.id}', '${mat.nombre}')">¿Y cuáles puedo hacer?</button>
                                ${htmlVectorEconomico}
                                ${cartelLlave}
                            </div>
                            <div class="materia-acciones bolsa-mobile">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 0.8rem; font-weight: 700; color: #666;">Ya aprobados:</span>
                                    <input type="number" min="0" max="${mat.creditos}" value="${valorOptativo}" class="input-optativos" onchange="actualizarBolsaOptativas('${idGuardado}', '${mat.id}', this.value, ${mat.creditos})">
                                    <span style="font-weight:900; color:var(--petroleo); font-size:0.9rem;">/ ${mat.creditos} cr.</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 0.8rem; font-weight: 800; color: var(--terracota);">Voy a cursar:</span>
                                    <input type="number" min="0" value="${valorCursar}" class="input-optativos" style="border-color: var(--terracota); box-shadow: 3px 3px 0px var(--terracota);" onchange="actualizarBolsaCursar('${idGuardado}', '${mat.id}', this.value)">
                                    <span style="font-weight:900; color:var(--terracota); font-size:0.9rem;">cr.</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    const isAprobada = estadoTrayectoria[idGuardado].aprobadas.includes(mat.id);
                    const isCursar = estadoTrayectoria[idGuardado].cursar.includes(mat.id);
                    
                    if (isAprobada) { 
                        creditosModulo += mat.creditos; 
                        creditosTotalesAprobados += mat.creditos; 
                    }

                    htmlMaterias += `
                        <div class="materia-item">
                            <div class="materia-info">
                                <h4 class="materia-nombre">${mat.nombre}</h4>
                                <p class="materia-meta">${mat.creditos} créditos | ${txtSemestre}</p>
                                ${notaExtra}
                                ${cartelLlave}
                                ${htmlVectorEconomico}
                            </div>
                            <div class="materia-acciones">
                                <button class="btn-estado btn-aprobada ${isAprobada ? 'activa' : ''}" onclick="toggleMateria('${idGuardado}', '${mat.id}', 'aprobada')">${isAprobada ? '✅ Aprobada' : 'Aprobada'}</button>
                                <button class="btn-estado btn-cursar ${isCursar ? 'activa' : ''}" onclick="toggleMateria('${idGuardado}', '${mat.id}', 'cursar')">${isCursar ? '🎒 Cursar' : 'Cursar'}</button>
                            </div>
                        </div>
                    `;
                }
            });

            container.innerHTML += `
                <div class="modulo-box ${claseColor}">
                    <div class="modulo-header">
                        <h3>${modulo.nombre}</h3>
                        <span class="modulo-progreso">${creditosModulo} / ${creditosTotalesModulo} cr.</span>
                    </div>
                    ${htmlMaterias}
                </div>
            `;
        });
    }

    renderizarModulos(plan.modulos, idCarrera);

    if (idCarrera === 'desarrollo' && !moiRenderizado) {
        inyectarMOI();
    }

    document.getElementById('texto-progreso-global').innerText = `${creditosTotalesAprobados} / ${plan.creditos_totales_requeridos} cr.`;
    actualizarEsteSemestreGlobal();
    actualizarVisibilidadBotonInscripcion(idCarrera);
}

// ========================================================
// 5. MI TRAYECTORIA (INTERACCIONES)
// ========================================================
window.seleccionarMOI = function(idCarrera, opcion) {
    if (!estadoTrayectoria[idCarrera]) estadoTrayectoria[idCarrera] = {};
    estadoTrayectoria[idCarrera].tipo_moi = opcion;
    localStorage.setItem("cecso_trayectoria", JSON.stringify(estadoTrayectoria));
    renderPlan(idCarrera);
};

window.actualizarCreditosMOIPropio = function(idCarrera, valor) {
    let numero = parseInt(valor);
    if (isNaN(numero) || numero < 0) numero = 0;
    if (numero > 35) numero = 35;
    estadoTrayectoria[idCarrera].creditos_moi_propio = numero;
    localStorage.setItem("cecso_trayectoria", JSON.stringify(estadoTrayectoria));
    renderPlan(idCarrera);
};

window.actualizarBolsaOptativas = function(idGuardado, idMateria, valor, maximo) {
    let numero = parseInt(valor);
    if (isNaN(numero) || numero < 0) numero = 0;
    if (numero > maximo) numero = maximo; 
    estadoTrayectoria[idGuardado].creditos_optativos[idMateria] = numero;
    localStorage.setItem("cecso_trayectoria", JSON.stringify(estadoTrayectoria));
    renderPlan(idGuardado);
};

window.actualizarBolsaCursar = function(idGuardado, idMateria, valor) {
    let numero = parseInt(valor);
    if (isNaN(numero) || numero < 0) numero = 0;
    if (!estadoTrayectoria[idGuardado].cursar_optativos) estadoTrayectoria[idGuardado].cursar_optativos = {};
    estadoTrayectoria[idGuardado].cursar_optativos[idMateria] = numero;
    localStorage.setItem("cecso_trayectoria", JSON.stringify(estadoTrayectoria));
    renderPlan(idGuardado);
};

window.toggleMateria = function(idGuardado, idMateria, accion) {
    let estado = estadoTrayectoria[idGuardado];
    if (!estado.aprobadas) estado.aprobadas = [];
    if (!estado.cursar) estado.cursar = [];

    if (accion === 'aprobada') {
        const idx = estado.aprobadas.indexOf(idMateria);
        if (idx === -1) {
            estado.aprobadas.push(idMateria);
            estado.cursar = estado.cursar.filter(id => id !== idMateria); 
        } else { estado.aprobadas.splice(idx, 1); }
    } else if (accion === 'cursar') {
        const idx = estado.cursar.indexOf(idMateria);
        if (idx === -1) {
            estado.cursar.push(idMateria);
            estado.aprobadas = estado.aprobadas.filter(id => id !== idMateria);
        } else { estado.cursar.splice(idx, 1); }
    }
    localStorage.setItem("cecso_trayectoria", JSON.stringify(estadoTrayectoria));
    renderPlan(idGuardado);
};

function actualizarEsteSemestreGlobal() {
    if (!planesEstudio) return;

    const contenedor = document.getElementById('este-semestre-container');
    const lista = document.getElementById('lista-este-semestre');
    const txtCreditos = document.getElementById('txt-creditos-semestre');
    const alertaCreditos = document.getElementById('alerta-creditos-semestre');
    
    let todasLasMateriasCursando = [];
    let creditosSemestre = 0;

    Object.keys(planesEstudio).forEach(key => {
        const plan = planesEstudio[key];
        let idEstado = key.startsWith('moi_') ? 'desarrollo' : key;
        const estado = estadoTrayectoria[idEstado] || { cursar: [], cursar_optativos: {} };
        
        if (key.startsWith('moi_') && estadoTrayectoria['desarrollo']?.tipo_moi !== key) return;
        
        let nombreCarreraLimpio = plan.nombre.replace('Licenciatura en ', '').replace('MOI: ', '');

        plan.modulos.forEach(modulo => {
            modulo.materias.forEach(mat => {
                if (mat.es_bolsa_creditos) {
                    const credsPlan = parseInt(estado.cursar_optativos?.[mat.id] || 0);
                    if (credsPlan > 0) {
                        creditosSemestre += credsPlan;
                        todasLasMateriasCursando.push(`<strong>[${nombreCarreraLimpio}]</strong> ${mat.nombre} - Electivas (<em>${credsPlan} cr.</em>)`);
                    }
                } else {
                    if (estado.cursar && estado.cursar.includes(mat.id)) {
                        creditosSemestre += mat.creditos;
                        todasLasMateriasCursando.push(`<strong>[${nombreCarreraLimpio}]</strong> ${mat.nombre} (<em>${mat.creditos} cr.</em>)`);
                    }
                }
            });
        });
    });
    
    if (todasLasMateriasCursando.length > 0 || creditosSemestre > 0) {
        contenedor.style.display = 'block';
        lista.innerHTML = todasLasMateriasCursando.map(mat => `<li>${mat}</li>`).join('');
        txtCreditos.innerText = `${creditosSemestre} cr.`;

        if (creditosSemestre > 52) {
            alertaCreditos.style.display = 'block';
            alertaCreditos.innerHTML = `⚠️ Tenés ${creditosSemestre} créditos. Estás superando el límite reglamentario (52 cr). Bedelía no te va a dejar inscribirte a todo, revisá tu plan de semestre.`;
        } else { alertaCreditos.style.display = 'none'; }
    } else { contenedor.style.display = 'none'; }
}

function actualizarVisibilidadBotonInscripcion(idCarrera) {
    const btn = document.getElementById('btn-estado-inscripcion');
    if (btn) btn.style.display = (idCarrera === 'ciclo_inicial') ? 'inline-block' : 'none';
}

// ========================================================
// 6. MODALES: INSCRIPCIÓN Y OPTATIVAS
// ========================================================
window.abrirModalInscripcion = function() {
    const estado = estadoTrayectoria['ciclo_inicial'] || { aprobadas: [], creditos_optativos: {} };
    const plan = planesEstudio['ciclo_inicial'];
    if(!plan) return;
    
    if (!estado.aprobadas) estado.aprobadas = [];
    if (!estado.creditos_optativos) estado.creditos_optativos = {};
    
    let credIntro = 0; let credMet = 0; let credTotales = 0;

    plan.modulos.forEach(mod => {
        const nombreMod = mod.nombre.toLowerCase();
        const esIntro = nombreMod.includes('introducción') || nombreMod.includes('introduccion');
        const esMet = nombreMod.includes('métodos') || nombreMod.includes('metodos') || nombreMod.includes('metodológico');

        mod.materias.forEach(mat => {
            let sum = 0;
            if (mat.es_bolsa_creditos) {
                sum = parseInt(estado.creditos_optativos[mat.id] || 0);
            } else if (estado.aprobadas.includes(mat.id)) {
                sum = mat.creditos;
            }
            
            credTotales += sum;
            if (esIntro) credIntro += sum;
            else if (esMet) credMet += sum;
        });
    });

    const provIntro = Math.min(credIntro, 24);
    const provMet = Math.min(credMet, 16);
    const excedente = credTotales - provIntro - provMet;
    const provOpc = Math.min(excedente, 8);
    
    const cumpleIngreso = (provIntro >= 24 && provMet >= 16 && provOpc >= 8);
    const cumpleDefinitiva = credTotales >= 120;

    let html = `
        <p style="font-size: 0.95rem;">Para avanzar en tu carrera existen diferentes etapas:</p>
        <div class="caja-estado" style="background: ${cumpleIngreso ? '#d4edda' : '#fff3cd'};">
            <h4 style="margin:0 0 10px 0; font-family:'Archivo Black';">1. Ingreso al Ciclo Avanzado</h4>
            <p style="margin:0 0 10px 0; font-size:0.85rem;">Para empezar a cursar tu Licenciatura necesitás 48 créditos distribuidos así:</p>
            <ul style="margin:0; padding-left: 20px; font-size:0.9rem;">
                <li>${provIntro >= 24 ? '✅' : '❌'} <strong>Intro. a las CCSS:</strong> ${provIntro} / 24 cr.</li>
                <li>${provMet >= 16 ? '✅' : '❌'} <strong>Métodos aplicados:</strong> ${provMet} / 16 cr.</li>
                <li>${provOpc >= 8 ? '✅' : '❌'} <strong>Otros módulos:</strong> ${provOpc} / 8 cr.</li>
            </ul>
        </div>
        <div class="caja-estado" style="background: ${cumpleDefinitiva ? '#d4edda' : '#f8d7da'};">
            <h4 style="margin:0 0 10px 0; font-family:'Archivo Black';">2. Egreso del Ciclo Inicial</h4>
            <p style="margin:0 0 10px 0; font-size:0.85rem;">Para obtener el certificado final de este ciclo necesitás completarlo en su totalidad.</p>
            <ul style="margin:0; padding-left: 20px; font-size:0.9rem;">
                <li>${cumpleDefinitiva ? '✅' : '❌'} <strong>Créditos Totales CI:</strong> ${credTotales} / 120 cr.</li>
            </ul>
        </div>
    `;
    document.getElementById('modal-inscripcion-body').innerHTML = html;
    document.getElementById('modal-inscripcion').style.display = 'flex';
};

window.cerrarModalInscripcion = function() { document.getElementById('modal-inscripcion').style.display = 'none'; };

window.abrirModalOptativas = function(idBolsa, nombreBolsa) {
    document.getElementById('modal-optativas').style.display = 'flex';
    document.getElementById('buscador-optativas').value = '';
    document.getElementById('titulo-modal-optativas').innerText = nombreBolsa;
    const contenedor = document.getElementById('lista-optativas-modal');

    if (cacheCatalogo[idBolsa]) { optativasActuales = cacheCatalogo[idBolsa]; renderListaOptativas(optativasActuales); return; }

    contenedor.innerHTML = '<p style="text-align:center; font-weight:900; color:var(--petroleo); margin: 40px 0;">Cargando programas de Drive... ⏳</p>';
    fetch(`${API_URL}?action=obtenerOptativas&bolsa=${encodeURIComponent(idBolsa)}`)
        .then(res => res.json())
        .then(data => { optativasActuales = data; cacheCatalogo[idBolsa] = data; renderListaOptativas(optativasActuales); })
        .catch(err => { contenedor.innerHTML = `<p style='color:red; text-align:center; font-weight:700;'>⚠️ Ups! No encontramos el listado de esta materia en la base de datos.</p>`; });
};

window.cerrarModalOptativas = function() { document.getElementById('modal-optativas').style.display = 'none'; };

window.filtrarOptativas = function() {
    const query = normalizar(document.getElementById('buscador-optativas').value);
    const filtradas = optativasActuales.filter(opt => normalizar(opt.nombre).includes(query));
    renderListaOptativas(filtradas);
};

function renderListaOptativas(lista) {
    const contenedor = document.getElementById('lista-optativas-modal');
    contenedor.innerHTML = '';
    if (lista.length === 0) { contenedor.innerHTML = '<p style="font-weight:700; color:var(--terracota); text-align:center;">No encontramos ninguna materia con ese nombre.</p>'; return; }
    lista.forEach(opt => {
        contenedor.innerHTML += `
            <div class="optativa-card">
                <div style="flex: 1;">
                    <h4 style="margin: 0; font-size: 1rem; color: var(--petroleo);">${opt.nombre}</h4>
                    <span style="font-weight: 900; color: var(--terracota); font-size: 0.85rem;">${opt.creditos} créditos</span>
                </div>
                <a href="${opt.link}" target="_blank" class="btn-programa">Ver Programa</a>
            </div>
        `;
    });
}

// ========================================================
// 7. MODAL: LIBRILOS PARA CURSAR (CARRITO AISLADO)
// ========================================================
window.abrirModalLibrillosCursar = function() {
    carritoCursar = [];
    conEnvioCursar = false;
    librillosCursarEncontrados = [];

    const contenedor = document.getElementById('contenido-librillos-cursar');
    const displayTotal = document.getElementById('display-total-cursar');
    const checkEnvio = document.getElementById('check-envio-cursar');

    if (contenedor) contenedor.innerHTML = '<p style="text-align:center; font-weight:900; color:var(--petroleo); margin: 40px 0;">Buscando tus materiales en fotocopiadora... 🏃💨</p>';
    if (displayTotal) displayTotal.innerText = "$0";
    if (checkEnvio) checkEnvio.checked = false;

    let idsCursar = [];
    Object.keys(planesEstudio).forEach(carrera => {
        if(estadoTrayectoria[carrera] && estadoTrayectoria[carrera].cursar) {
            idsCursar = idsCursar.concat(estadoTrayectoria[carrera].cursar);
        }
    });

    if(idsCursar.length === 0) { 
        alert("No marcaste ninguna materia obligatoria en tu plan de semestre."); 
        return; 
    }

    document.getElementById('modal-cursar-librillos').style.display = 'flex';

    fetch(`${API_URL}?action=librillosPorIds&ids=${idsCursar.join(',')}`)
        .then(res => res.json())
        .then(data => { librillosCursarEncontrados = data; renderLibrillosCursar(); })
        .catch(err => { contenedor.innerHTML = `<p style='color:red; text-align:center; font-weight:700;'>⚠️ Ups! Hubo un error de conexión.</p>`; });
};

window.cerrarModalLibrillosCursar = function() { document.getElementById('modal-cursar-librillos').style.display = 'none'; };

window.toggleCartCursar = function(id, titulo, precio) {
    const idx = carritoCursar.findIndex(c => c.id === id);
    if(idx === -1) {
        carritoCursar.push({ id, titulo, precio: parseInt(precio) });
    } else {
        carritoCursar.splice(idx, 1);
    }
    renderLibrillosCursar();
};

function renderLibrillosCursar() {
    const contenedor = document.getElementById('contenido-librillos-cursar');
    if (!contenedor) return;
    contenedor.innerHTML = '';
    
    if (librillosCursarEncontrados.length === 0) {
        contenedor.innerHTML = '<p style="font-weight:700; color:var(--terracota); text-align:center;">Todavía no subimos a la web los librillos de las materias que tenés en tu plan de semestre. ¡Pegate una vuelta por fotocopiadora!</p>';
    } else {
        librillosCursarEncontrados.forEach(item => {
            const isAdded = carritoCursar.some(c => c.id === item.id);
            contenedor.innerHTML += `
                <div style="border-bottom: 1px dashed #ccc; padding: 15px 0; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0; font-size: 0.95rem; color: var(--petroleo);">${sanearTexto(item.titulo)}</h4>
                        <span style="font-weight: 900; color: var(--terracota); font-size: 1.1rem;">$${item.precio}</span>
                    </div>
                    <button class="btn-add ${isAdded ? 'active' : ''}" onclick="toggleCartCursar('${item.id}', '${sanearTexto(item.titulo).replace(/'/g,"")}', ${item.precio})">
                        ${isAdded ? 'AÑADIDO ✓' : 'SUMAR +'}
                    </button>
                </div>
            `;
        });
    }

    let subtotal = 0;
    carritoCursar.forEach(c => subtotal += c.precio);
    if(conEnvioCursar) subtotal += COSTO_ENVIO;
    
    const displayTotal = document.getElementById('display-total-cursar');
    if (displayTotal) displayTotal.innerText = `$${subtotal}`;
}

window.toggleEnvioCursar = function() {
    const check = document.getElementById('check-envio-cursar');
    if(event && event.target.tagName !== 'INPUT') check.checked = !check.checked;
    conEnvioCursar = check.checked;
    renderLibrillosCursar();
};

window.finalizarCompraCursar = function() {
    if(carritoCursar.length === 0) return alert("No elegiste ningún librillo.");
    const titulos = carritoCursar.map(c => c.titulo).join(", ");
    const total = document.getElementById('display-total-cursar').innerText.replace("$","");
    const envio = conEnvioCursar ? "Sí" : "No";
    const url = "https://docs.google.com/forms/d/e/1FAIpQLSfdrntWehRkIJFXNd4SYQ7dczmur09LZ9ApGFjl5GA0J7wFTQ/viewform?usp=pp_url"
        + "&entry.539670442=" + encodeURIComponent(titulos) + "&entry.482914514=" + encodeURIComponent(total) + "&entry.1104329366=" + encodeURIComponent(envio);
    window.open(url, "_blank");
};

// ========================================================
// 8. ASESORAMIENTO Y LIMPIEZA
// ========================================================
window.enviarAsesoramiento = function() {
    const email = document.getElementById('asesor_email').value;
    const consulta = document.getElementById('asesor_consulta').value;
    if (!email || !consulta) return alert("Por favor completá tu email y la consulta.");
    alert("¡Consulta guardada! (Acá conectaremos con tu Apps Script).");
};

window.limpiarTodo = function() {
    if(confirm("¿Querés borrar todo tu progreso guardado? Esto soluciona errores de sincronización con la nube.")) {
        localStorage.removeItem("cecso_trayectoria");
        location.reload();
    }
};
