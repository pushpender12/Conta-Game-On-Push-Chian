// ============================================
// CONTRA GAME ENGINE
// Pure JavaScript + HTML5 Canvas
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ---- Game State ----
let gameState = {
    score: 0,
    lives: 3,
    level: 1,
    gameOver: false,
    gameStarted: false,
    enemiesKilled: 0
};

// ---- Player Object ----
let player = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    speedX: 0,
    speedY: 0,
    onGround: false,
    direction: 1,       // 1 = facing right, -1 = facing left
    color: '#00aaff'
};

// ---- Bullet Arrays ----
let playerBullets = [];
let enemyBullets = [];

// ---- Enemy Array ----
let enemies = [];

// ---- Platform Definitions ----
let platforms = [
    { x: 0,   y: 370, width: 600, height: 30 },   // Ground floor
    { x: 150, y: 280, width: 120, height: 15 },   // Platform 1
    { x: 350, y: 220, width: 120, height: 15 },   // Platform 2
    { x: 80,  y: 180, width: 100, height: 15 },   // Platform 3
    { x: 450, y: 310, width: 80,  height: 15 },   // Platform 4
];

// ---- Keyboard Input Tracker ----
let keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') e.preventDefault();

    // Start game on Enter key
    if (e.code === 'Enter' && !gameState.gameStarted && !gameState.gameOver) {
        startGame();
    }

    // Restart game on R key
    if (e.code === 'KeyR' && gameState.gameOver) {
        restartGame();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

// ============================================
// SPAWN FUNCTIONS
// ============================================

function spawnEnemy() {
    // Max 5 enemies at a time
    if (enemies.length >= 5) return;

    // Randomly spawn from left or right edge
    const spawnFromRight = Math.random() > 0.5;

    enemies.push({
        x: spawnFromRight ? 570 : 20,
        y: 310,
        width: 28,
        height: 38,
        speedY: 0,
        onGround: false,
        // Enemies get faster as level increases
        speed: 0.8 + (gameState.level * 0.2),
        direction: spawnFromRight ? -1 : 1,
        health: 1,
        shootTimer: 60 + Math.floor(Math.random() * 80),
        color: '#ff4444'
    });
}

// Spawn enemies every 3 seconds
setInterval(() => {
    if (!gameState.gameOver && gameState.gameStarted) {
        spawnEnemy();
    }
}, 3000);

// ============================================
// SHOOTING FUNCTION
// ============================================

let lastShotTime = 0;

function shoot() {
    const now = Date.now();
    // Fire rate limit: 200ms between shots
    if (now - lastShotTime < 200) return;
    lastShotTime = now;

    playerBullets.push({
        x: player.direction === 1
            ? player.x + player.width
            : player.x,
        y: player.y + 15,
        width: 8,
        height: 4,
        speed: 8 * player.direction,
        color: '#ffff00'
    });
}

// ============================================
// COLLISION DETECTION
// ============================================

// Simple AABB (Axis-Aligned Bounding Box) collision
function isColliding(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// Check if an object is standing on a platform
function applyPlatformCollision(obj) {
    obj.onGround = false;

    for (let platform of platforms) {
        const isHorizontallyAligned =
            obj.x + obj.width > platform.x &&
            obj.x < platform.x + platform.width;

        const isFallingThrough =
            obj.y + obj.height <= platform.y + 10 &&
            obj.y + obj.height + obj.speedY >= platform.y;

        if (isHorizontallyAligned && isFallingThrough) {
            obj.y = platform.y - obj.height;
            obj.speedY = 0;
            obj.onGround = true;
            break;
        }
    }
}

// ============================================
// GAME LOGIC UPDATE
// ============================================

function update() {
    if (gameState.gameOver || !gameState.gameStarted) return;

    // ---- Player Movement ----
    player.speedX = 0;

    if (keys['ArrowLeft']) {
        player.speedX = -4;
        player.direction = -1;
    }
    if (keys['ArrowRight']) {
        player.speedX = 4;
        player.direction = 1;
    }
    if (keys['ArrowUp'] && player.onGround) {
        player.speedY = -12;  // Jump force
    }
    if (keys['Space']) {
        shoot();
    }

    // Apply gravity
    player.speedY += 0.6;

    // Move player
    player.x += player.speedX;
    player.y += player.speedY;

    // Keep player inside canvas horizontally
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));

    // Player fell off the bottom
    if (player.y > canvas.height) {
        handlePlayerDeath();
        return;
    }

    // Platform collision for player
    applyPlatformCollision(player);

    // ---- Update Player Bullets ----
    playerBullets = playerBullets.filter(b => b.x > 0 && b.x < canvas.width);
    playerBullets.forEach(b => { b.x += b.speed; });

    // ---- Update Enemy Bullets ----
    enemyBullets = enemyBullets.filter(b => b.x > 0 && b.x < canvas.width);
    enemyBullets.forEach(b => { b.x += b.speed; });

    // ---- Update Enemies ----
    enemies.forEach((enemy) => {
        // Enemy AI: move toward the player
        if (enemy.x < player.x) {
            enemy.direction = 1;
        } else {
            enemy.direction = -1;
        }

        enemy.x += enemy.speed * enemy.direction;

        // Apply gravity to enemy
        enemy.speedY += 0.6;
        enemy.y += enemy.speedY;
        applyPlatformCollision(enemy);

        // Enemy shooting timer
        enemy.shootTimer--;
        if (enemy.shootTimer <= 0) {
            // Reset timer randomly
            enemy.shootTimer = 60 + Math.floor(Math.random() * 80);

            // Fire bullet toward player
            enemyBullets.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y + 15,
                width: 6,
                height: 3,
                speed: 4 * enemy.direction,
                color: '#ff6600'
            });
        }
    });

    // ---- Check: Player Bullets Hit Enemies ----
    playerBullets.forEach((bullet, bulletIndex) => {
        enemies.forEach((enemy, enemyIndex) => {
            if (isColliding(bullet, enemy)) {
                // Remove bullet and enemy
                playerBullets.splice(bulletIndex, 1);
                enemies.splice(enemyIndex, 1);

                // Add score
                gameState.score += 100;
                gameState.enemiesKilled++;
                updateHUD();

                // Level up every 10 kills
                if (gameState.enemiesKilled % 10 === 0) {
                    gameState.level++;
                    updateHUD();
                }
            }
        });
    });

    // ---- Check: Enemy Bullets Hit Player ----
    enemyBullets.forEach((bullet, index) => {
        if (isColliding(bullet, player)) {
            enemyBullets.splice(index, 1);
            handlePlayerDeath();
        }
    });

    // ---- Check: Enemy Touches Player ----
    enemies.forEach((enemy) => {
        if (isColliding(enemy, player)) {
            handlePlayerDeath();
        }
    });
}

