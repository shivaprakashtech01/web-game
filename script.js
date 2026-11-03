const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("bestScore");
const finalScore = document.getElementById("finalScore");

const startScreen = document.getElementById("startScreen");
const gameOverScreen = document.getElementById("gameOverScreen");
const pauseScreen = document.getElementById("pauseScreen");

const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resumeBtn = document.getElementById("resumeBtn");
const soundBtn = document.getElementById("soundBtn");

const rabbitImage = new Image();
rabbitImage.src = "assets/rabbit.jpeg";

let W = 900;
let H = 675;
let dpr = 1;

function resizeCanvas() {
    // Read display dimensions without layout recursion
    W = canvas.clientWidth || 900;
    H = canvas.clientHeight || 675;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Game settings
const gravity = 0.19;
const flapPower = -4.5;
const obstacleSpeed = 1.65;
const obstacleGap = 210;
const obstacleWidth = 65;

let rabbit;
let obstacles = [];

let score = 0;
let best = Number(localStorage.getItem("flyingRabbitBest")) || 0;

let gameState = "menu";
let frame = 0;
let worldOffset = 0;
let soundOn = true;

if (bestText) bestText.textContent = best;

// Character setup
function createRabbit() {
    const size = Math.min(58, W * 0.105);
    rabbit = {
        x: W * 0.24,
        y: H * 0.48,
        width: size,
        height: size,
        velocity: 0,
        rotation: 0
    };
}

// Create obstacles
function createObstacle(x) {
    const margin = 75;
    const gap = Math.min(obstacleGap, H * 0.35);
    const available = H - gap - margin * 2;

    const topHeight = margin + Math.random() * Math.max(10, available);

    return {
        x: x,
        top: topHeight,
        gap: gap,
        passed: false
    };
}

function resetGame() {
    createRabbit();

    obstacles = [];
    score = 0;
    frame = 0;
    worldOffset = 0;

    obstacles.push(createObstacle(W + 100));

    if (scoreText) scoreText.textContent = "0";
    if (finalScore) finalScore.textContent = "0";

    gameState = "playing";

    if (startScreen) startScreen.classList.add("hidden");
    if (gameOverScreen) gameOverScreen.classList.add("hidden");
    if (pauseScreen) pauseScreen.classList.add("hidden");
}

// Background drawing
function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);

    gradient.addColorStop(0, "#75cbdc");
    gradient.addColorStop(0.55, "#b4e8d0");
    gradient.addColorStop(1, "#e1f1b7");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Sun
    ctx.fillStyle = "#fff0a9";
    ctx.beginPath();
    ctx.arc(W * 0.78, H * 0.20, Math.min(W, H) * 0.065, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountains
    drawMountain(0.05, 0.63, 0.26, 0.25, "#82c4a7");
    drawMountain(0.38, 0.64, 0.28, 0.32, "#73b99e");
    drawMountain(0.76, 0.63, 0.25, 0.27, "#82c4a7");

    // Clouds
    for (let i = 0; i < 4; i++) {
        const x = ((i * 270 - worldOffset * 0.15) % (W + 180) + W + 180) % (W + 180) - 60;
        drawCloud(x, H * (0.15 + (i % 2) * 0.13));
    }

    // Forest silhouettes
    drawForest();

    // Ground
    ctx.fillStyle = "#397c55";
    ctx.fillRect(0, H - 35, W, 35);

    ctx.fillStyle = "#8acb73";
    ctx.fillRect(0, H - 35, W, 8);

    for (let i = 0; i < W / 30 + 1; i++) {
        const x = (i * 30 - worldOffset * 0.5) % (W + 30);

        ctx.fillStyle = "#d1e99b";
        ctx.beginPath();
        ctx.ellipse(x, H - 25, 7, 3, -0.4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawMountain(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(W * x, H * y);
    ctx.lineTo(W * (x + width / 2), H * (y - height));
    ctx.lineTo(W * (x + width), H * y);
    ctx.closePath();
    ctx.fill();
}

function drawCloud(x, y) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(x, y, 19, 0, Math.PI * 2);
    ctx.arc(x + 22, y - 10, 24, 0, Math.PI * 2);
    ctx.arc(x + 46, y, 18, 0, Math.PI * 2);
    ctx.fill();
}

function drawForest() {
    for (let i = 0; i < 12; i++) {
        const x = (i * 110 - worldOffset * 0.4) % (W + 110);
        const treeX = (x + W + 110) % (W + 110);

        ctx.fillStyle = "#397b5a";
        ctx.beginPath();
        ctx.moveTo(treeX, H - 35);
        ctx.lineTo(treeX + 25, H * 0.57);
        ctx.lineTo(treeX + 50, H - 35);
        ctx.fill();
    }
}

// Fantasy stone obstacles
function drawPillar(x, y, width, height, isTop) {
    if (height <= 0) return;

    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, "#776e62");
    gradient.addColorStop(0.5, "#b8a68b");
    gradient.addColorStop(1, "#6e685c");

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    // Stone outline
    ctx.strokeStyle = "#594e43";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // Decorative stone blocks
    ctx.strokeStyle = "#e4cda4";
    ctx.lineWidth = 2;

    for (let i = 20; i < height; i += 35) {
        ctx.beginPath();
        ctx.moveTo(x + 5, y + i);
        ctx.lineTo(x + width - 5, y + i);
        ctx.stroke();
    }

    // Pillar cap
    const capY = isTop ? y + height - 14 : y;

    ctx.fillStyle = "#d7bd91";
    ctx.fillRect(x - 7, capY, width + 14, 14);

    ctx.fillStyle = "#84755d";
    ctx.fillRect(x - 7, capY + 11, width + 14, 5);

    // Green vines
    ctx.strokeStyle = "#398451";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(x + 12, y + 8);
    ctx.quadraticCurveTo(
        x + 2, y + height * 0.3,
        x + 20, y + height * 0.5
    );
    ctx.stroke();

    // Small leaves
    for (let i = 0; i < Math.min(height / 70, 5); i++) {
        ctx.fillStyle = "#5cae67";
        ctx.beginPath();
        ctx.ellipse(
            x + 12 + (i % 2) * 8,
            y + 35 + i * 45,
            6, 3, -0.5, 0, Math.PI * 2
        );
        ctx.fill();
    }
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        const bottomY = obstacle.top + obstacle.gap;
        const bottomHeight = Math.max(0, H - bottomY - 35);

        drawPillar(obstacle.x, 0, obstacleWidth, obstacle.top, true);
        drawPillar(obstacle.x, bottomY, obstacleWidth, bottomHeight, false);
    });
}

