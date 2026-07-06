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
world.solver.iterations = 30; // Aumenta a precisão das colisões (evita que as bolas atravessem a mesa)

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
    // Visual (Three.js)
    const geometry = new THREE.BoxGeometry(w, h, d);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    tableGroup.add(mesh);

    // Física (Cannon.js)
    const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
    const body = new CANNON.Body({ mass: 0, material: physicsMaterial }); // mass 0 = objeto estático
    body.addShape(shape);
    // Define a posição usando valores diretos para evitar erros de referência de vetor
    body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
    world.addBody(body);
}

// Chão da mesa (Feltro Verde)
createBox(0, -0.5, 0, 10, 1, 20, 0x006400); 

// Bordas da mesa (Madeira)
createBox(-5.5, 0, 0, 1, 1, 22, 0x8B4513);  // Esquerda
createBox(5.5, 0, 0, 1, 1, 22, 0x8B4513);   // Direita
createBox(0, 0, -10.5, 12, 1, 1, 0x8B4513); // Topo
createBox(0, 0, 10.5, 12, 1, 1, 0x8B4513);  // Base

// ==========================================
// Criando as Bolas
// ==========================================

const balls = [];
const ballRadius = 0.4;

function createBall(x, z, color, isWhite = false) {
    // Visual (Three.js)
    const geometry = new THREE.SphereGeometry(ballRadius, 32, 32);
    const material = new THREE.MeshPhongMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    scene.add(mesh);

    // Física (Cannon.js)
    const shape = new CANNON.Sphere(ballRadius);
    const body = new CANNON.Body({
        mass: 0.17, // Massa padrão de uma bola de sinuca
        material: physicsMaterial,
        // Nasce levemente acima do raio (+0.05) para assentar suavemente e não bugar com a mesa
        position: new CANNON.Vec3(x, ballRadius + 0.05, z),
        linearDamping: 0.3, // Simula o atrito do feltro desacelerando a bola
        angularDamping: 0.3
    });
    world.addBody(body);

    const ball = { mesh, body, isWhite };
    balls.push(ball);
    return ball;
}

// Bola Branca
const cueBall = createBall(0, 7, 0xffffff, true);

// Bolas Alvo (Formato de Triângulo Inicial)
createBall(0, -3, 0xff0000);
createBall(-0.45, -3.8, 0x0000ff);
createBall(0.45, -3.8, 0xffff00);
createBall(-0.9, -4.6, 0xff00ff);
createBall(0, -4.6, 0x000000); // Bola 8
createBall(0.9, -4.6, 0x00ffff);

// ==========================================
// Controles de Tacada (Mouse / Touch)
// ==========================================

let isDragging = false;
let startMouseX = 0;
let startMouseY = 0;
let isPlayerTurn = true;

window.addEventListener('mousedown', (e) => {
    if (!isPlayerTurn) return; // Bloqueia clique se for a vez do Bot
    isDragging = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
});

window.addEventListener('mouseup', (e) => {
    if (!isDragging || !isPlayerTurn) return;
    isDragging = false;
    
    // Calcula a força do disparo com base no arrasto do mouse
    const deltaX = (e.clientX - startMouseX) * 0.05;
    const deltaY = (e.clientY - startMouseY) * 0.05;

    // Aplica o impulso físico na bola branca
    cueBall.body.applyImpulse(
        new CANNON.Vec3(deltaX, 0, deltaY),
        cueBall.body.position
    );

    // Transfere o turno para a inteligência artificial após 5 segundos
    isPlayerTurn = false;
    document.getElementById('turn-indicator').innerText = "Turno: Bot pensando...";
    setTimeout(botTurn, 5000); 
});

// ==========================================
// Inteligência Artificial (Bot)
// ==========================================

function botTurn() {
    document.getElementById('turn-indicator').innerText = "Turno: Bot jogando";
    
    // Calcula uma direção semi-aleatória mirando para a frente (onde as outras bolas estão)
    const randomForceX = (Math.random() - 0.5) * 5;
    const randomForceZ = - (Math.random() * 5 + 2); 
    
    cueBall.body.applyImpulse(
        new CANNON.Vec3(randomForceX, 0, randomForceZ),
        cueBall.body.position
    );

    // Devolve o controle para o jogador após a jogada finalizar
    setTimeout(() => {
        isPlayerTurn = true;
        document.getElementById('turn-indicator').innerText = "Turno: Jogador";
    }, 5000);
}

// ==========================================
// Loop do Jogo (Roda a 60 frames por segundo)
// ==========================================

function animate() {
    requestAnimationFrame(animate);

    // Avança o relógio do motor físico
    world.step(1 / 60);

    // Sincroniza a posição visual (Three.js) com a posição real simulada (Cannon.js)
    balls.forEach(ball => {
        ball.mesh.position.copy(ball.body.position);
        ball.mesh.quaternion.copy(ball.body.quaternion);
        
        // Anti-deslize infinito: Se a bola estiver quase parando, força ela a parar completamente
        if (ball.body.velocity.lengthSquared() < 0.01) {
            ball.body.velocity.set(0, 0, 0);
            ball.body.angularVelocity.set(0, 0, 0);
        }
    });

    renderer.render(scene, camera);
}

// Ajuste automático caso o jogador mude o tamanho da janela do navegador
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Inicia o jogo
animate();
