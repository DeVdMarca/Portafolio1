// Variables globales del motor 3D y control de mouse
let scene, camara, renderer, particleSystem;
let mouseX = 0, mouseY = 0; // Guardarán la posición del cursor del usuario

// Variables para suavizar el movimiento del mouse (Efecto inercia)
let targetX = 0, targetY = 0;

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

// NUEVA FUNCIÓN: Registra las coordenadas del cursor y las normaliza
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) / 100;
    mouseY = (event.clientY - windowHalfY) / 100;
}

function onWindowResize() {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// MODIFICACIÓN EN EL BUCLE DE ANIMACIÓN:
// Variable global nueva para saber en qué espacio estamos parados (core, sobre-mi, proyectos, stack)
let espacioActual = 'core'; 

function animate() {
    requestAnimationFrame(animate);

    targetX += (mouseX - targetX) * 0.05;
    targetY += (mouseY - targetY) * 0.05;

    if (particleSystem) {
        // Detectamos si el sistema está en cortocircuito (Rojo) por la transición
        const esFallo = particleSystem.material.color.getHex() === 0xff3333;
        const multiplicadorVelocidad = esFallo ? 6 : 1;

        // --- COMPORTAMIENTO SEGÚN EL ESPACIO INTERACTIVO ---
        if (espacioActual === 'core') {
            // El estado inicial que ya tienes: rotación suave y calma
            particleSystem.rotation.y += 0.0008 * multiplicadorVelocidad;
            particleSystem.rotation.x += 0.0003 * multiplicadorVelocidad;
            
            // Reacción sutil al mouse
            particleSystem.rotation.y += targetX * 0.02;
            particleSystem.rotation.x += targetY * 0.02;

        } else if (espacioActual === 'sobre-mi') {
            // DISEÑO 1: Órbita Elíptica Neutra (Se mueven como un péndulo de energía)
            particleSystem.rotation.y += 0.002;
            // Hacemos que las partículas respiren (vayan de atrás hacia adelante en el eje Z)
            particleSystem.position.z = Math.sin(Date.now() * 0.001) * 0.5;

        } else if (espacioActual === 'proyectos') {
            // DISEÑO 2: Vórtice / Agujero de gusano acelerado
            // Forzamos una rotación veloz sobre un solo eje para simular un túnel de datos
            particleSystem.rotation.z += 0.005;
            particleSystem.rotation.y += 0.001;
            
            // El mouse altera el centro del túnel bruscamente
            particleSystem.position.x = targetX * 0.5;
            particleSystem.position.y = -targetY * 0.5;

        } else if (espacioActual === 'stack') {
            // DISEÑO 3: Matriz digital / Caída libre
            // Inclinamos el sistema de partículas y lo hacemos descender en el eje Y
            particleSystem.rotation.x = 1.5; // Lo acostamos horizontalmente
            particleSystem.position.y -= 0.01; // Las partículas "caen"
            
            // Si caen demasiado abajo, las reiniciamos arriba para crear un bucle infinito
            if (particleSystem.position.y < -2) {
                particleSystem.position.y = 2;
            }
        }
    }

    renderer.render(scene, camara || camara); // Compatible con tu variable de cámara
}
// --- LÓGICA DE NAVEGACIÓN CON EFECTO FALLO DEL SISTEMA ---
function activarNodo(nombreNodo) {
    console.log("CRITICAL ALERT: Alterando secuencia de núcleo para: " + nombreNodo.toUpperCase());

    const bodyElement = document.body;
    const coreMenu = document.querySelector('.hud-container');

    bodyElement.classList.add('sistema-fallo');

    // Sobrecarga destructiva momentánea (Rojo y gigante)
    if (particleSystem) {
        particleSystem.material.color.setHex(0xff3333); 
        particleSystem.material.size = 0.08;           
    }

    if (coreMenu) {
        coreMenu.style.transform = 'translateZ(150px) rotateX(10deg)'; 
        coreMenu.style.opacity = '0';
        coreMenu.style.pointerEvents = 'none';
    }

    // Actualizamos el estado del espacio antes de entrar
    espacioActual = nombreNodo;

    const panelObjetivo = document.getElementById(
        nombreNodo === 'sobre-mi' ? 'nodo-sobre-mi' : 
        nombreNodo === 'proyectos' ? 'nodo-proyectos' : 'nodo-stack'
    );
    
    setTimeout(() => {
        bodyElement.classList.remove('sistema-fallo');
        
        // --- AQUÍ RECONFIGURAMOS EL DISEÑO PROPIO DE CADA CARPETA ---
        if (particleSystem) {
            if (espacioActual === 'sobre-mi') {
                particleSystem.material.color.setHex(0x00ff99); // Verde Neón Orgánico (Red Neuronal)
                particleSystem.material.size = 0.05;
            } else if (espacioActual === 'proyectos') {
                particleSystem.material.color.setHex(0xff00ff); // Magenta/Púrpura Eléctrico (Vórtice)
                particleSystem.material.size = 0.06;
            } else if (espacioActual === 'stack') {
                particleSystem.material.color.setHex(0x33ff33); // Verde Hacker Clásico de Matriz
                particleSystem.material.size = 0.03;
            }
        }

        // Reseteamos posiciones físicas para que la animación empiece limpia
        particleSystem.position.set(0, 0, 0);
        if(espacioActual !== 'stack') particleSystem.rotation.set(0,0,0);

        if (panelObjetivo) {
            panelObjetivo.classList.add('active');
            iniciarEfectoEscritura(panelObjetivo);
        }
    }, 400); 
}

function regresarAlCore() {
    console.log("Restaurando estabilidad del núcleo central...");
    
    const bodyElement = document.body;
    bodyElement.classList.add('sistema-fallo');

    const paneles = document.querySelectorAll('.sub-space-panel');
    paneles.forEach(panel => {
        panel.classList.remove('active');
    });

    const coreMenu = document.querySelector('.hud-container');
    
    // Devolvemos el estado al menú principal
    espacioActual = 'core';

    setTimeout(() => {
        bodyElement.classList.remove('sistema-fallo');

        // Restauramos el universo base (Azul cian original)
        if (particleSystem) {
            particleSystem.material.color.setHex(0x00f3ff); 
            particleSystem.material.size = 0.04;           
            particleSystem.position.set(0, 0, 0); // Regresa al centro
            particleSystem.rotation.set(0, 0, 0);
        }

        if (coreMenu) {
            coreMenu.style.transform = 'scale(1) translateZ(0)';
            coreMenu.style.opacity = '1';
            coreMenu.style.pointerEvents = 'auto';
        }
    }, 300);
}


window.onload = () => {
    init();
};

function iniciarEfectoEscritura(panel) {
    // Buscamos todos los elementos con la clase .typing-text DENTRO del panel que se acaba de abrir
    const elementosTexto = panel.querySelectorAll('.typing-text');
    
    elementosTexto.forEach(elemento => {
        // Recuperamos el texto original guardado en el atributo data-text
        const textoCompleto = elemento.getAttribute('data-text');
        
        // Vaciamos el contenedor para empezar la simulación desde cero
        elemento.textContent = '';
        
        let indiceLetra = 0;
        elemento.style.borderRight = '2px solid #00f3ff'; // Agrega un cursor parpadeante de terminal
        
        // Creamos un bucle de tiempo (Intervalo) para escribir letra por letra
        const intervaloEscritura = setInterval(() => {
            if (indiceLetra < textoCompleto.length) {
                // Añadimos el siguiente carácter al texto visible
                elemento.textContent += textoCompleto.charAt(indiceLetra);
                indiceLetra++;
            } else {
                // Cuando termina de escribir todo el texto, limpia el bucle y remueve el cursor
                clearInterval(intervaloEscritura);
                elemento.style.borderRight = 'none';
            }
        }, 25); // Velocidad: Escribe una letra cada 25 milisegundos (ultra rápido y futurista)
    });
}