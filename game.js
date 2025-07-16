const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const levelElement = document.getElementById('level');
const gameOverDiv = document.getElementById('gameOver');
const gameStartDiv = document.getElementById('gameStart');
const finalScoreElement = document.getElementById('finalScore');

let gameState = 'start';
let score = 0;
let lives = 3;
let isPaused = false;
let combo = 0;
let lastBreakTime = 0;
let currentLevel = 1;
let totalBricks = 0;

// パーティクルシステム
const particles = [];

// パワーアップシステム
const powerUps = [];
const lasers = [];
let activePowerUps = {
    multiball: false,
    paddleSize: 1.0,
    slowMotion: false,
    laser: false,
    catch: false
};
let caughtBall = null;

// ハイスコア
let highScores = [];

// アチーブメントシステム
let achievements = [];
let gameStats = {
    totalBlocksDestroyed: 0,
    totalScore: 0,
    totalPlayTime: 0,
    maxCombo: 0,
    levelReached: 0,
    powerUpsCollected: 0,
    totalGames: 0
};

// 設定
let gameSettings = {
    difficulty: 'normal',
    volume: 0.5,
    sensitivity: 1.0,
    particlesEnabled: true,
    theme: 'modern',
    accessibilityMode: 'normal'
};

// テーマ設定
const themes = {
    classic: {
        background: '#000000',
        paddle: '#FFFFFF',
        ball: '#FFFFFF',
        brickColors: ['#FF0000', '#FF4500', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#00FF00', '#00CED1'],
        particleGlow: false,
        backgroundEffect: 'none'
    },
    modern: {
        background: '#000000',
        paddle: '#FFFFFF',
        ball: '#FFFFFF',
        brickColors: ['#FF0000', '#FF4500', '#FFA500', '#FFD700', '#FFFF00', '#ADFF2F', '#00FF00', '#00CED1'],
        particleGlow: true,
        backgroundEffect: 'gradient'
    },
    neon: {
        background: '#0a0a0a',
        paddle: '#00FFFF',
        ball: '#FF00FF',
        brickColors: ['#FF0080', '#FF00FF', '#8000FF', '#00FFFF', '#00FF80', '#80FF00', '#FFFF00', '#FF8000'],
        particleGlow: true,
        backgroundEffect: 'stars'
    }
};

// サウンド関連
let audioContext;
let soundEnabled = true;
let bgmEnabled = true;
let bgmGain;
let bgmOscillator;

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
    
    const adjustedVolume = volume * gameSettings.volume;
    gainNode.gain.setValueAtTime(adjustedVolume, audioContext.currentTime);
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

// BGM機能
function playBGM() {
    if (!bgmEnabled || !audioContext) return;
    
    stopBGM();
    
    try {
        bgmGain = audioContext.createGain();
        bgmGain.connect(audioContext.destination);
        bgmGain.gain.value = 0.05 * gameSettings.volume;
        
        const notes = [
            { freq: 262, duration: 0.5 }, // C4
            { freq: 294, duration: 0.5 }, // D4
            { freq: 330, duration: 0.5 }, // E4
            { freq: 262, duration: 0.5 }, // C4
            { freq: 330, duration: 0.5 }, // E4
            { freq: 392, duration: 0.5 }, // G4
            { freq: 523, duration: 1.0 }  // C5
        ];
        
        playBGMSequence(notes, 0);
    } catch (e) {
        console.log('BGM playback failed:', e);
    }
}

function playBGMSequence(notes, index) {
    if (!bgmEnabled || !audioContext || !bgmGain) return;
    
    if (index >= notes.length) {
        // ループ
        setTimeout(() => playBGMSequence(notes, 0), 1000);
        return;
    }
    
    const note = notes[index];
    const oscillator = audioContext.createOscillator();
    
    oscillator.connect(bgmGain);
    oscillator.frequency.value = note.freq;
    oscillator.type = 'square';
    
    const startTime = audioContext.currentTime;
    oscillator.start(startTime);
    oscillator.stop(startTime + note.duration);
    
    setTimeout(() => playBGMSequence(notes, index + 1), note.duration * 1000);
}

function stopBGM() {
    if (bgmGain) {
        bgmGain.disconnect();
        bgmGain = null;
    }
}

// 効果音のバリエーション
function playComboSound(comboCount) {
    const baseFreq = 800 + (comboCount * 100);
    playSound(baseFreq, 0.1, 0.15, 'sine');
}

function playPowerUpSound(type) {
    const frequencies = {
        multiball: [1000, 1200, 1400],
        paddleSize: [800, 1000],
        slowMotion: [600, 400],
        laser: [1500, 1800],
        catch: [1200, 1000]
    };
    
    const freqs = frequencies[type] || [1000];
    freqs.forEach((freq, index) => {
        setTimeout(() => playSound(freq, 0.1, 0.2, 'sine'), index * 100);
    });
}

function playLevelUpSound() {
    const melody = [523, 659, 784, 1047];
    melody.forEach((freq, index) => {
        setTimeout(() => playSound(freq, 0.2, 0.15, 'sine'), index * 150);
    });
}

// パーティクルクラス
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.radius = Math.random() * 3 + 1;
        this.color = color;
        this.alpha = 1;
        this.gravity = 0.1;
        this.life = 60;
    }
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.alpha = this.life / 60;
        this.life--;
        return this.life > 0;
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function createParticles(x, y, color, count = 10) {
    if (!gameSettings.particlesEnabled) return;
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        if (!particles[i].update()) {
            particles.splice(i, 1);
        }
    }
}