// ============================================
// PLAYER DEATH HANDLER
// ============================================

function handlePlayerDeath() {
    gameState.lives--;
    updateHUD();

    if (gameState.lives <= 0) {
        // Game Over
        gameState.gameOver = true;

        // Enable submit button if wallet is connected
        if (window.walletConnected) {
            document.getElementById('submitBtn').disabled = false;
        }
    } else {
        // Respawn player at starting position
        player.x = 50;
        player.y = 300;
        player.speedY = 0;

        // Clear all bullets and enemies on respawn
        enemies = [];
        playerBullets = [];
        enemyBullets = [];
    }
}

// ============================================
// DRAW / RENDER FUNCTIONS
// ============================================

function draw() {
    // ---- Clear and Draw Background ----
    ctx.fillStyle = '#1a0a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw background stars
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    for (let i = 0; i < 60; i++) {
        ctx.fillRect(
            (i * 127) % canvas.width,
            (i * 83) % 360,
            1, 1
        );
    }

    // ---- Start Screen ----
    if (!gameState.gameStarted) {
        drawStartScreen();
        return;
    }

    // ---- Draw Platforms ----
    platforms.forEach((p) => {
        // Platform body
        ctx.fillStyle = '#2d5a1b';
        ctx.fillRect(p.x, p.y, p.width, p.height);
        // Platform top highlight
        ctx.fillStyle = '#4a8a2e';
        ctx.fillRect(p.x, p.y, p.width, 4);
    });

    // ---- Draw Player ----
    // Player body
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player head
    ctx.fillStyle = '#ffcc88';
    ctx.fillRect(player.x + 8, player.y - 12, 14, 14);

    // Player gun (direction-aware)
    ctx.fillStyle = '#888888';
    if (player.direction === 1) {
        ctx.fillRect(player.x + player.width, player.y + 10, 12, 5);
    } else {
        ctx.fillRect(player.x - 12, player.y + 10, 12, 5);
    }

    // ---- Draw Enemies ----
    enemies.forEach((enemy) => {
        // Enemy body
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

        // Enemy head
        ctx.fillStyle = '#ff8888';
        ctx.fillRect(enemy.x + 6, enemy.y - 10, 16, 12);

        // Enemy gun (direction-aware)
        ctx.fillStyle = '#666666';
        if (enemy.direction === 1) {
            ctx.fillRect(enemy.x + enemy.width, enemy.y + 10, 10, 4);
        } else {
            ctx.fillRect(enemy.x - 10, enemy.y + 10, 10, 4);
        }
    });

    // ---- Draw Player Bullets ----
    playerBullets.forEach((b) => {
        // Bullet core
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);

        // Bullet glow effect
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(b.x - 2, b.y - 2, b.width + 4, b.height + 4);
    });

    // ---- Draw Enemy Bullets ----
    enemyBullets.forEach((b) => {
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });

    // ---- Draw Game Over Overlay ----
    if (gameState.gameOver) {
        drawGameOverScreen();
    }
}