// Draw character
function drawRabbit() {
    if (!rabbit) return;

    ctx.save();

    ctx.translate(
        rabbit.x + rabbit.width / 2,
        rabbit.y + rabbit.height / 2
    );

    ctx.rotate(rabbit.rotation);

    if (rabbitImage.complete && rabbitImage.naturalWidth > 0) {
        ctx.drawImage(
            rabbitImage,
            -rabbit.width / 2,
            -rabbit.height / 2,
            rabbit.width,
            rabbit.height
        );
    } else {
        // Fallback character placeholder
        ctx.font = `${rabbit.height}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🐰", 0, 0);
    }

    ctx.restore();
}

// Update character physics
function updateRabbit() {
    rabbit.velocity += gravity;
    rabbit.y += rabbit.velocity;

    rabbit.rotation = Math.max(
        -0.35,
        Math.min(0.6, rabbit.velocity * 0.08)
    );

    if (rabbit.y < 0) {
        rabbit.y = 0;
        rabbit.velocity = 0;
    }

    if (rabbit.y + rabbit.height > H - 35) {
        endGame();
    }
}

// Flying control
function fly() {
    if (gameState === "playing" && rabbit) {
        rabbit.velocity = flapPower;
    }
}

// Obstacle movement
function updateObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.x -= obstacleSpeed;

        if (!obstacle.passed && obstacle.x + obstacleWidth < rabbit.x) {
            obstacle.passed = true;

            score++;
            if (scoreText) scoreText.textContent = score;

            if (score > best) {
                best = score;
                localStorage.setItem("flyingRabbitBest", best);
                if (bestText) bestText.textContent = best;
            }
        }
    });

    obstacles = obstacles.filter(
        obstacle => obstacle.x + obstacleWidth > -10
    );

    if (
        obstacles.length === 0 ||
        obstacles[obstacles.length - 1].x < W - 250
    ) {
        obstacles.push(createObstacle(W + 30));
    }
}

// Collision detection
function checkCollision() {
    const padding = 9;

    const left = rabbit.x + padding;
    const right = rabbit.x + rabbit.width - padding;
    const top = rabbit.y + padding;
    const bottom = rabbit.y + rabbit.height - padding;

    for (const obstacle of obstacles) {
        const horizontal =
            right > obstacle.x &&
            left < obstacle.x + obstacleWidth;

        if (horizontal) {
            if (
                top < obstacle.top ||
                bottom > obstacle.top + obstacle.gap
            ) {
                endGame();
                return;
            }
        }
    }
}

// Game over
function endGame() {
    if (gameState !== "playing") return;

    gameState = "over";

    if (finalScore) finalScore.textContent = score;

    const resultMsg = document.getElementById("resultMessage");
    if (resultMsg) {
        resultMsg.textContent =
            score >= 10
                ? "Amazing flying! You're a champion!"
                : "Nice try! Let's fly again!";
    }

    if (gameOverScreen) gameOverScreen.classList.remove("hidden");
}

// Pause
function pauseGame() {
    if (gameState !== "playing") return;

    gameState = "paused";
    if (pauseScreen) pauseScreen.classList.remove("hidden");
}

function resumeGame() {
    if (gameState !== "paused") return;

    gameState = "playing";
    if (pauseScreen) pauseScreen.classList.add("hidden");
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);

    if (gameState === "playing") {
        frame++;
        worldOffset += obstacleSpeed;

        updateRabbit();
        updateObstacles();
        checkCollision();
    }

    drawBackground();

    if (gameState === "playing" || gameState === "paused" || gameState === "over") {
        drawObstacles();
        drawRabbit();
    } else {
        // Character preview on start screen
        if (!rabbit) createRabbit();
        drawRabbit();
    }
}

// Button events
if (startBtn) startBtn.addEventListener("click", resetGame);
if (restartBtn) restartBtn.addEventListener("click", resetGame);
if (pauseBtn) pauseBtn.addEventListener("click", pauseGame);
if (resumeBtn) resumeBtn.addEventListener("click", resumeGame);

// Keyboard controls
document.addEventListener("keydown", event => {
    if (event.code === "Space" || event.code === "ArrowUp") {
        event.preventDefault();
        fly();
    }

    if (event.code === "Escape") {
        if (gameState === "playing") pauseGame();
        else if (gameState === "paused") resumeGame();
    }
});

// Mouse and mobile touch
canvas.addEventListener("pointerdown", event => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    fly();
});

// Sound toggle
if (soundBtn) {
    soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        soundBtn.textContent = soundOn ? "🔊" : "🔇";
    });
}

// Initialize
createRabbit();
animate();