function drawParticles() {
    particles.forEach(particle => particle.draw(ctx));
}

// パワーアップクラス
class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 20;
        this.type = type;
        this.speed = 2;
        this.colors = {
            multiball: '#FF00FF',
            paddleSize: '#00FF00',
            slowMotion: '#00FFFF',
            laser: '#FF0000',
            catch: '#FFFF00'
        };
    }
    
    update() {
        this.y += this.speed;
        return this.y < canvas.height;
    }
    
    draw(ctx) {
        const theme = themes[gameSettings.theme];
        
        if (gameSettings.theme === 'neon') {
            ctx.shadowBlur = 15;
            ctx.shadowColor = this.colors[this.type];
        }
        
        // パワーアップの外枠
        ctx.strokeStyle = this.colors[this.type];
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
        
        // 内部を半透明で塗りつぶし
        ctx.fillStyle = this.colors[this.type] + '40';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // タイプの頭文字を表示
        ctx.fillStyle = this.colors[this.type];
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const labels = {
            multiball: 'M',
            paddleSize: 'P',
            slowMotion: 'S',
            laser: 'L',
            catch: 'C'
        };
        ctx.fillText(labels[this.type], this.x + this.width / 2, this.y + this.height / 2);
        
        ctx.shadowBlur = 0;
    }
}

function createPowerUp(x, y) {
    // 20%の確率でパワーアップをドロップ
    if (Math.random() < 0.2) {
        const types = ['multiball', 'paddleSize', 'slowMotion', 'laser', 'catch'];
        const type = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(x, y, type));
    }
}

function updatePowerUps() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        if (!powerUps[i].update()) {
            powerUps.splice(i, 1);
        }
    }
}

function drawPowerUps() {
    powerUps.forEach(powerUp => powerUp.draw(ctx));
}

function checkPowerUpCollision() {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (powerUp.x < paddle.x + paddle.width &&
            powerUp.x + powerUp.width > paddle.x &&
            powerUp.y < paddle.y + paddle.height &&
            powerUp.y + powerUp.height > paddle.y) {
            
            activatePowerUp(powerUp.type);
            powerUps.splice(i, 1);
            playPowerUpSound(powerUp.type);
            
            // 統計更新
            gameStats.powerUpsCollected++;
            updateGameStats();
        }
    }
}

// レーザークラス
class Laser {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 3;
        this.height = 10;
        this.speed = 8;
    }
    
    update() {
        this.y -= this.speed;
        return this.y > 0;
    }
    
    draw(ctx) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // レーザーの光る効果
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#FF0000';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0;
    }
}

function fireLaser() {
    if (activePowerUps.laser && lasers.length < 3) {
        lasers.push(new Laser(paddle.x + paddle.width / 2 - 1.5, paddle.y - 10));
        playSound(1500, 0.1, 0.1, 'sawtooth');
    }
}

function updateLasers() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        if (!lasers[i].update()) {
            lasers.splice(i, 1);
        }
    }
}

function drawLasers() {
    lasers.forEach(laser => laser.draw(ctx));
}

function checkLaserCollision() {
    for (let i = lasers.length - 1; i >= 0; i--) {
        const laser = lasers[i];
        
        for (let r = 0; r < bricks.rows; r++) {
            for (let c = 0; c < bricks.cols; c++) {
                const brick = bricks.array[r][c];
                if (brick.status === 1) {
                    if (laser.x < brick.x + bricks.width &&
                        laser.x + laser.width > brick.x &&
                        laser.y < brick.y + bricks.height &&
                        laser.y + laser.height > brick.y) {
                        
                        // レーザーがブロックに当たった
                        lasers.splice(i, 1);
                        
                        // ブロックを破壊
                        if (brick.type === 'hard') {
                            brick.hits--;
                            if (brick.hits <= 0) {
                                brick.status = 0;
                            }
                        } else if (brick.type === 'bomb') {
                            brick.status = 0;
                            explodeBomb(r, c);
                        } else {
                            brick.status = 0;
                        }
                        
                        if (brick.status === 0) {
                            playBrickBreakSound();
                            
                            // パーティクルエフェクト
                            const brickCenterX = brick.x + bricks.width / 2;
                            const brickCenterY = brick.y + bricks.height / 2;
                            const theme = themes[gameSettings.theme];
                            let color = theme.brickColors[r];
                            
                            if (brick.type === 'hard') {
                                color = '#C0C0C0';
                            } else if (brick.type === 'bomb') {
                                color = '#FF4500';
                            } else if (brick.type === 'moving') {
                                color = '#FFD700';
                            }
                            
                            createParticles(brickCenterX, brickCenterY, color, 8);
                            
                            // スコア
                            let baseScore = r === 0 ? 20 : 10;
                            if (brick.type === 'hard') {
                                baseScore = 25;
                            } else if (brick.type === 'bomb') {
                                baseScore = 50;
                            } else if (brick.type === 'moving') {
                                baseScore = 30;
                            }
                            
                            score += baseScore;
                            updateScore();
                            
                            // 統計更新
                            gameStats.totalBlocksDestroyed++;
                            updateGameStats();
                            
                            // レベルクリアチェック
                            const destroyedBricks = countDestroyedBricks();
                            if (destroyedBricks === totalBricks) {
                                nextLevel();
                            }
                        }
                        
                        break;
                    }
                }
            }
        }
    }
}

