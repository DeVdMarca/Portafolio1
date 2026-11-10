// ==========================================================================
// CONFIGURACIÓN GLOBAL DEL MOTOR 3D Y VARIABLES DE CONTROL
// ==========================================================================
let scene, camara, renderer, particleSystem;

// Variables de interacción del cursor (¡Restauradas!)
let mouseX = 0, mouseY = 0; 
let targetX = 0, targetY = 0;

// Variable global para conectar el volumen simulado de la voz con Three.js
let volumenActual = 0;

// Configuración dinámica de la Red Neuronal Viva
let cadenasDeImpulsos = []; // Almacena los caminos dinámicos activos
const maxCadenasSimultaneas = 5; // Cuántas cadenas independientes viajan a la vez
const nodosPorCadena = 4; // Cuántos eslabones tiene cada cadena conectada

// Configuración central de buffers
const maxLineas = 1000; 

// Referencias globales para renderizado de la red
let redLineas, redDestellos, lineaMaterial, destelloMaterial;

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

    // ESCUCHADORES DE EVENTOS DE INTERACTIVIDAD TOTAL
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Inicializar el sistema de síntesis de voz
    initVoiceSynthesis();

    // --- CONSTRUCCIÓN GEOMÉTRICA DE LA RED NEURONAL VIVA ---
    const lineaGeometry = new THREE.BufferGeometry();
    const posicionesLineas = new Float32Array(maxLineas * 2 * 3); 
    lineaGeometry.setAttribute('position', new THREE.BufferAttribute(posicionesLineas, 3));

    lineaMaterial = new THREE.LineBasicMaterial({
        color: 0x00f3ff,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending
    });
    redLineas = new THREE.LineSegments(lineaGeometry, lineaMaterial);
    scene.add(redLineas);

    // Sistema de destellos brillantes en los puntos de anclaje
    const destelloGeometry = new THREE.BufferGeometry();
    const posicionesDestellos = new Float32Array(maxLineas * 3);
    destelloGeometry.setAttribute('position', new THREE.BufferAttribute(posicionesDestellos, 3));

    destelloMaterial = new THREE.PointsMaterial({
        color: 0xffffff, // Blanco incandescente puro
        size: 0.08,      // ¡Tamaño corregido! Escala sutil para que sea un microdestello elegante
        transparent: true,
        opacity: 0.9,    // Máxima fuerza visual
        blending: THREE.AdditiveBlending, 
        depthWrite: false
    });

    // Filtro matemático shader: Recorta las esquinas y los convierte en destellos circulares limpios
    destelloMaterial.onBeforeCompile = function (shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            float r = dot(cxy, cxy);
            if (r > 1.0) discard; // Elimina los bordes cuadrados gigantes
            #include <output_fragment>
            `
        );
    };
    redDestellos = new THREE.Points(destelloGeometry, destelloMaterial);
    scene.add(redDestellos);

    animate();
}


function createBrainParticles() {
    const particlesCount = 4000; // Alta densidad visual
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3); 
        
    for (let i = 0; i < particlesCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 12; 
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Material base con descarte de fragmentos nativo
    const material = new THREE.PointsMaterial({
        color: 0x00f3ff,
        size: 0.02, // Tamaño fino inicial
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    // Filtro matemático para convertir cuadrados en círculos perfectos
    material.onBeforeCompile = function (shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            vec2 cxy = 2.0 * gl_PointCoord - 1.0;
            float r = dot(cxy, cxy);
            if (r > 1.0) discard; // Recorta los bordes rígidos del cuadrado
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
    // Si faltan cadenas vivas en la red, inicializamos una nueva con origen aleatorio
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
    
    // FIJADO: Comentamos la línea de copia para que destelloMaterial conserve su color blanco luminoso nativo
    // destelloMaterial.color.copy(particleSystem.material.color);
    
    // Parpadeo sutil orgánico en los destellos para simular pulsos de luz de vida
    destelloMaterial.opacity = 0.7 + Math.sin(Date.now() * 0.02) * 0.3;
}

function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.01;
    targetY += (mouseY - targetY) * 0.01;

    if (particleSystem) {
        // Detectamos si el sistema está en cortocircuito (Rojo) por la transición
        const esFallo = particleSystem.material.color.getHex() === 0xff3333;
        const multiplicadorVelocidad = esFallo ? 4 : 1;

        // --- 1. MOVIMIENTO ORGÁNICO INDEPENDIENTE DE CADA PARTÍCULA ---
        const posiciones = particleSystem.geometry.attributes.position.array;
        const tiempo = Date.now() * 0.0005; // Controla la suavidad del flujo flotante

        for (let i = 0; i < posiciones.length; i += 3) {
            // Cada partícula oscila sutilmente en sus ejes X e Y de forma asíncrona
            posiciones[i]     += Math.sin(tiempo + i) * 0.001 * multiplicadorVelocidad;
            posiciones[i + 1] += Math.cos(tiempo + i) * 0.001 * multiplicadorVelocidad;
        }
        // Le indicamos a Three.js que actualice los vértices en este fotograma
        particleSystem.geometry.attributes.position.needsUpdate = true;

        // --- 2. CONTROL ESTABLE DE TAMAÑO BASE (SUTIL Y FIJO) ---
        if (!esFallo && espacioActual !== 'analizar-operador') {
            // Mantenemos un tamaño ultra-fino y constante para evitar el estiramiento cuadrado
            particleSystem.material.size = 0.02;
        }

        // --- COMPORTAMIENTO SEGÚN EL ESPACIO INTERACTIVO ---
        if (espacioActual === 'core') {
            particleSystem.rotation.y += 0.0001 * multiplicadorVelocidad;
            particleSystem.rotation.x += 0.0002 * multiplicadorVelocidad;
            
            particleSystem.rotation.y += targetX * 0.01;
            particleSystem.rotation.x += targetY * 0.01;

            // Si hay un glitch/fallo en el core, hacemos una pequeña sacudida caótica de posición
            if (esFallo) {
                particleSystem.position.x = (Math.random() - 0.5) * 0.1;
                particleSystem.position.y = (Math.random() - 0.5) * 0.1;
            } else {
                particleSystem.position.set(0, 0, 0);
            }

        } else if (espacioActual === 'sobre-mi') {
            particleSystem.rotation.y += 0.002;
            particleSystem.position.z = Math.sin(Date.now() * 0.001) * 0.5;

        } else if (espacioActual === 'proyectos') {
            particleSystem.rotation.z += 0.002;
            particleSystem.rotation.y += 0.001;
            
            particleSystem.position.x = targetX * 0.5;
            particleSystem.position.y = -targetY * 0.5;

        } else if (espacioActual === 'stack') {
            particleSystem.rotation.x = 1.5; 
            particleSystem.position.y -= 0.01; 
            
            if (particleSystem.position.y < -2) {
                particleSystem.position.y = 2;
            }
        } else if (espacioActual === 'analizar-operador') {
            // REACCIÓN 3D DE AUDIO: El motor responde al habla de la IA
            particleSystem.rotation.y += (0.004 + volumenActual * 0.05) * multiplicadorVelocidad;
            particleSystem.rotation.z += 0.001 * multiplicadorVelocidad;
            
            // Agitación caótica controlada basada en las frecuencias de audio
            particleSystem.position.x = (Math.cos(Date.now() * 0.002) * 0.2) + (Math.random() - 0.5) * volumenActual * 0.1;
            particleSystem.position.y = (Math.sin(Date.now() * 0.002) * 0.2) + (Math.random() - 0.5) * volumenActual * 0.1;
            
            // Las partículas alteran su tamaño físicamente al ritmo del volumen
            particleSystem.material.size = 0.04 + (volumenActual * 0.06);
        }
    }

    if (typeof renderizarRedViva === "function") {
        renderizarRedViva();
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
            iniciarEfectoEscritura(panelObjetivo);
        }
    }, 400); 
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
            particleSystem.material.color.setHex(0x00f3ff); 
            particleSystem.material.size = 0.04;           
            particleSystem.position.set(0, 0, 0); 
            particleSystem.rotation.set(0, 0, 0);
        }

        if (coreMenu) {
            coreMenu.style.transform = 'scale(1) translateZ(0)';
            coreMenu.style.opacity = '1';
            coreMenu.style.pointerEvents = 'auto';
        }
    }, 300);
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