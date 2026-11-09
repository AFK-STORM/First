import * as THREE from
'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

// GAME SETUP

const container = document.getElementById("game-container");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x79d7ff);
scene.fog = new THREE.Fog(0x79d7ff, 35, 110);

const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    200
);

camera.position.set(0, 6, 11);
camera.lookAt(0, 1, -7);

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);

// LIGHTING

scene.add(new THREE.HemisphereLight(0xffffff, 0x78905a, 2));

const sun = new THREE.DirectionalLight(0xffffff, 2.5);
sun.position.set(-10, 20, 10);
sun.castShadow = true;
scene.add(sun);

// MATERIALS

const materials = {
    ground: new THREE.MeshStandardMaterial({color: 0x48a94c}),
    track: new THREE.MeshStandardMaterial({color: 0x555555}),
    rail: new THREE.MeshStandardMaterial({color: 0xbfc6cc}),
    wood: new THREE.MeshStandardMaterial({color: 0x754421}),
    red: new THREE.MeshStandardMaterial({color: 0xff3333}),
    blue: new THREE.MeshStandardMaterial({color: 0x168cff}),
    yellow: new THREE.MeshStandardMaterial({color: 0xffd600}),
    white: new THREE.MeshStandardMaterial({color: 0xffffff}),
    black: new THREE.MeshStandardMaterial({color: 0x222222}),
    skin: new THREE.MeshStandardMaterial({color: 0xffc28b}),
    green: new THREE.MeshStandardMaterial({color: 0x19b95a})
};

// OBJECT CREATION

function box(w, h, d, material, x, y, z) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        material
    );

    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
}

// GROUND

const ground = box(
    80, 0.3, 150,
    materials.ground,
    0, -0.3, -40
);

scene.add(ground);

// RAILWAY TRACKS

for (let lane = -1; lane <= 1; lane++) {

    const x = lane * 2.5;

    scene.add(box(
        2.2, 0.12, 150,
        materials.track,
        x, 0, -40
    ));

    for (const side of [-0.75, 0.75]) {
        scene.add(box(
            0.12, 0.18, 150,
            materials.rail,
            x + side, 0.12, -40
        ));
    }
}

// RAILWAY SLEEPERS

const sleepers = [];

for (let i = 0; i < 50; i++) {
    const sleeper = box(
        7, 0.15, 0.35,
        materials.wood,
        0, 0.02, -i * 3
    );

    scene.add(sleeper);
    sleepers.push(sleeper);
}

// DISTANT CARTOON BUILDINGS

for (let i = 0; i < 35; i++) {

    for (const side of [-1, 1]) {

        const height = 4 + Math.random() * 12;

        const building = box(
            4,
            height,
            5,
            new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(
                    Math.random(),
                    0.65,
                    0.55
                )
            }),
            side * (9 + Math.random() * 4),
            height / 2,
            -i * 8 - 15
        );

        scene.add(building);
    }
}

// PLAYER CHARACTER

const player = new THREE.Group();
scene.add(player);

player.position.set(0, 0, 0);

// Body
const body = box(
    0.75, 1, 0.45,
    materials.blue,
    0, 1.25, 0
);
player.add(body);

// Head
const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 20, 20),
    materials.skin
);
head.position.set(0, 2.05, 0);
head.castShadow = true;
player.add(head);

// Hair
const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.39, 20, 12),
    materials.black
);
hair.scale.set(1, 0.45, 1);
hair.position.set(0, 2.27, 0);
player.add(hair);

// Eyes
for (const x of [-0.13, 0.13]) {
    const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        materials.white
    );
    eye.position.set(x, 2.07, 0.34);
    player.add(eye);
}

// Arms
const arms = [];

for (const x of [-0.53, 0.53]) {
    const arm = box(
        0.23, 0.75, 0.25,
        materials.skin,
        x, 1.3, 0
    );
    player.add(arm);
    arms.push(arm);
}

// Legs
const legs = [];

for (const x of [-0.23, 0.23]) {
    const leg = box(
        0.25, 0.65, 0.3,
        materials.black,
        x, 0.38, 0
    );
    player.add(leg);
    legs.push(leg);
}

// GAME VARIABLES