function activatePowerUp(type) {
    switch (type) {
        case 'multiball':
            if (balls.length === 0) {
                // メインボールから2つの追加ボールを生成
                balls.push(new Ball(ball.x, ball.y, ball.speed * 0.7, -ball.speed * 0.7));
                balls.push(new Ball(ball.x, ball.y, -ball.speed * 0.7, -ball.speed * 0.7));
            }
            break;
        case 'paddleSize':
            activePowerUps.paddleSize = 1.5;
            paddle.width = 100 * activePowerUps.paddleSize;
            setTimeout(() => {
                activePowerUps.paddleSize = 1.0;
                paddle.width = 100;
            }, 10000);
            break;
        case 'slowMotion':
            activePowerUps.slowMotion = true;
            ball.speed *= 0.5;
            setTimeout(() => {
                activePowerUps.slowMotion = false;
                ball.speed *= 2;
            }, 5000);
            break;
        case 'laser':
            activePowerUps.laser = true;
            setTimeout(() => {
                activePowerUps.laser = false;
            }, 15000);
            break;
        case 'catch':
            activePowerUps.catch = true;
            setTimeout(() => {
                activePowerUps.catch = false;
            }, 20000);
            break;
    }
}

// ハイスコア関連
function loadHighScores() {
    const stored = localStorage.getItem('breakoutHighScores');
    if (stored) {
        highScores = JSON.parse(stored);
    } else {
        highScores = [];
    }
}

function saveHighScores() {
    localStorage.setItem('breakoutHighScores', JSON.stringify(highScores));
}

function addHighScore(score) {
    const date = new Date().toLocaleDateString('ja-JP');
    highScores.push({ score, date });
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10); // トップ10のみ保持
    saveHighScores();
}

function isHighScore(score) {
    if (highScores.length < 10) return true;
    return score > highScores[highScores.length - 1].score;
}

// アチーブメントシステム
const achievementDefinitions = [
    {
        id: 'first_game',
        name: '初回プレイ',
        description: '初めてゲームをプレイした',
        icon: '🎮',
        condition: () => gameStats.totalGames >= 1
    },
    {
        id: 'score_1000',
        name: 'スコア達成者',
        description: '1000点を獲得した',
        icon: '🏆',
        condition: () => gameStats.totalScore >= 1000
    },
    {
        id: 'combo_master',
        name: 'コンボマスター',
        description: '10コンボを達成した',
        icon: '🔥',
        condition: () => gameStats.maxCombo >= 10
    },
    {
        id: 'level_5',
        name: 'レベル5到達',
        description: 'レベル5に到達した',
        icon: '🌟',
        condition: () => gameStats.levelReached >= 5
    },
    {
        id: 'power_collector',
        name: 'パワーアップコレクター',
        description: '50個のパワーアップを収集した',
        icon: '⚡',
        condition: () => gameStats.powerUpsCollected >= 50
    },
    {
        id: 'destroyer',
        name: 'ブロック破壊王',
        description: '500個のブロックを破壊した',
        icon: '💥',
        condition: () => gameStats.totalBlocksDestroyed >= 500
    },
    {
        id: 'marathon',
        name: 'マラソンプレイヤー',
        description: '30分間プレイした',
        icon: '⏰',
        condition: () => gameStats.totalPlayTime >= 1800000 // 30分
    },
    {
        id: 'perfectionist',
        name: 'パーフェクト',
        description: '10000点を獲得した',
        icon: '👑',
        condition: () => gameStats.totalScore >= 10000
    }
];

function loadAchievements() {
    const storedAchievements = localStorage.getItem('breakoutAchievements');
    const storedStats = localStorage.getItem('breakoutStats');
    
    if (storedAchievements) {
        achievements = JSON.parse(storedAchievements);
    }
    
    if (storedStats) {
        gameStats = JSON.parse(storedStats);
    }
}

