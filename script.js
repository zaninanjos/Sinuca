// ==========================================
// Configuração do Three.js (Gráficos) e Cannon.js (Física)
// ==========================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Iluminação
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const spotLight = new THREE.SpotLight(0xffffff, 0.8);
spotLight.position.set(0, 20, 0);
spotLight.castShadow = true;
scene.add(spotLight);

// Posicionando a câmera
camera.position.set(0, 15, 20);
camera.lookAt(0, 0, 0);

// Mundo Físico (Cannon.js)
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0); // Gravidade padrão
world.broadphase = new CANNON.NaiveBroadphase();

// Materiais Físicos (como as coisas quicam e deslizam)
const physicsMaterial = new CANNON.Material();
const physicsContactMaterial = new CANNON.ContactMaterial(
    physicsMaterial, physicsMaterial, { friction: 0.1, restitution: 0.9 }
);
world.addContactMaterial(physicsContactMaterial);

// ==========================================
// Criando a Mesa e as Paredes
// ==========================================

const tableGroup = new THREE.Group();
scene.add(tableGroup);

function createBox(x, y, z, w, h, d, color) {
    // Visual
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    tableGroup.add(mesh);

    // Física
    const shape = new CANNON.Box(new CANNON.Vec3(w/2, h/2, d/2));
    const body = new CANNON.Body({ mass: 0, material: physicsMaterial }); // mass 0 = estático
    body.addShape(shape);
    body.position.copy(mesh.position);
    world.addBody(body);
}

// Chão da mesa (Feltro Verde)
createBox(0, -0.5, 0, 10, 1, 20, 0x006400); // Mesa
// Bordas da mesa (Madeira)
createBox(-5.5, 0, 0, 1, 1, 22, 0x8B4513); // Esquerda
createBox(5.5, 0, 0, 1, 1, 22, 0x8B4513);  // Direita
createBox(0, 0, -10.5, 12, 1, 1, 0x8B4513); // Topo
createBox(0, 0, 10.5, 12, 1, 1, 0x8B4513);  // Base

// ==========================================
// Criando as Bolas
// ==========================================

const balls = [];
const ballRadius = 0.4;

function createBall(x, z, color, isWhite = false) {
    // Visual
    const geometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    // Física
    const shape = new CANNON.Sphere(ballRadius);
    const body = new CANNON.Body({
        mass: 0.17, // Massa realista de uma bola
        material: physicsMaterial,
        position: new CANNON.Vec3(x, ballRadius, z),
        linearDamping: 0.3, // Atrito com a mesa
        angularDamping: 0.3
    });
    world.addBody(body);

    const ball = { mesh, body, isWhite };
    balls.push(ball);
    return ball;
}

// Bola Branca
const cueBall = createBall(0, 7, 0xffffff, true);

// Bolas Alvo (Triângulo Básico)
createBall(0, -3, 0xff0000);
createBall(-0.45, -3.8, 0x0000ff);
createBall(0.45, -3.8, 0xffff00);
createBall(-0.9, -4.6, 0xff00ff);
createBall(0, -4.6, 0x000000); // Bola 8
createBall(0.9, -4.6, 0x00ffff);

// ==========================================
// Controles de Tacada (Mouse/Toque)
// ==========================================

let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;
let isPlayerTurn = true;

window.addEventListener('mousedown', (e) => {
    if(!isPlayerTurn) return; // Se for vez do bot, não deixa clicar
    isDragging = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
    if (!isDragging || !isPlayerTurn) return;
    isDragging = false;
    
    // Calcula a força da tacada com base no quanto o mouse foi arrastado
    const deltaX = (e.clientX - startMouseX) * 0.05;
    const deltaY = (e.clientY - startMouseY) * 0.05;

    // Aplica um impulso na bola branca (Direção invertida para "empurrar")
    cueBall.body.applyImpulse(
        new CANNON.Vec3(deltaX, 0, deltaY),
        cueBall.body.position
    );

    // Passa o turno para o bot após um tempo (simulando que as bolas pararam)
    isPlayerTurn = false;
    document.getElementById('turn-indicator').innerText = "Turno: Bot pensativo...";
    setTimeout(botTurn, 5000); 
});

// ==========================================
// Inteligência Artificial (Bot)
// ==========================================

function botTurn() {
    document.getElementById('turn-indicator').innerText = "Turno: Bot executando tacada";
    
    // Bot Simples: Dá uma tacada em uma direção aleatória voltada para as bolas
    const randomForceX = (Math.random() - 0.5) * 5;
    const randomForceZ = - (Math.random() * 5 + 2); // Sempre tenta bater para frente
    
    cueBall.body.applyImpulse(
        new CANNON.Vec3(randomForceX, 0, randomForceZ),
        cueBall.body.position
    );

    // Volta o turno para o jogador
    setTimeout(() => {
        isPlayerTurn = true;
        document.getElementById('turn-indicator').innerText = "Turno: Jogador";
    }, 5000);
}

// ==========================================
// Loop do Jogo (Atualização 60fps)
// ==========================================

function animate() {
    requestAnimationFrame(animate);

    // Atualiza o motor de física
    world.step(1 / 60);

    // Sincroniza os gráficos do Three.js com as posições físicas do Cannon.js
    balls.forEach(ball => {
        ball.mesh.position.copy(ball.body.position);
        ball.mesh.quaternion.copy(ball.body.quaternion);
        
        // Simula parada (se a velocidade for muito baixa, zera para não rolar infinitamente)
        if (ball.body.velocity.lengthSquared() < 0.01) {
            ball.body.velocity.set(0, 0, 0);
            ball.body.angularVelocity.set(0, 0, 0);
        }
    });

    renderer.render(scene, camera);
}

// Redimensionar tela responsivamente
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();


// gemini n sabe codar ksksksk