const lanes = [-2.5, 0, 2.5];

let currentLane = 1;
let targetX = 0;

let score = 0;
let coins = 0;
let speed = 18;

let running = false;
let gameOver = false;

let jumpVelocity = 0;
let jumping = false;
let sliding = false;
let slideTimer = 0;

let spawnTimer = 0;

const objects = [];

const clock = new THREE.Clock();

// OBSTACLE CREATION

function createObstacle() {

    const lane = Math.floor(Math.random() * 3);
    const type = Math.random();

    let obstacle;

    if (type < 0.45) {

        // Jump barrier
        obstacle = box(
            1.5, 1.1, 0.8,
            materials.red,
            lanes[lane], 0.55, -65
        );

        obstacle.userData.type = "barrier";

    } else if (type < 0.75) {

        // Slide obstacle
        obstacle = new THREE.Group();

        const top = box(
            1.8, 0.4, 0.6,
            materials.yellow,
            0, 2, 0
        );

        const left = box(
            0.25, 2, 0.6,
            materials.yellow,
            -0.75, 1, 0
        );

        const right = box(
            0.25, 2, 0.6,
            materials.yellow,
            0.75, 1, 0
        );

        obstacle.add(top, left, right);
        obstacle.position.set(lanes[lane], 0, -65);

        obstacle.userData.type = "slide";

    } else {

        // Cartoon train
        obstacle = new THREE.Group();

        const trainBody = box(
            2, 3.5, 7,
            materials.blue,
            0, 1.8, 0
        );

        const front = box(
            1.4, 1.2, 0.15,
            materials.white,
            0, 2.2, 3.58
        );

        const window = box(
            1.5, 0.9, 0.12,
            materials.yellow,
            0, 2.8, 3.6
        );

        obstacle.add(trainBody, front, window);
        obstacle.position.set(lanes[lane], 0, -65);

        obstacle.userData.type = "train";
    }

    obstacle.userData.lane = lane;
    obstacle.userData.passed = false;

    scene.add(obstacle);
    objects.push(obstacle);
}

// COIN CREATION

function createCoinLine() {

    const lane = Math.floor(Math.random() * 3);

    for (let i = 0; i < 5; i++) {

        const coin = new THREE.Mesh(
            new THREE.TorusGeometry(0.35, 0.12, 10, 20),
            new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2
            })
        );

        coin.position.set(
            lanes[lane],
            1.3,
            -50 - i * 2
        );

        coin.userData.type = "coin";

        scene.add(coin);
        objects.push(coin);
    }
}

// PLAYER MOVEMENT

function moveLeft() {
    if (!running) return;

    currentLane = Math.max(0, currentLane - 1);
    targetX = lanes[currentLane];
}

function moveRight() {
    if (!running) return;

    currentLane = Math.min(2, currentLane + 1);
    targetX = lanes[currentLane];
}

function jump() {

    if (!running || jumping || sliding) return;

    jumping = true;
    jumpVelocity = 10;
}

function slide() {

    if (!running || jumping) return;

    sliding = true;
    slideTimer = 0.8;
}

// KEYBOARD CONTROLS

window.addEventListener("keydown", (e) => {

    if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "]
        .includes(e.key)
    ) {
        e.preventDefault();
    }

    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a")
        moveLeft();

    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d")
        moveRight();

    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w")
        jump();

    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s")
        slide();
});

// MOBILE SWIPE CONTROLS

let touchStartX = 0;
let touchStartY = 0;

renderer.domElement.addEventListener("touchstart", (e) => {

    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;

}, {passive: true});

renderer.domElement.addEventListener("touchend", (e) => {

    const dx = e.changedTouches[0].screenX - touchStartX;
    const dy = e.changedTouches[0].screenY - touchStartY;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;

    if (Math.abs(dx) > Math.abs(dy)) {

        if (dx > 0) moveRight();
        else moveLeft();

    } else {

        if (dy < 0) jump();
        else slide();

    }

}, {passive: true});

// COLLISION DETECTION