function saveAchievements() {
    localStorage.setItem('breakoutAchievements', JSON.stringify(achievements));
    localStorage.setItem('breakoutStats', JSON.stringify(gameStats));
}

function checkAchievements() {
    achievementDefinitions.forEach(def => {
        if (!achievements.includes(def.id) && def.condition()) {
            unlockAchievement(def);
        }
    });
}

function unlockAchievement(achievement) {
    achievements.push(achievement.id);
    saveAchievements();
    
    // アチーブメント通知を表示
    showAchievementNotification(achievement);
    
    // 特別な効果音
    playSound(1500, 0.3, 0.2, 'sine');
    setTimeout(() => playSound(1200, 0.3, 0.2, 'sine'), 150);
    setTimeout(() => playSound(1800, 0.5, 0.2, 'sine'), 300);
}

function showAchievementNotification(achievement) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 2000;
        font-size: 16px;
        font-weight: bold;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;
    
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 24px;">${achievement.icon}</span>
            <div>
                <div style="font-size: 18px; margin-bottom: 5px;">アチーブメント解除！</div>
                <div style="font-size: 16px; font-weight: normal;">${achievement.name}</div>
                <div style="font-size: 14px; opacity: 0.9; font-weight: normal;">${achievement.description}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // アニメーション
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 4000);
}

function updateGameStats() {
    gameStats.totalScore = Math.max(gameStats.totalScore, score);
    gameStats.maxCombo = Math.max(gameStats.maxCombo, combo);
    gameStats.levelReached = Math.max(gameStats.levelReached, currentLevel);
    
    saveAchievements();
    checkAchievements();
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

const balls = [];

class Ball {
    constructor(x, y, dx, dy) {
        this.radius = 8;
        this.x = x || 0;
        this.y = y || 0;
        this.speed = 5;
        this.dx = dx || 5;
        this.dy = dy || -5;
        this.baseSpeed = 5;
    }
}

// メインボール
const ball = new Ball();

const bricks = {
    rows: 8,
    cols: 15,
    width: 0,
    height: 0,
    padding: 5,
    offsetTop: 80,
    offsetLeft: 0,
    colors: [],
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
    totalBricks = 0;
    
    for (let r = 0; r < bricks.rows; r++) {
        bricks.array[r] = [];
        for (let c = 0; c < bricks.cols; c++) {
            let type = 'normal';
            let hits = 1;
            let shouldCreate = true;
            
            // レベルに応じたブロック配置パターン
            if (currentLevel >= 3) {
                // レベル3以降は一部のブロックを空にする
                if (Math.random() < 0.1) {
                    shouldCreate = false;
                }
            }
            
            if (shouldCreate) {
                // 特殊ブロックの生成確率（レベルが上がるほど高くなる）
                const specialChance = Math.min(0.15 + (currentLevel - 1) * 0.05, 0.4);
                if (Math.random() < specialChance) {
                    const types = ['hard', 'bomb', 'moving'];
                    type = types[Math.floor(Math.random() * types.length)];
                    
                    if (type === 'hard') {
                        hits = Math.min(2 + Math.floor(currentLevel / 3), 3);
                    } else if (type === 'moving') {
                        hits = 1;
                    }
                }
                
                bricks.array[r][c] = { 
                    x: 0, 
                    y: 0, 
                    status: 1,
                    type: type,
                    hits: hits,
                    maxHits: hits,
                    moveDirection: Math.random() < 0.5 ? 1 : -1,
                    moveSpeed: 0.5 + (currentLevel - 1) * 0.1
                };
                
                totalBricks++;
            } else {
                bricks.array[r][c] = { 
                    x: 0, 
                    y: 0, 
                    status: 0,
                    type: 'empty',
                    hits: 0,
                    maxHits: 0,
                    moveDirection: 0,
                    moveSpeed: 0
                };
            }
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
    const theme = themes[gameSettings.theme];
    ctx.fillStyle = theme.paddle;
    
    if (gameSettings.theme === 'neon') {
        ctx.shadowBlur = 20;
        ctx.shadowColor = theme.paddle;
    }
    
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.shadowBlur = 0;
}

function drawBall() {
    const theme = themes[gameSettings.theme];
    
    // メインボールを描画
    drawSingleBall(ball, theme);
    
    // 追加ボールを描画
    balls.forEach(b => drawSingleBall(b, theme));
}

function drawSingleBall(ballObj, theme) {
    if (gameSettings.theme === 'neon') {
        ctx.shadowBlur = 15;
        ctx.shadowColor = theme.ball;
    }
    
    ctx.beginPath();
    ctx.arc(ballObj.x, ballObj.y, ballObj.radius, 0, Math.PI * 2);
    ctx.fillStyle = theme.ball;
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;
}

function drawBricks() {
    const theme = themes[gameSettings.theme];
    
    for (let r = 0; r < bricks.rows; r++) {
        for (let c = 0; c < bricks.cols; c++) {
            const brick = bricks.array[r][c];
            if (brick.status === 1) {
                let brickX = c * (bricks.width + bricks.padding) + bricks.offsetLeft;
                const brickY = r * (bricks.height + bricks.padding) + bricks.offsetTop;
                
                // 移動ブロックの処理
                if (brick.type === 'moving') {
                    brick.x += brick.moveDirection * brick.moveSpeed;
                    
                    // 画面端での反転
                    if (brick.x <= 0 || brick.x >= canvas.width - bricks.width) {
                        brick.moveDirection *= -1;
                    }
                    
                    brickX = brick.x;
                } else {
                    brick.x = brickX;
                }
                
                brick.y = brickY;
                
                // 特殊ブロック用の色設定
                let color = theme.brickColors[r];
                if (brick.type === 'hard') {
                    color = brick.hits === 2 ? '#C0C0C0' : '#808080'; // シルバー系
                } else if (brick.type === 'bomb') {
                    color = '#FF4500'; // オレンジレッド
                } else if (brick.type === 'moving') {
                    color = '#FFD700'; // ゴールド
                }
                
                if (gameSettings.theme === 'neon') {
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = color;
                }
                
                ctx.fillStyle = color;
                ctx.fillRect(brickX, brickY, bricks.width, bricks.height);
                
                if (gameSettings.theme === 'modern') {
                    // グラデーション効果
                    const gradient = ctx.createLinearGradient(brickX, brickY, brickX, brickY + bricks.height);
                    gradient.addColorStop(0, color);
                    gradient.addColorStop(1, adjustBrightness(color, -30));
                    ctx.fillStyle = gradient;
                    ctx.fillRect(brickX, brickY, bricks.width, bricks.height);
                }
                
                // 特殊ブロックの記号を描画
                if (brick.type === 'bomb') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💣', brickX + bricks.width / 2, brickY + bricks.height / 2);
                } else if (brick.type === 'hard') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(brick.hits.toString(), brickX + bricks.width / 2, brickY + bricks.height / 2);
                } else if (brick.type === 'moving') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('◆', brickX + bricks.width / 2, brickY + bricks.height / 2);
                }
                
                ctx.shadowBlur = 0;
            }
        }
    }
}

