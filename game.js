const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const gameOverDiv = document.getElementById('gameOver');
const gameStartDiv = document.getElementById('gameStart');
const finalScoreElement = document.getElementById('finalScore');

let gameState = 'start';
let score = 0;
let lives = 3;
let isPaused = false;
let combo = 0;
let lastBreakTime = 0;

// サウンド関連
let audioContext;
let soundEnabled = true;

function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.log('Web Audio API not supported');
        soundEnabled = false;
    }
}

function playSound(frequency, duration, volume = 0.1, type = 'sine') {
    if (!soundEnabled || !audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playBrickBreakSound() {
    playSound(800, 0.1, 0.15, 'square');
}

function playPaddleHitSound() {
    playSound(200, 0.1, 0.1, 'sine');
}

function playWallHitSound() {
    playSound(300, 0.05, 0.08, 'triangle');
}

function playGameOverSound() {
    setTimeout(() => playSound(150, 0.5, 0.2, 'sawtooth'), 0);
    setTimeout(() => playSound(100, 0.5, 0.2, 'sawtooth'), 200);
    setTimeout(() => playSound(75, 0.8, 0.2, 'sawtooth'), 400);
}

function playGameWinSound() {
    setTimeout(() => playSound(523, 0.2, 0.15, 'sine'), 0);
    setTimeout(() => playSound(659, 0.2, 0.15, 'sine'), 200);
    setTimeout(() => playSound(784, 0.2, 0.15, 'sine'), 400);
    setTimeout(() => playSound(1047, 0.4, 0.15, 'sine'), 600);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

const paddle = {
    width: 100,
    height: 15,
    x: 0,
    y: 0,
    speed: 8,
    dx: 0
};

const ball = {
    radius: 8,
    x: 0,
    y: 0,
    speed: 5,
    dx: 5,
    dy: -5,
    baseSpeed: 5
};

const bricks = {
    rows: 8,
    cols: 15,
    width: 0,
    height: 0,
    padding: 5,
    offsetTop: 80,
    offsetLeft: 0,
    colors: ['#FF0000', '#FF4500', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#00FF00', '#00CED1'],
    array: []
};

function updateBrickLayout() {
    const totalCols = bricks.cols;
    const totalPadding = (totalCols - 1) * bricks.padding;
    const availableWidth = canvas.width - 40;
    bricks.width = Math.floor((availableWidth - totalPadding) / totalCols);
    bricks.height = 25;
    bricks.offsetLeft = 20;
    
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    console.log('Brick size:', bricks.width, 'x', bricks.height);
}

function initBricks() {
    updateBrickLayout();
    bricks.array = [];
    for (let r = 0; r < bricks.rows; r++) {
        bricks.array[r] = [];
        for (let c = 0; c < bricks.cols; c++) {
            bricks.array[r][c] = { x: 0, y: 0, status: 1 };
        }
    }
}

function resetPositions() {
    paddle.x = canvas.width / 2 - paddle.width / 2;
    paddle.y = canvas.height - 50;
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 80;
}

function drawPaddle() {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.closePath();
}

function drawBricks() {
    for (let r = 0; r < bricks.rows; r++) {
        for (let c = 0; c < bricks.cols; c++) {
            if (bricks.array[r][c].status === 1) {
                const brickX = c * (bricks.width + bricks.padding) + bricks.offsetLeft;
                const brickY = r * (bricks.height + bricks.padding) + bricks.offsetTop;
                bricks.array[r][c].x = brickX;
                bricks.array[r][c].y = brickY;
                ctx.fillStyle = bricks.colors[r];
                ctx.fillRect(brickX, brickY, bricks.width, bricks.height);
            }
        }
    }
}

function collisionDetection() {
    for (let r = 0; r < bricks.rows; r++) {
        for (let c = 0; c < bricks.cols; c++) {
            const b = bricks.array[r][c];
            if (b.status === 1) {
                if (ball.x > b.x && ball.x < b.x + bricks.width &&
                    ball.y > b.y && ball.y < b.y + bricks.height) {
                    ball.dy = -ball.dy;
                    b.status = 0;
                    
                    playBrickBreakSound();
                    
                    const currentTime = Date.now();
                    if (currentTime - lastBreakTime < 1000) {
                        combo++;
                    } else {
                        combo = 0;
                    }
                    lastBreakTime = currentTime;
                    
                    const baseScore = r === 0 ? 20 : 10;
                    const comboMultiplier = combo > 0 ? 1.5 : 1;
                    score += Math.floor(baseScore * comboMultiplier);
                    updateScore();
                    
                    const destroyedBricks = countDestroyedBricks();
                    updateBallSpeed(destroyedBricks);
                    
                    if (destroyedBricks === bricks.rows * bricks.cols) {
                        gameWin();
                    }
                }
            }
        }
    }
}

function countDestroyedBricks() {
    let count = 0;
    for (let r = 0; r < bricks.rows; r++) {
        for (let c = 0; c < bricks.cols; c++) {
            if (bricks.array[r][c].status === 0) {
                count++;
            }
        }
    }
    return count;
}

function updateBallSpeed(destroyedBricks) {
    if (destroyedBricks >= 30) {
        ball.speed = ball.baseSpeed * 1.6;
    } else if (destroyedBricks >= 20) {
        ball.speed = ball.baseSpeed * 1.4;
    } else if (destroyedBricks >= 10) {
        ball.speed = ball.baseSpeed * 1.2;
    }
    
    const currentSpeed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy);
    ball.dx = (ball.dx / currentSpeed) * ball.speed;
    ball.dy = (ball.dy / currentSpeed) * ball.speed;
}

function moveBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;
    
    if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
        ball.dx = -ball.dx;
        playWallHitSound();
    }
    if (ball.y - ball.radius < 0) {
        ball.dy = -ball.dy;
        playWallHitSound();
    }
    
    if (ball.x > paddle.x && ball.x < paddle.x + paddle.width &&
        ball.y + ball.radius > paddle.y && ball.y - ball.radius < paddle.y + paddle.height) {
        
        const hitPos = (ball.x - paddle.x) / paddle.width;
        const angle = (hitPos - 0.5) * Math.PI / 3;
        
        ball.dx = ball.speed * Math.sin(angle);
        ball.dy = -ball.speed * Math.cos(angle);
        
        playPaddleHitSound();
    }
    
    if (ball.y - ball.radius > canvas.height) {
        lives--;
        updateLives();
        if (lives === 0) {
            gameOver();
        } else {
            resetBall();
        }
    }
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 80;
    ball.dx = ball.speed;
    ball.dy = -ball.speed;
    paddle.x = canvas.width / 2 - paddle.width / 2;
}

function updateScore() {
    scoreElement.textContent = `スコア: ${score}`;
}

function updateLives() {
    livesElement.textContent = `ライフ: ${lives}`;
}

function gameOver() {
    gameState = 'over';
    finalScoreElement.textContent = `最終スコア: ${score}`;
    gameOverDiv.style.display = 'block';
    playGameOverSound();
}

function gameWin() {
    gameState = 'win';
    finalScoreElement.textContent = `クリア！ 最終スコア: ${score}`;
    gameOverDiv.style.display = 'block';
    playGameWinSound();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'playing' || gameState === 'over' || gameState === 'win') {
        drawBricks();
        drawPaddle();
        drawBall();
    }
    
    // デバッグ情報表示
    if (gameState === 'playing') {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.fillText(`Ball: (${Math.floor(ball.x)}, ${Math.floor(ball.y)})`, 10, canvas.height - 60);
        ctx.fillText(`Paddle: (${Math.floor(paddle.x)}, ${Math.floor(paddle.y)})`, 10, canvas.height - 40);
        ctx.fillText(`Canvas: ${canvas.width}x${canvas.height}`, 10, canvas.height - 20);
    }
}