function drawStartScreen() {
    ctx.textAlign = 'center';

    // Title
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 40px Courier New';
    ctx.fillText('CONTRA', canvas.width / 2, 150);

    // Subtitle
    ctx.fillStyle = '#ffff00';
    ctx.font = '18px Courier New';
    ctx.fillText('Push Chain Edition', canvas.width / 2, 188);

    // Instructions
    ctx.fillStyle = 'white';
    ctx.font = '14px Courier New';
    ctx.fillText('Press ENTER to Start', canvas.width / 2, 250);
    ctx.fillText('Arrow Keys = Move & Jump', canvas.width / 2, 278);
    ctx.fillText('SPACE = Shoot', canvas.width / 2, 304);

    ctx.textAlign = 'left';
}

function drawGameOverScreen() {
    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.textAlign = 'center';

    // Game Over title
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 42px Courier New';
    ctx.fillText('GAME OVER', canvas.width / 2, 170);

    // Score details
    ctx.fillStyle = 'white';
    ctx.font = '20px Courier New';
    ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, 220);
    ctx.fillText(`Enemies Killed: ${gameState.enemiesKilled}`, canvas.width / 2, 252);
    ctx.fillText(`Level Reached: ${gameState.level}`, canvas.width / 2, 282);

    // Call to action
    ctx.fillStyle = '#ffff00';
    ctx.font = '14px Courier New';
    ctx.fillText('Submit your score on-chain!', canvas.width / 2, 322);
    ctx.fillText('Press R to Restart', canvas.width / 2, 348);

    ctx.textAlign = 'left';
}

// ============================================
// GAME CONTROL FUNCTIONS
// ============================================

function startGame() {
    gameState.gameStarted = true;
    // Spawn 2 enemies at the beginning
    spawnEnemy();
    spawnEnemy();
}

function restartGame() {
    // Reset all game state
    gameState = {
        score: 0,
        lives: 3,
        level: 1,
        gameOver: false,
        gameStarted: true,
        enemiesKilled: 0
    };

    // Reset player position
    player.x = 50;
    player.y = 300;
    player.speedY = 0;

    // Clear all game objects
    enemies = [];
    playerBullets = [];
    enemyBullets = [];

    // Disable submit button on restart
    document.getElementById('submitBtn').disabled = true;

    updateHUD();

    // Spawn starting enemies
    spawnEnemy();
    spawnEnemy();
}

// Update HUD (Heads-Up Display) values
function updateHUD() {
    document.getElementById('scoreDisplay').textContent = gameState.score;
    document.getElementById('livesDisplay').textContent = gameState.lives;
    document.getElementById('levelDisplay').textContent = gameState.level;
    document.getElementById('enemyDisplay').textContent = gameState.enemiesKilled;
}

// ============================================
// MAIN GAME LOOP
// ============================================

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);  // ~60 FPS
}

// Start the game loop
gameLoop();