function collisionDetection() {
    // メインボールの衝突検出
    checkBallCollision(ball);
    
    // 追加ボールの衝突検出
    balls.forEach(b => checkBallCollision(b));
}

function checkBallCollision(ballObj) {
    for (let r = 0; r < bricks.rows; r++) {
        for (let c = 0; c < bricks.cols; c++) {
            const b = bricks.array[r][c];
            if (b.status === 1) {
                if (ballObj.x > b.x && ballObj.x < b.x + bricks.width &&
                    ballObj.y > b.y && ballObj.y < b.y + bricks.height) {
                    ballObj.dy = -ballObj.dy;
                    
                    // 特殊ブロックの処理
                    if (b.type === 'hard') {
                        b.hits--;
                        if (b.hits <= 0) {
                            b.status = 0;
                        }
                    } else if (b.type === 'bomb') {
                        b.status = 0;
                        explodeBomb(r, c);
                    } else {
                        b.status = 0;
                    }
                    
                    playBrickBreakSound();
                    
                    // パーティクルエフェクトを生成
                    const brickCenterX = b.x + bricks.width / 2;
                    const brickCenterY = b.y + bricks.height / 2;
                    const theme = themes[gameSettings.theme];
                    let color = theme.brickColors[r];
                    
                    if (b.type === 'hard') {
                        color = '#C0C0C0';
                    } else if (b.type === 'bomb') {
                        color = '#FF4500';
                    } else if (b.type === 'moving') {
                        color = '#FFD700';
                    }
                    
                    createParticles(brickCenterX, brickCenterY, color, 15);
                    
                    // パワーアップをドロップ
                    if (b.status === 0) {
                        createPowerUp(brickCenterX - 15, brickCenterY);
                        
                        // 統計更新
                        gameStats.totalBlocksDestroyed++;
                        updateGameStats();
                    }
                    
                    const currentTime = Date.now();
                    if (currentTime - lastBreakTime < 1000) {
                        combo++;
                        if (combo > 1) {
                            playComboSound(combo);
                        }
                    } else {
                        combo = 0;
                    }
                    lastBreakTime = currentTime;
                    
                    // スコア計算
                    let baseScore = r === 0 ? 20 : 10;
                    if (b.type === 'hard') {
                        baseScore = 25;
                    } else if (b.type === 'bomb') {
                        baseScore = 50;
                    } else if (b.type === 'moving') {
                        baseScore = 30;
                    }
                    
                    const comboMultiplier = combo > 0 ? 1.5 : 1;
                    score += Math.floor(baseScore * comboMultiplier);
                    updateScore();
                    
                    const destroyedBricks = countDestroyedBricks();
                    updateBallSpeed(destroyedBricks);
                    
                    if (destroyedBricks === totalBricks) {
                        nextLevel();
                    }
                }
            }
        }
    }
}