function update() {
    if (gameState !== 'playing' || isPaused) return;
    
    moveBall();
    collisionDetection();
    
    paddle.x += paddle.dx;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
}

function gameLoop() {
    draw();
    update();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    resizeCanvas();
    initBricks();
    resetPositions();
    resetBall();
    
    console.log('Game started');
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    console.log('Paddle position:', paddle.x, paddle.y);
    console.log('Ball position:', ball.x, ball.y);
    
    gameStartDiv.style.display = 'none';
    gameState = 'playing';
    score = 0;
    lives = 3;
    combo = 0;
    ball.speed = ball.baseSpeed;
    
    updateScore();
    updateLives();
}

function resetGame() {
    gameOverDiv.style.display = 'none';
    startGame();
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    const soundToggle = document.getElementById('soundToggle');
    soundToggle.textContent = soundEnabled ? '🔊 ON' : '🔇 OFF';
    
    if (soundEnabled && audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
}

let mouseX = 0;
canvas.addEventListener('mousemove', (e) => {
    if (gameState !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    paddle.x = mouseX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
});

document.addEventListener('keydown', (e) => {
    if (gameState !== 'playing') return;
    
    if (e.key === 'ArrowLeft') {
        paddle.dx = -paddle.speed;
    } else if (e.key === 'ArrowRight') {
        paddle.dx = paddle.speed;
    } else if (e.key === ' ') {
        e.preventDefault();
        isPaused = !isPaused;
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        paddle.dx = 0;
    }
});

canvas.addEventListener('touchmove', (e) => {
    if (gameState !== 'playing') return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    paddle.x = touchX - paddle.width / 2;
    if (paddle.x < 0) paddle.x = 0;
    if (paddle.x + paddle.width > canvas.width) {
        paddle.x = canvas.width - paddle.width;
    }
});

window.addEventListener('resize', () => {
    if (gameState === 'playing') {
        resizeCanvas();
        initBricks();
        resetPositions();
    }
});

window.onload = () => {
    initAudio();
    resizeCanvas();
    initBricks();
    resetPositions();
    gameStartDiv.style.display = 'block';
    gameLoop();
};