function checkCollision(obj) {

    if (obj.userData.type === "coin") {

        if (
            Math.abs(obj.position.z) < 1.2 &&
            Math.abs(obj.position.x - player.position.x) < 0.9 &&
            Math.abs(obj.position.y - (player.position.y + 1.2)) < 1.2
        ) {

            coins++;
            document.getElementById("coins").textContent = coins;

            return true;
        }

        return false;
    }

    if (
        Math.abs(obj.position.z) < 1.1 &&
        Math.abs(obj.position.x - player.position.x) < 1.2
    ) {

        if (obj.userData.type === "barrier") {
            return player.position.y < 1.1;
        }

        if (obj.userData.type === "slide") {
            return !sliding;
        }

        if (obj.userData.type === "train") {
            return true;
        }
    }

    return false;
}

// GAME OVER

function endGame() {

    running = false;
    gameOver = true;

    const best = Math.max(
        score,
        Number(localStorage.getItem("bestScore") || 0)
    );

    localStorage.setItem("bestScore", best);

    document.getElementById("final-score").textContent = score;
    document.getElementById("best-score").textContent = best;

    document.getElementById("game-over").classList.remove("hidden");
}

// RESET GAME

function resetGame() {

    objects.forEach(obj => scene.remove(obj));
    objects.length = 0;

    score = 0;
    coins = 0;
    speed = 18;

    currentLane = 1;
    targetX = 0;

    player.position.set(0, 0, 0);

    jumping = false;
    sliding = false;
    jumpVelocity = 0;

    spawnTimer = 0;

    document.getElementById("score").textContent = 0;
    document.getElementById("coins").textContent = 0;

    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("game-over").classList.add("hidden");

    gameOver = false;
    running = true;

    clock.getDelta();
}

// BUTTONS

document.getElementById("start-btn").addEventListener("click", resetGame);
document.getElementById("restart-btn").addEventListener("click", resetGame);

// MAIN GAME LOOP

function animate() {

    requestAnimationFrame(animate);

    const delta = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    if (running) {

        // Score and speed
        score += Math.floor(delta * 10);
        speed = Math.min(18 + score * 0.015, 38);

        document.getElementById("score").textContent = score;

        // Lane movement
        player.position.x +=
            (targetX - player.position.x) * Math.min(1, delta * 12);

        // Jump physics
        if (jumping) {

            player.position.y += jumpVelocity * delta;
            jumpVelocity -= 25 * delta;

            if (player.position.y <= 0) {
                player.position.y = 0;
                jumping = false;
                jumpVelocity = 0;
            }
        }

        // Slide
        if (sliding) {

            slideTimer -= delta;
            player.scale.y = 0.5;

            if (slideTimer <= 0) {
                sliding = false;
                player.scale.y = 1;
            }

        } else {
            player.scale.y = 1;
        }

        // Running animation
        if (!jumping && !sliding) {

            arms[0].rotation.x = Math.sin(time * 12) * 0.6;
            arms[1].rotation.x = -Math.sin(time * 12) * 0.6;

            legs[0].rotation.x = -Math.sin(time * 12) * 0.6;
            legs[1].rotation.x = Math.sin(time * 12) * 0.6;
        }

        // Move railway sleepers
        sleepers.forEach(sleeper => {

            sleeper.position.z += speed * delta;

            if (sleeper.position.z > 10) {
                sleeper.position.z -= 150;
            }
        });

        // Spawn objects
        spawnTimer += delta;

        if (spawnTimer > 1.25) {

            createObstacle();

            if (Math.random() > 0.3) {
                createCoinLine();
            }

            spawnTimer = 0;
        }

        // Move obstacles and coins
        for (let i = objects.length - 1; i >= 0; i--) {

            const obj = objects[i];

            obj.position.z += speed * delta;

            if (obj.userData.type === "coin") {
                obj.rotation.y += delta * 5;
            }

            if (checkCollision(obj)) {

                if (obj.userData.type === "coin") {
                    scene.remove(obj);
                    objects.splice(i, 1);
                    continue;
                }

                endGame();
                break;
            }

            if (obj.position.z > 12) {

                scene.remove(obj);
                objects.splice(i, 1);
            }
        }
    }

    renderer.render(scene, camera);
}

animate();

// RESPONSIVE SCREEN

window.addEventListener("resize", () => {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});