function explodeBomb(row, col) {
    // 爆弾の周囲3x3のブロックを破壊
    for (let r = Math.max(0, row - 1); r <= Math.min(bricks.rows - 1, row + 1); r++) {
        for (let c = Math.max(0, col - 1); c <= Math.min(bricks.cols - 1, col + 1); c++) {
            if (bricks.array[r][c].status === 1) {
                bricks.array[r][c].status = 0;
                
                // 爆発エフェクト
                const brickCenterX = bricks.array[r][c].x + bricks.width / 2;
                const brickCenterY = bricks.array[r][c].y + bricks.height / 2;
                createParticles(brickCenterX, brickCenterY, '#FF4500', 10);
                
                // 爆発スコア
                score += 15;
            }
        }
    }
    
    // 爆発音
    playSound(100, 0.3, 0.25, 'sawtooth');
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
    // メインボールの移動
    moveSingleBall(ball);
    
    // 追加ボールの移動
    for (let i = balls.length - 1; i >= 0; i--) {
        if (!moveSingleBall(balls[i])) {
            balls.splice(i, 1);
        }
    }
    
    // 全てのボールが画面外に出た場合
    if (ball.y - ball.radius > canvas.height && balls.length === 0) {
        lives--;
        updateLives();
        if (lives === 0) {
            gameOver();
        } else {
            resetBall();
        }
    }
}

function moveSingleBall(ballObj) {
    // キャッチされているボールの場合、パドルと一緒に移動
    if (caughtBall === ballObj) {
        ballObj.x = paddle.x + paddle.width / 2;
        ballObj.y = paddle.y - ballObj.radius;
        return true;
    }
    
    ballObj.x += ballObj.dx;
    ballObj.y += ballObj.dy;
    
    if (ballObj.x + ballObj.radius > canvas.width || ballObj.x - ballObj.radius < 0) {
        ballObj.dx = -ballObj.dx;
        playWallHitSound();
    }
    if (ballObj.y - ballObj.radius < 0) {
        ballObj.dy = -ballObj.dy;
        playWallHitSound();
    }
    
    if (ballObj.x > paddle.x && ballObj.x < paddle.x + paddle.width &&
        ballObj.y + ballObj.radius > paddle.y && ballObj.y - ballObj.radius < paddle.y + paddle.height) {
        
        if (activePowerUps.catch && !caughtBall) {
            // キャッチパドルの場合、ボールを捕捉
            caughtBall = ballObj;
            playSound(800, 0.2, 0.1, 'sine');
            return true;
        } else {
            // 通常の反射
            const hitPos = (ballObj.x - paddle.x) / paddle.width;
            const angle = (hitPos - 0.5) * Math.PI / 3;
            
            ballObj.dx = ballObj.speed * Math.sin(angle);
            ballObj.dy = -ballObj.speed * Math.cos(angle);
            
            playPaddleHitSound();
        }
    }
    
    // 画面外に出た場合
    if (ballObj.y - ballObj.radius > canvas.height) {
        if (caughtBall === ballObj) {
            caughtBall = null;
        }
        return false; // ボールを削除
    }
    
    return true; // ボールを保持
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height - 80;
    ball.dx = ball.speed;
    ball.dy = -ball.speed;
    paddle.x = canvas.width / 2 - paddle.width / 2;
    
    // 追加ボールをクリア
    balls.length = 0;
}

function updateScore() {
    scoreElement.textContent = `スコア: ${score}`;
}

function updateLives() {
    livesElement.textContent = `ライフ: ${lives}`;
}

function updateLevel() {
    levelElement.textContent = `レベル: ${currentLevel}`;
}

function gameOver() {
    gameState = 'over';
    stopBGM();
    
    const highScoreMsg = document.getElementById('highScoreMessage');
    if (score > 0 && isHighScore(score)) {
        addHighScore(score);
        highScoreMsg.textContent = '🏆 ハイスコア達成！';
        highScoreMsg.style.display = 'block';
        announceGameState('ハイスコア達成！ 最終スコア: ' + score);
    } else {
        highScoreMsg.style.display = 'none';
        announceGameState('ゲームオーバー。最終スコア: ' + score);
    }
    finalScoreElement.textContent = `最終スコア: ${score}`;
    gameOverDiv.style.display = 'block';
    playGameOverSound();
}

function nextLevel() {
    currentLevel++;
    
    // レベルクリアボーナス
    score += currentLevel * 100;
    updateScore();
    
    // アクセシビリティ通知
    announceGameState(`レベル ${currentLevel} に進みました`);
    
    // 短い間隔でのレベル遷移
    setTimeout(() => {
        initBricks();
        resetPositions();
        ball.x = canvas.width / 2;
        ball.y = canvas.height - 80;
        ball.dx = ball.speed;
        ball.dy = -ball.speed;
        
        // 追加ボールをクリア
        balls.length = 0;
        
        // パワーアップを一部リセット
        activePowerUps.multiball = false;
        activePowerUps.slowMotion = false;
        
        // レベルアップ音
        playLevelUpSound();
    }, 1000);
    
    // レベル10以上で最終クリア
    if (currentLevel > 10) {
        gameWin();
    }
}

