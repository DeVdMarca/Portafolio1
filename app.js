let scene, camara, renderer, particleSystem;
// Variables de interacción del cursor 
let mouseX = 0, mouseY = 0; 
let targetX = 0, targetY = 0;
// Variable global para conectar el volumen simulado de la voz con Three.js
let volumenActual = 0;
// Configuración central de buffers
const maxLineas = 1000; 
let nodosSatelite = [];
let anillosOrbitales;

// Dimensiones de pantalla dividida para centrar coordenadas
const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

function init() {
    scene = new THREE.Scene();

    camara = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camara.position.z = 5; 

    const canvas = document.getElementById('ia-brain-canvas');
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); 

    createBrainParticles();
    crearAnillosOrbitales();
    crearMicroNodosSatelite()

    // ESCUCHADORES DE EVENTOS DE INTERACTIVIDAD TOTAL
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Inicializar el sistema de síntesis de voz
    initVoiceSynthesis();

    // Restauración de memoria y efectos de texto
    comprobarYRestaurarSesion();
    inicializarEfectosTexto();

    animate();
}



function createBrainParticles() {
    const particlesCount = 4000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3); // Nuevo arreglo para colores RGB individuales

    const colorCentro = new THREE.Color(0x00f3ff); // Cian eléctrico en el núcleo
    const colorBorde = new THREE.Color(0xff00ff);  // Magenta neón hacia el exterior

    for (let i = 0; i < particlesCount; i++) {
        const i3 = i * 3;
        const x = (Math.random() - 0.5) * 12;
        const y = (Math.random() - 0.5) * 12;
        const z = (Math.random() - 0.5) * 12;

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        // Calculamos qué tan lejos está la partícula del centro (0,0,0) para mezclar los colores
        const distancia = Math.sqrt(x * x + y * y + z * z);
        const factorMezcla = Math.min(distancia / 7.5, 1); // Valor entre 0 (centro) y 1 (borde)

        const colorFinal = colorCentro.clone().lerp(colorBorde, factorMezcla);

        colors[i3] = colorFinal.r;
        colors[i3 + 1] = colorFinal.g;
        colors[i3 + 2] = colorFinal.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true, // ¡CLAVE! Le dice a Three.js que use el degradado individual
        transparent: true,
        opacity: 0.75,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    // Mantenemos tu recorte matemático para conservar los puntos circulares limpios
    material.onBeforeCompile = function (shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            float r = dot(cxy, cxy);
            if (r > 1.0) discard;
            #include <output_fragment>
            `
        );
    };

    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

// REGISTRA LAS COORDENADAS DEL CURSOR Y LAS NORMALIZA
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 100;
    mouseY = (event.clientY - windowHalfY) / 100;
}

function onWindowResize() {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// BUCLE DE ANIMACIÓN
let espacioActual = 'core'; 

// Función para crear o actualizar un salto aleatorio en la red
function actualizarCadenasAleatorias(totalParticulas) {
    
    while (cadenasDeImpulsos.length < maxCadenasSimultaneas) {
        let origenAleatorio = Math.floor(Math.random() * totalParticulas);
        cadenasDeImpulsos.push([origenAleatorio]);
    }

    // Cada cierto intervalo orgánico (por ejemplo, usando frames), hacemos que avancen y suelten
    cadenasDeImpulsos.forEach((cadena) => {
        // Añadir nuevo nodo aleatorio al frente de la cadena
        let nodoUltimo = cadena[cadena.length - 1];
        let siguienteNodo = Math.floor(Math.random() * totalParticulas);
        
        // Evitamos que se conecte consigo misma
        while (siguienteNodo === nodoUltimo) {
            siguienteNodo = Math.floor(Math.random() * totalParticulas);
        }

        cadena.push(siguienteNodo);

        // EFECTO SOLTAR: Si la cadena supera el largo estipulado, eliminamos el eslabón más viejo
        if (cadena.length > nodosPorCadena) {
            cadena.shift(); 
        }
    });
}

function renderizarRedViva() {
    const particulas = particleSystem.geometry.attributes.position.array;
    const totalParticulas = particulas.length / 3;

    // Ejecuta el salto aleatorio continuamente
    if (Math.random() < 0.15) { // Controla la velocidad del pulso eléctrico
        actualizarCadenasAleatorias(totalParticulas);
    }

    const posLineasArr = redLineas.geometry.attributes.position.array;
    const posDestellosArr = redDestellos.geometry.attributes.position.array;
    
    let indexLinea = 0;
    let indexDestello = 0;

    // Recorremos las cadenas para mapear sus coordenadas 3D exactas en pantalla
    cadenasDeImpulsos.forEach((cadena) => {
        for (let i = 0; i < cadena.length - 1; i++) {
            let nodoA = cadena[i];
            let nodoB = cadena[i + 1];

            // Coordenadas Nodo A
            let ax = particulas[nodoA * 3];
            let ay = particulas[nodoA * 3 + 1];
            let az = particulas[nodoA * 3 + 2];

            // Coordenadas Nodo B
            let bx = particulas[nodoB * 3];
            let by = particulas[nodoB * 3 + 1];
            let bz = particulas[nodoB * 3 + 2];

            // Dibujar la línea de conexión
            posLineasArr[indexLinea * 6] = ax;
            posLineasArr[indexLinea * 6 + 1] = ay;
            posLineasArr[indexLinea * 6 + 2] = az;
            posLineasArr[indexLinea * 6 + 3] = bx;
            posLineasArr[indexLinea * 6 + 4] = by;
            posLineasArr[indexLinea * 6 + 5] = bz;

            // Colocar un destello luminoso exactamente en la unión/nodo de activación
            posDestellosArr[indexDestello * 3] = bx;
            posDestellosArr[indexDestello * 3 + 1] = by;
            posDestellosArr[indexDestello * 3 + 2] = bz;

            indexLinea++;
            indexDestello++;
        }
    });

    // Limpiar el resto de buffers para que las líneas viejas de frames anteriores desaparezcan de golpe al soltarse
    for (let i = indexLinea; i < maxLineas; i++) {
        posLineasArr[i * 6] = posLineasArr[i * 6 + 1] = posLineasArr[i * 6 + 2] = 0;
        posLineasArr[i * 6 + 3] = posLineasArr[i * 6 + 4] = posLineasArr[i * 6 + 5] = 0;
        posDestellosArr[i * 3] = posDestellosArr[i * 3 + 1] = posDestellosArr[i * 3 + 2] = 0;
    }

    // Indicar a Three.js que renderice los nuevos datos dinámicos actualizados
    redLineas.geometry.attributes.position.needsUpdate = true;
    redDestellos.geometry.attributes.position.needsUpdate = true;

    // Vincular colores de las líneas a la transición de la sección actual
    lineaMaterial.color.copy(particleSystem.material.color);
    
      
    // Parpadeo sutil orgánico en los destellos para simular pulsos de luz de vida
    destelloMaterial.opacity = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
}

function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.01;
    targetY += (mouseY - targetY) * 0.01;

    if (particleSystem) {
        const esFallo = particleSystem.material.color.getHex() === 0xff3333;
        const multiplicadorVelocidad = esFallo ? 2.5 : 1; // Cortocircuito más controlado y menos brusco

        // --- 1. FLOTACIÓN ORGÁNICA LENTA Y CONTEMPLATIVA ---
        const posiciones = particleSystem.geometry.attributes.position.array;
        const tiempo = Date.now() * 0.00012;

        for (let i = 0; i < posiciones.length; i += 3) {
            posiciones[i]     += Math.sin(tiempo + i) * 0.00012 * multiplicadorVelocidad;
            posiciones[i + 1] += Math.cos(tiempo + i) * 0.00012 * multiplicadorVelocidad;
        }
        particleSystem.geometry.attributes.position.needsUpdate = true;

        // --- 2. TAMAÑO BASE ULTRA-FINO ---
        if (!esFallo && espacioActual !== 'analizar-operador') {
            particleSystem.material.size = 0.02;
        }

        // --- 3. COMPORTAMIENTO PAUSADO SEGÚN EL ESPACIO INTERACTIVO ---
        if (espacioActual === 'core') {
            particleSystem.rotation.y += 0.00003 * multiplicadorVelocidad;
            particleSystem.rotation.x += 0.00005 * multiplicadorVelocidad;
            
            // Seguimiento muy sutil al cursor
            particleSystem.rotation.y += targetX * 0.0012;
            particleSystem.rotation.x += targetY * 0.0012;

            if (esFallo) {
                particleSystem.position.x = (Math.random() - 0.5) * 0.003;
                particleSystem.position.y = (Math.random() - 0.5) * 0.003;
            } else {
                particleSystem.position.set(0, 0, 0);
            }

        } else if (espacioActual === 'sobre-mi') {
            particleSystem.rotation.y += 0.0006;
            particleSystem.position.z = Math.sin(Date.now() * 0.0004) * 0.35;

        } else if (espacioActual === 'proyectos') {
            particleSystem.rotation.z += 0.0005;
            particleSystem.rotation.y += 0.0004;
            
            particleSystem.position.x = targetX * 0.3;
            particleSystem.position.y = -targetY * 0.3;

        } else if (espacioActual === 'stack') {
            // Flujo vertical continuo sin saltos bruscos de reinicio
            particleSystem.rotation.x = 1.5;
            particleSystem.rotation.y += 0.0005;
            particleSystem.position.y = Math.sin(Date.now() * 0.0005) * 0.4;

        } else if (espacioActual === 'analizar-operador') {
            // Reacción suave al volumen de la síntesis de voz
            particleSystem.rotation.y += (0.0012 + volumenActual * 0.025) * multiplicadorVelocidad;
            particleSystem.rotation.z += 0.0004 * multiplicadorVelocidad;
            
            particleSystem.position.x = (Math.cos(Date.now() * 0.001) * 0.1) + (Math.random() - 0.5) * volumenActual * 0.04;
            particleSystem.position.y = (Math.sin(Date.now() * 0.001) * 0.1) + (Math.random() - 0.5) * volumenActual * 0.04;
            
            particleSystem.material.size = 0.025 + (volumenActual * 0.04);
        }
    }

    // --- ROTACIÓN LENTA DE ANILLOS ORBITALES ---
    if (anillosOrbitales) {
        anillosOrbitales.children[0].rotation.z += 0.0009;
        anillosOrbitales.children[1].rotation.z -= 0.0007;
        anillosOrbitales.children[2].rotation.z += 0.0005;
    }

    const contenedorHUD = document.getElementById('satelites-hud');
if (contenedorHUD) {
    // Ocultamos suavemente las etiquetas si el usuario entra a una sub-sección
    contenedorHUD.style.opacity = (espacioActual === 'core') ? '1' : '0';
}

if (nodosSatelite.length > 0 && espacioActual === 'core') {
    nodosSatelite.forEach(nodo => {
        // Avanzamos su órbita circular lenta
        nodo.angulo += nodo.velocidad;
        nodo.mesh.position.x = Math.cos(nodo.angulo) * nodo.radio;
        nodo.mesh.position.z = Math.sin(nodo.angulo) * nodo.radio;
        nodo.mesh.position.y = nodo.yBase + Math.sin(nodo.angulo * 2) * 0.25;

        // Proyectamos su posición 3D a coordenadas 2D de la pantalla
        const vectorProyectado = nodo.mesh.position.clone().project(camara);
        const x2D = (vectorProyectado.x * 0.5 + 0.5) * window.innerWidth;
        const y2D = (-(vectorProyectado.y * 0.5) + 0.5) * window.innerHeight;

        nodo.elemento.style.left = `${x2D}px`;
        nodo.elemento.style.top = `${y2D}px`;

        // Si el nodo pasa por detrás del núcleo (Z < 0), bajamos su opacidad para dar profundidad real
        const estaAlFrente = nodo.mesh.position.z > 0;
        nodo.elemento.style.opacity = estaAlFrente ? '0.9' : '0.25';
    });
}

    renderer.render(scene, camara);
}


// --- LÓGICA DE NAVEGACIÓN CON EFECTO FALLO DEL SISTEMA ---
function activarNodo(nombreNodo) {
    console.log("CRITICAL ALERT: Alterando secuencia de núcleo para: " + nombreNodo.toUpperCase());

    const bodyElement = document.body;
    const coreMenu = document.querySelector('.hud-container');

    bodyElement.classList.add('sistema-fallo');

    if (particleSystem) {
        particleSystem.material.color.setHex(0xff3333); 
        particleSystem.material.size = 0.08;           
    }

    if (coreMenu) {
        coreMenu.style.transform = 'translateZ(150px) rotateX(10deg)'; 
        coreMenu.style.opacity = '0';
        coreMenu.style.pointerEvents = 'none';
    }

    espacioActual = nombreNodo;

   const panelObjetivo = document.getElementById(
    nombreNodo === 'sobre-mi' ? 'nodo-sobre-mi' : 
    nombreNodo === 'proyectos' ? 'nodo-proyectos' : 
    nombreNodo === 'analizar-operador' ? 'nodo-analizar-operador' : 'nodo-stack'
);

    
    setTimeout(() => {
        bodyElement.classList.remove('sistema-fallo');
        
        if (particleSystem) {
            if (espacioActual === 'sobre-mi') {
                particleSystem.material.color.setHex(0x00ff99); 
                particleSystem.material.size = 0.05;
            } else if (espacioActual === 'proyectos') {
                particleSystem.material.color.setHex(0xff00ff); 
                particleSystem.material.size = 0.06;
            } else if (espacioActual === 'stack') {
                particleSystem.material.color.setHex(0x33ff33); 
                particleSystem.material.size = 0.03;
            } else if (espacioActual === 'analizar-operador') {
                particleSystem.material.color.setHex(0x00f3ff); 
                particleSystem.material.size = 0.04;
            }
        }

        particleSystem.position.set(0, 0, 0);
        if(espacioActual !== 'stack' && espacioActual !== 'analizar-operador') particleSystem.rotation.set(0,0,0);

        if (panelObjetivo) {        
        panelObjetivo.classList.add('active');
        const tituloNodo = panelObjetivo.querySelector('h2');
        if (tituloNodo) activarDesencriptado(tituloNodo);
        iniciarEfectoEscritura(panelObjetivo);
        }
    }, 400); 
     guardarEstadoSistema(nombreNodo);
}

function regresarAlCore() {
    console.log("Restaurando estabilidad del núcleo central...");
    
    // Detener de inmediato la síntesis de audio si el usuario sale del panel analítico
    window.speechSynthesis.cancel();
    resetEstilosVoz();

    const bodyElement = document.body;
    bodyElement.classList.add('sistema-fallo');

    const paneles = document.querySelectorAll('.sub-space-panel');
    paneles.forEach(panel => {
        panel.classList.remove('active');
    });

    const coreMenu = document.querySelector('.hud-container');
    espacioActual = 'core';

    setTimeout(() => {
        bodyElement.classList.remove('sistema-fallo');

        if (particleSystem) {
            particleSystem.material.color.setHex(0xffffff); 
            particleSystem.material.size = 0.03;           
            particleSystem.position.set(0, 0, 0); 
            particleSystem.rotation.set(0, 0, 0);
        }

        if (coreMenu) {
            coreMenu.style.transform = 'scale(1) translateZ(0)';
            coreMenu.style.opacity = '1';
            coreMenu.style.pointerEvents = 'auto';
        }
    }, 300);
    guardarEstadoSistema('core');
}

function iniciarEfectoEscritura(panel) {
    const elementosTexto = panel.querySelectorAll('.typing-text');
    
    elementosTexto.forEach(elemento => {
        const textoCompleto = elemento.getAttribute('data-text');
        elemento.textContent = '';
        let indiceLetra = 0;
        elemento.style.borderRight = '2px solid #00f3ff'; 
        
        const intervaloEscritura = setInterval(() => {
            if (indiceLetra < textoCompleto.length) {
                elemento.textContent += textoCompleto.charAt(indiceLetra);
                indiceLetra++;
            } else {
                clearInterval(intervaloEscritura);
                elemento.style.borderRight = 'none';
            }
        }, 25); 
    });
}

// --- SUB-SISTEMA INTEGRADO: SÍNTESIS DE VOZ DE IA CON ANALIZADOR DE FRECUENCIAS REACTIVO ---
let renderLoopVoz = null;

function initVoiceSynthesis() {
    const btnHablar = document.getElementById('btn-hablar-ia');
    const textoElemento = document.getElementById('texto-lectura-ia');
    const contenedorReactivo = document.getElementById('scanner-box-reactive');

    if (!btnHablar || !textoElemento) return;

    btnHablar.addEventListener('click', () => {
        const mensajeTexto = textoElemento.getAttribute('data-text');
        
        // Limpieza absoluta de instancias y animaciones activas previas
        window.speechSynthesis.cancel();
        if (renderLoopVoz) cancelAnimationFrame(renderLoopVoz);
        resetEstilosVoz();

        const lectura = new SpeechSynthesisUtterance(mensajeTexto);
        const voces = window.speechSynthesis.getVoices();
        const vozEspañol = voces.find(voz => voz.lang.startsWith('es'));
        if (vozEspañol) lectura.voice = vozEspañol;
lectura.rate = 1.1;
lectura.pitch = 1.2;
lectura.volume = 1.0;
lectura.onstart = () => {
btnHablar.style.borderColor = "#ff00ff";
btnHablar.querySelector('span').textContent = "IA VOCALIZANDO...";
if (contenedorReactivo) contenedorReactivo.classList.add('vibrating');
// Inicializar el analizador de frecuencias
iniciarAnalizadorFrecuencias();
};
lectura.onend = () => {
btnHablar.style.borderColor = "#00f3ff";
btnHablar.querySelector('span').textContent = "EJECUTAR INTERFAZ DE VOZ";
if (contenedorReactivo) contenedorReactivo.classList.remove('vibrating');
if (renderLoopVoz) cancelAnimationFrame(renderLoopVoz);
resetEstilosVoz();
};
window.speechSynthesis.speak(lectura);
});
}
function iniciarAnalizadorFrecuencias() {
const barras = document.querySelectorAll('.voice-wave-bar');
const contenedor = document.getElementById('scanner-box-reactive');
function procesarOnda() {
if (window.speechSynthesis.speaking) {
// Simulación algorítmica de espectro de audio de alta precisión
volumenActual = Math.abs(Math.sin(Date.now() * 0.015)) * 0.4 + Math.random() * 0.4;
// Simular pausas naturales entre fonemas
if (Math.random() > 0.88) volumenActual = 0;
} else {
volumenActual = 0;
}
// Pasar variable de volumen a la interfaz CSS
if (contenedor) contenedor.style.setProperty('--volume', volumenActual);
barras.forEach(barra => {
barra.style.setProperty('--volume', volumenActual * (0.6 + Math.random() * 0.4));
});
if (window.speechSynthesis.speaking) {
renderLoopVoz = requestAnimationFrame(procesarOnda);
} else {
resetEstilosVoz();
}
}
procesarOnda();
}
function resetEstilosVoz() {
volumenActual = 0;
const barras = document.querySelectorAll('.voice-wave-bar');
const contenedor = document.getElementById('scanner-box-reactive');
if (contenedor) contenedor.style.setProperty('--volume', '0');
barras.forEach(barra => barra.style.setProperty('--volume', '0'));
}
// Disparador asíncrono para asegurar la precarga de diccionarios fonéticos en Chromium
if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
speechSynthesis.onvoiceschanged = initVoiceSynthesis;
}
window.onload = () => {
init();
};

function guardarEstadoSistema(nodoActivo) {
   
    const sesionOperador = {
        ultimoNodo: nodoActivo,
        timestamp: Date.now()
    };

    localStorage.setItem('portafolio_session', JSON.stringify(sesionOperador));

    console.log(`[MEMORIA] Estado guardado en localStorage: ${nodoActivo}`);
}

function comprobarYRestaurarSesion() {
    // 1. Leemos el texto guardado en localStorage usando la misma clave exacta
    const sesionGuardada = localStorage.getItem('portafolio_session');

    // 2. Si no hay nada guardado aún (primera visita), salimos sin hacer nada
    if (!sesionGuardada) return;

    // 3. Usamos try/catch por seguridad: si el texto guardado está corrupto, la app no se rompe
    try {
        // Convertimos el texto plano de vuelta a un objeto de JavaScript
        const datos = JSON.parse(sesionGuardada);

        // 4. Si el último nodo guardado existe y NO es el menú central ('core'), lo abrimos
        if (datos.ultimoNodo && datos.ultimoNodo !== 'core') {
            console.log(`[MEMORIA] Restaurando última sesión en: ${datos.ultimoNodo}`);
            
            // Damos 400ms para que el motor 3D de Three.js termine de cargar antes de animar
            setTimeout(() => {
                activarNodo(datos.ultimoNodo);
            }, 400);
        }
    } catch (error) {
        console.error('[MEMORIA] Error al leer los datos guardados:', error);
    }
}


// ==========================================================================
// TAREA 1: EFECTO DE ESCANEO BIOMÉTRICO / DESENCRIPTADO EN TEXTOS
// ==========================================================================
const caracteresCyber = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>";

function activarDesencriptado(elemento) {
    if (!elemento) return;

    // Guardamos el texto original la primera vez que se ejecuta
    if (!elemento.dataset.textoOriginal) {
        elemento.dataset.textoOriginal = elemento.innerText;
    }

    const textoReal = elemento.dataset.textoOriginal;
    let iteracion = 0;

    // Evita que se encimen animaciones si el cursor entra y sale rápido
    clearInterval(elemento.intervaloTexto);

    elemento.intervaloTexto = setInterval(() => {
        elemento.innerText = textoReal
            .split("")
            .map((letra, indice) => {
                if (indice < iteracion) {
                    return textoReal[indice];
                }
                if (letra === " ") return " ";
                return caracteresCyber[Math.floor(Math.random() * caracteresCyber.length)];
            })
            .join("");

        if (iteracion >= textoReal.length) {
            clearInterval(elemento.intervaloTexto);
            elemento.innerText = textoReal; // Asegura el texto final limpio
        }

        iteracion += 1 / 2; // Velocidad fluida (~350ms)
    }, 30);
}

// Conectar automáticamente el efecto hover a todos tus botones y enlaces clave
function inicializarEfectosTexto() {
    const selectores = '.hud-container button, .btn-back, .project-link';
    document.querySelectorAll(selectores).forEach(boton => {
        boton.addEventListener('mouseenter', () => activarDesencriptado(boton));
    });
}

function crearAnillosOrbitales() {
    anillosOrbitales = new THREE.Group();

    // Función auxiliar para crear un anillo formado por una banda de partículas circulares
    function generarAnilloParticulas(radio, grosor, cantidad, colorHex, tamano, opacidad) {
        const geometria = new THREE.BufferGeometry();
        const posiciones = new Float32Array(cantidad * 3);

        for (let i = 0; i < cantidad; i++) {
            const angulo = Math.random() * Math.PI * 2;
            // Variación sutil en el radio para darle aspecto de banda de polvo/datos
            const radioVariado = radio + (Math.random() - 0.5) * grosor;

            posiciones[i * 3]     = Math.cos(angulo) * radioVariado;
            posiciones[i * 3 + 1] = Math.sin(angulo) * radioVariado;
            posiciones[i * 3 + 2] = (Math.random() - 0.5) * (grosor * 0.4); // Ligera profundidad Z
        }

        geometria.setAttribute('position', new THREE.BufferAttribute(posiciones, 3));

        const material = new THREE.PointsMaterial({
            color: colorHex,
            size: tamano,
            transparent: true,
            opacity: opacidad,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        // Recorte circular para que las partículas de los anillos sean puntos redondos limpios
        material.onBeforeCompile = function (shader) {
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <output_fragment>',
                `
                vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                float r = dot(cxy, cxy);
                if (r > 1.0) discard;
                #include <output_fragment>
                `
            );
        };

        return new THREE.Points(geometria, material);
    }

    // Anillo 1: Banda interna cian
    const anillo1 = generarAnilloParticulas(2.4, 0.14, 260, 0x00f3ff, 0.024, 0.55);
    anillo1.rotation.set(Math.PI / 3, Math.PI / 6, 0);

    // Anillo 2: Banda media magenta en ángulo opuesto
    const anillo2 = generarAnilloParticulas(3.1, 0.18, 340, 0xff00ff, 0.026, 0.45);
    anillo2.rotation.set(-Math.PI / 4, Math.PI / 3, 0);

    // Anillo 3: Banda exterior cian amplia (estilo anillo principal)
    const anillo3 = generarAnilloParticulas(3.8, 0.25, 480, 0x00f3ff, 0.028, 0.6);
    anillo3.rotation.set(Math.PI / 2.2, -Math.PI / 5, 0);

    anillosOrbitales.add(anillo1, anillo2, anillo3);
    scene.add(anillosOrbitales);
}

function crearMicroNodosSatelite() {
    const contenedorHUD = document.getElementById('satelites-hud');
    if (!contenedorHUD) return;

    // Definimos 4 nodos con radios y velocidades distintas para que no choquen
    const configuracionNodos = [
        { etiqueta: 'JAVA_CORE', radio: 3.4, velocidad: 0.0018, angulo: 0.5,  yBase: 1.1,  color: 0x00f3ff },
        { etiqueta: 'SYS_AI',    radio: 3.7, velocidad: 0.0014, angulo: 2.3,  yBase: -1.0, color: 0xff00ff },
        { etiqueta: 'SQL_DB',    radio: 3.2, velocidad: 0.0020, angulo: 4.1,  yBase: 0.8,  color: 0x00f3ff },
        { etiqueta: 'THREE_JS',  radio: 3.9, velocidad: 0.0012, angulo: 5.5,  yBase: -1.2, color: 0xff00ff }
    ];

    configuracionNodos.forEach(cfg => {
        // 1. Creamos una micro-esfera luminosa en el espacio 3D
        const geometria = new THREE.SphereGeometry(0.045, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: cfg.color,
            transparent: true,
            opacity: 0.9
        });
        const mesh = new THREE.Mesh(geometria, material);
        scene.add(mesh);

        // 2. Creamos su etiqueta HTML vinculada
        const divEtiqueta = document.createElement('div');
        divEtiqueta.className = 'satelite-label';
        divEtiqueta.innerText = cfg.etiqueta;
        contenedorHUD.appendChild(divEtiqueta);

        nodosSatelite.push({
            mesh: mesh,
            elemento: divEtiqueta,
            radio: cfg.radio,
            velocidad: cfg.velocidad,
            angulo: cfg.angulo,
            yBase: cfg.yBase
        });
    });
}