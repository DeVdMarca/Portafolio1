// Variables globales del motor 3D y control de mouse
let scene, camara, renderer, particleSystem;
let mouseX = 0, mouseY = 0; // Guardarán la posición del cursor del usuario

// Variables para suavizar el movimiento del mouse (Efecto inercia)
let targetX = 0, targetY = 0;

// Variable global para conectar el volumen simulado de la voz con Three.js
let volumenActual = 0;

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
    // Captura el movimiento del mouse en toda la pantalla
    document.addEventListener('mousemove', onDocumentMouseMove);

    // Inicializar el sistema de síntesis de voz
    initVoiceSynthesis();

    animate();
}

function createBrainParticles() {
    const particlesCount = 2500; // Subimos a 2500 partículas para mayor densidad visual
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particlesCount * 3); 
        
    for (let i = 0; i < particlesCount * 3; i++) {
        positions[i] = (Math.random() - 0.5) * 12; 
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
        color: 0x00f3ff,
        size: 0.04, 
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending 
    });

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

function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    if (particleSystem) {
        // Detectamos si el sistema está en cortocircuito (Rojo) por la transición
        const esFallo = particleSystem.material.color.getHex() === 0xff3333;
        const multiplicadorVelocidad = esFallo ? 6 : 1;

        // Resetear tamaño base si no está en modo fallo
        if (!esFallo && espacioActual !== 'analizar-operador') {
            particleSystem.material.size = 0.04;
        }

        // --- COMPORTAMIENTO SEGÚN EL ESPACIO INTERACTIVO ---
        if (espacioActual === 'core') {
            particleSystem.rotation.y += 0.0008 * multiplicadorVelocidad;
            particleSystem.rotation.x += 0.0003 * multiplicadorVelocidad;
            
            particleSystem.rotation.y += targetX * 0.02;
            particleSystem.rotation.x += targetY * 0.02;

        } else if (espacioActual === 'sobre-mi') {
            particleSystem.rotation.y += 0.002;
            particleSystem.position.z = Math.sin(Date.now() * 0.001) * 0.5;

        } else if (espacioActual === 'proyectos') {
            particleSystem.rotation.z += 0.005;
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