function gameWin() {
    gameState = 'win';
    stopBGM();
    
    const highScoreMsg = document.getElementById('highScoreMessage');
    if (score > 0 && isHighScore(score)) {
        addHighScore(score);
        highScoreMsg.textContent = '🏆 ハイスコア達成！';
        highScoreMsg.style.display = 'block';
    } else {
        highScoreMsg.style.display = 'none';
    }
    finalScoreElement.textContent = `全レベルクリア！ 最終スコア: ${score}`;
    gameOverDiv.style.display = 'block';
    playGameWinSound();
}

function drawBackground() {
    const theme = themes[gameSettings.theme];
    
    if (theme.backgroundEffect === 'gradient') {
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#001122');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (theme.backgroundEffect === 'stars') {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 星を描画
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        for (let i = 0; i < 50; i++) {
            const x = (i * 73) % canvas.width;
            const y = (i * 91) % canvas.height;
            const size = (i % 3) + 1;
            ctx.fillRect(x, y, size, size);
        }
    } else {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function adjustBrightness(color, amount) {
    const hex = color.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.slice(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.slice(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.slice(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function draw() {
    drawBackground();
    
    if (gameState === 'playing' || gameState === 'over' || gameState === 'win') {
        drawBricks();
        drawPaddle();
        drawBall();
        drawParticles();
        drawPowerUps();
        drawLasers();
    }
    
    // デバッグ情報表示
    if (gameState === 'playing') {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.fillText(`Ball: (${Math.floor(ball.x)}, ${Math.floor(ball.y)})`, 10, canvas.height - 60);
        ctx.fillText(`Paddle: (${Math.floor(paddle.x)}, ${Math.floor(paddle.y)})`, 10, canvas.height - 40);
        ctx.fillText(`Canvas: ${canvas.width}x${canvas.height}`, 10, canvas.height - 20);
    }
    
    // レベル遷移時のメッセージ
    if (gameState === 'playing' && currentLevel > 1) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Level ${currentLevel}`, canvas.width / 2, 50);
        ctx.textAlign = 'left';
    }
}

function update() {
    if (gameState !== 'playing' || isPaused) return;
    
    moveBall();
    collisionDetection();
    updateParticles();
    updatePowerUps();
    checkPowerUpCollision();
    updateLasers();
    checkLaserCollision();
    
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
    currentLevel = 1;
    ball.speed = ball.baseSpeed;
    particles.length = 0;
    powerUps.length = 0;
    balls.length = 0;
    lasers.length = 0;
    caughtBall = null;
    
    // パワーアップをリセット
    activePowerUps = {
        multiball: false,
        paddleSize: 1.0,
        slowMotion: false,
        laser: false,
        catch: false
    };
    paddle.width = 100;
    
    updateScore();
    updateLives();
    updateLevel();
    
    // 統計更新
    gameStats.totalGames++;
    updateGameStats();
    
    // BGM開始
    playBGM();
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
        if (caughtBall) {
            // キャッチされたボールをリリース
            caughtBall.dx = caughtBall.speed * 0.5;
            caughtBall.dy = -caughtBall.speed;
            caughtBall = null;
            playSound(600, 0.1, 0.1, 'sine');
        } else {
            isPaused = !isPaused;
        }
    } else if (e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        fireLaser();
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

function showHighScores() {
    const highScoresDiv = document.getElementById('highScores');
    const highScoresList = document.getElementById('highScoresList');
    
    highScoresList.innerHTML = '';
    
    if (highScores.length === 0) {
        highScoresList.innerHTML = '<p style="text-align: center; color: #888;">まだハイスコアがありません</p>';
    } else {
        highScores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'high-score-item';
            item.innerHTML = `
                <div>
                    <span class="high-score-rank">${index + 1}.</span>
                    <span>${score.score}点</span>
                </div>
                <div style="color: #888;">${score.date}</div>
            `;
            highScoresList.appendChild(item);
        });
    }
    
    highScoresDiv.style.display = 'block';
}

function hideHighScores() {
    document.getElementById('highScores').style.display = 'none';
}

// 設定関連
function loadSettings() {
    const stored = localStorage.getItem('breakoutSettings');
    if (stored) {
        gameSettings = JSON.parse(stored);
        applyDifficulty();
    }
}

function saveSettings() {
    localStorage.setItem('breakoutSettings', JSON.stringify(gameSettings));
    hideSettings();
    applyDifficulty();
    applyAccessibilitySettings();
}

function applyDifficulty() {
    const difficulties = {
        easy: { speedMultiplier: 0.8, paddleWidthMultiplier: 1.2 },
        normal: { speedMultiplier: 1.0, paddleWidthMultiplier: 1.0 },
        hard: { speedMultiplier: 1.2, paddleWidthMultiplier: 0.8 },
        expert: { speedMultiplier: 1.5, paddleWidthMultiplier: 0.6 }
    };
    
    const diff = difficulties[gameSettings.difficulty];
    ball.baseSpeed = 5 * diff.speedMultiplier;
    ball.speed = ball.baseSpeed;
    paddle.width = 100 * diff.paddleWidthMultiplier;
}

function showSettings() {
    const settingsDiv = document.getElementById('settings');
    
    // 現在の設定を反映
    document.getElementById('difficultySelect').value = gameSettings.difficulty;
    document.getElementById('volumeSlider').value = gameSettings.volume * 100;
    document.getElementById('volumeValue').textContent = Math.round(gameSettings.volume * 100) + '%';
    document.getElementById('sensitivitySlider').value = gameSettings.sensitivity * 100;
    document.getElementById('sensitivityValue').textContent = Math.round(gameSettings.sensitivity * 100) + '%';
    document.getElementById('particleToggle').value = gameSettings.particlesEnabled ? 'on' : 'off';
    document.getElementById('themeSelect').value = gameSettings.theme;
    document.getElementById('accessibilityMode').value = gameSettings.accessibilityMode;
    
    settingsDiv.style.display = 'block';
}

function hideSettings() {
    document.getElementById('settings').style.display = 'none';
}

function updateDifficulty() {
    gameSettings.difficulty = document.getElementById('difficultySelect').value;
}

function updateVolume() {
    const value = document.getElementById('volumeSlider').value;
    gameSettings.volume = value / 100;
    document.getElementById('volumeValue').textContent = value + '%';
}

function updateSensitivity() {
    const value = document.getElementById('sensitivitySlider').value;
    gameSettings.sensitivity = value / 100;
    document.getElementById('sensitivityValue').textContent = value + '%';
    paddle.speed = 8 * gameSettings.sensitivity;
}

function updateParticles() {
    gameSettings.particlesEnabled = document.getElementById('particleToggle').value === 'on';
}

function updateTheme() {
    gameSettings.theme = document.getElementById('themeSelect').value;
}

function updateAccessibility() {
    gameSettings.accessibilityMode = document.getElementById('accessibilityMode').value;
    applyAccessibilitySettings();
}

function applyAccessibilitySettings() {
    const body = document.body;
    const gameContainer = document.getElementById('gameContainer');
    
    // 既存のアクセシビリティクラスを削除
    body.classList.remove('high-contrast', 'large-ui');
    
    switch (gameSettings.accessibilityMode) {
        case 'high-contrast':
            body.classList.add('high-contrast');
            break;
        case 'large-ui':
            body.classList.add('large-ui');
            break;
    }
}

// 音声でのゲーム状態通知
function announceGameState(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

function showAchievements() {
    const achievementsDiv = document.getElementById('achievements');
    const achievementsList = document.getElementById('achievementsList');
    const statsDisplay = document.getElementById('statsDisplay');
    
    achievementsList.innerHTML = '';
    
    achievementDefinitions.forEach(def => {
        const item = document.createElement('div');
        const isUnlocked = achievements.includes(def.id);
        
        item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
        item.innerHTML = `
            <div class="achievement-icon">${isUnlocked ? def.icon : '🔒'}</div>
            <div class="achievement-info">
                <div class="achievement-name">${def.name}</div>
                <div class="achievement-description">${def.description}</div>
            </div>
        `;
        
        achievementsList.appendChild(item);
    });
    
    // 統計情報を表示
    const playTimeMinutes = Math.floor(gameStats.totalPlayTime / 60000);
    const playTimeSeconds = Math.floor((gameStats.totalPlayTime % 60000) / 1000);
    
    statsDisplay.innerHTML = `
        <p>総スコア: ${gameStats.totalScore.toLocaleString()}</p>
        <p>破壊したブロック: ${gameStats.totalBlocksDestroyed}</p>
        <p>最大コンボ: ${gameStats.maxCombo}</p>
        <p>到達レベル: ${gameStats.levelReached}</p>
        <p>パワーアップ取得数: ${gameStats.powerUpsCollected}</p>
        <p>プレイ回数: ${gameStats.totalGames}</p>
        <p>総プレイ時間: ${playTimeMinutes}分${playTimeSeconds}秒</p>
        <p>実績達成率: ${achievements.length}/${achievementDefinitions.length} (${Math.round(achievements.length / achievementDefinitions.length * 100)}%)</p>
    `;
    
    achievementsDiv.style.display = 'block';
}

function hideAchievements() {
    document.getElementById('achievements').style.display = 'none';
}

window.onload = () => {
    initAudio();
    loadHighScores();
    loadSettings();
    loadAchievements();
    applyAccessibilitySettings();
    resizeCanvas();
    initBricks();
    resetPositions();
    gameStartDiv.style.display = 'block';
    gameLoop();
};