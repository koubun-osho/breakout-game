# Google ATARI Breakout 正式仕様書 v3.0

## 1. ChatGPT仕様書に基づく正確な仕様

### 重要な修正事項

#### 現在の実装との相違点
| 項目 | 現在の実装 | 正式仕様 | 修正内容 |
|------|------------|----------|----------|
| 初期ライフ | 3回 | **4回** | ライフを1つ増加 |
| パドル幅 | 画面の15-22% | **10%** | より細いパドルに修正 |
| パドル高さ | 12-16px | **1%のCanvas高** | レスポンシブな高さ |
| ボール半径 | 6-9px | **6px（HDPI:8px）** | デバイス解像度対応 |
| ブロック配置 | 8×15 | **5-6段×14列** | より少ない段数 |
| 背景色 | #000000 | **#001327** | 濃紺背景 |
| 初期速度 | 3.5 | **300px/s** | 物理単位での指定 |

## 2. 正式仕様詳細

### 2.1 ゲーム概要
```javascript
const gameConfig = {
    // 基本設定
    initialLives: 4,                    // 初期ライフ数
    backgroundColor: '#001327',         // 濃紺背景
    stageClearBonus: 500,              // ステージクリアボーナス
    brickScore: 100,                   // ブロック1個のスコア
    
    // ループ設定
    infiniteLoop: true,                // 全消し後即リスタート
    frameRate: 60,                     // 60FPS維持
    
    // レイアウト
    aspectRatio: '16:9',               // 推奨アスペクト比
    responsive: true                   // レスポンシブ対応
};
```

### 2.2 パドル仕様（正確版）
```javascript
const paddleSpec = {
    // サイズ（正式仕様）
    width: {
        ratio: 0.10,                   // Canvas幅の10%
        calculation: 'canvas.width * 0.10'
    },
    height: {
        ratio: 0.01,                   // Canvas高の1%
        calculation: 'canvas.height * 0.01',
        minimum: 8                     // 最小高さ保証
    },
    
    // 操作性
    movement: {
        mouseTracking: true,           // マウス追従
        keyboardSpeed: 8,              // ←→キー移動速度（8px/frame）
        smoothing: 0,                  // スムージングなし
        wallClamp: true                // 壁でクランプ
    },
    
    // 反射角度制御（重要）
    reflection: {
        formula: '150° - (hitPos * 120°)',
        angleRange: {
            center: 90,                // 中央ヒット時
            leftEdge: 150,             // 左端ヒット時
            rightEdge: 30              // 右端ヒット時
        }
    },
    
    // 見た目
    style: {
        color: '#FFFFFF',
        shape: 'rectangle',
        border: 'none',
        shadow: false
    }
};
```

### 2.3 ボール仕様（正確版）
```javascript
const ballSpec = {
    // サイズ
    radius: {
        standard: 6,                   // 標準解像度
        hdpi: 8,                       // 高解像度
        detection: 'window.devicePixelRatio > 1.5'
    },
    
    // 速度システム
    speed: {
        initial: 300,                  // 初期速度 300px/s
        maximum: 800,                  // 最大速度 800px/s
        increment: {
            trigger: 10,               // 10個破壊ごと
            rate: 0.05,                // +5%増加
            formula: 'speed *= 1.05'
        }
    },
    
    // 物理特性
    physics: {
        initialAngle: '±45°',          // 初期角度ランダム
        reflection: 'mirror',          // 鏡面反射
        restitution: 1.0,              // 完全弾性
        gravityEffect: false           // 重力なし
    },
    
    // 見た目
    style: {
        color: '#FFFFFF',
        shape: 'circle',
        glow: false,
        trail: false
    }
};
```

### 2.4 ブロック仕様（正確版）
```javascript
const brickSpec = {
    // 配置
    layout: {
        rows: {
            desktop: 6,                // デスクトップ：6段
            mobile: 4,                 // モバイル：4段
            adaptive: true
        },
        columns: 14,                   // 固定14列
        gap: 2,                        // ブロック間隔
        
        // マージン
        margin: {
            top: 60,
            sides: 20,
            calculation: 'auto-fit'
        }
    },
    
    // サイズ計算
    sizing: {
        width: '(canvas.width - margins) / 14',
        height: 'width / 2.5',        // アスペクト比
        minWidth: 40,
        minHeight: 16
    },
    
    // 見た目（Google Images風）
    appearance: {
        // 虹色グラデーション（行ごと）
        colors: [
            '#FF4444',  // 1段目：赤
            '#FF8844',  // 2段目：オレンジ
            '#FFFF44',  // 3段目：黄
            '#44FF44',  // 4段目：緑
            '#44FFFF',  // 5段目：シアン
            '#4444FF'   // 6段目：青
        ],
        border: '1px solid #666',
        imageOverlay: false,           // 画像オーバーレイは著作権で避ける
        pattern: 'solid'
    },
    
    // ゲーム特性
    durability: 1,                     // 1ヒットで破壊
    score: 100,                        // 1個100点
    specialBlocks: false               // 特殊ブロックなし
};
```

### 2.5 サウンド仕様（正確版）
```javascript
const soundSpec = {
    // 効果音ファイル
    soundEffects: {
        paddleHit: {
            file: 'PaddleHit.wav',
            frequency: 400,            // より低めの音
            duration: 0.1,
            volume: 0.6,
            type: 'sine'
        },
        brickHit: {
            file: 'BrickHit.wav',
            frequency: 800,            // クリアな高音
            duration: 0.15,
            volume: 0.7,
            type: 'square'
        },
        wallHit: {
            file: 'WallHit.wav',
            frequency: 300,            // 低い反響音
            duration: 0.08,
            volume: 0.4,
            type: 'triangle'
        },
        lifeLost: {
            file: 'LifeLost.wav',
            frequency: [200, 150, 100], // 下降3音
            duration: 0.8,
            volume: 0.8,
            type: 'sawtooth'
        },
        gameOver: {
            file: 'GameOver.wav',
            frequency: [100, 80, 60],   // さらに下降
            duration: 1.2,
            volume: 0.9,
            type: 'square'
        }
    },
    
    // BGM
    backgroundMusic: {
        enabled: false,                // BGMは使用しない
        file: null,
        loop: false
    },
    
    // 音声制御
    controls: {
        muteButton: true,
        volumeSlider: false,
        masterVolume: 0.7
    }
};
```

### 2.6 UI/UX仕様（正確版）
```javascript
const uiSpec = {
    // HUD配置
    hud: {
        position: 'top',
        elements: {
            score: {
                label: 'Score',
                format: 'number',
                position: 'top-left'
            },
            highScore: {
                label: 'High Score',
                format: 'number',
                position: 'top-center'
            },
            lives: {
                symbol: '💙',
                count: 4,
                position: 'top-right'
            }
        },
        style: {
            font: 'Arial, sans-serif',
            fontSize: '18px',
            color: '#FFFFFF',
            background: 'transparent'
        }
    },
    
    // スタート画面
    startScreen: {
        title: {
            text: 'BREAKOUT',
            font: {
                family: 'Arial Black',
                size: '4rem',
                weight: 'bold',
                color: '#FFFFFF'
            },
            animation: 'glow',
            position: 'center-top'
        },
        
        startButton: {
            text: 'START GAME',
            style: {
                width: '200px',
                height: '50px',
                fontSize: '1.2rem',
                backgroundColor: '#4CAF50',
                color: '#FFFFFF',
                border: '2px solid #FFFFFF',
                borderRadius: '5px',
                cursor: 'pointer'
            },
            position: 'center'
        },
        
        instructions: {
            text: 'マウスでパドルを操作\nブロックを全て破壊しよう！',
            font: {
                family: 'Arial',
                size: '1rem',
                color: '#CCCCCC'
            },
            position: 'center-bottom'
        }
    },
    
    // ゲームオーバー画面
    gameOverScreen: {
        title: 'GAME OVER',
        finalScore: true,
        highScore: true,
        retryButton: true,
        shareButton: {
            enabled: true,
            platform: 'twitter',
            text: 'I scored {score} points in Breakout!'
        }
    }
};
```

### 2.7 ゲームフロー（ステートマシン）
```javascript
const gameFlow = {
    states: {
        INIT: {
            description: 'アセット読込',
            next: 'READY',
            duration: 'until_loaded'
        },
        READY: {
            description: '3-2-1カウントダウン',
            next: 'PLAY',
            duration: 3000,
            countdown: true
        },
        PLAY: {
            description: '通常プレイ状態',
            next: ['STAGE_CLEAR', 'LIFE_LOST'],
            conditions: {
                STAGE_CLEAR: 'all_bricks_destroyed',
                LIFE_LOST: 'ball_fell_down'
            }
        },
        STAGE_CLEAR: {
            description: '全ブロック破壊',
            next: 'READY',
            actions: [
                'add_bonus_score',
                'regenerate_bricks',
                'reset_ball_position'
            ]
        },
        LIFE_LOST: {
            description: 'ボール落下',
            next: ['READY', 'GAME_OVER'],
            conditions: {
                READY: 'lives > 0',
                GAME_OVER: 'lives === 0'
            },
            actions: ['decrease_life', 'reset_ball_position']
        },
        GAME_OVER: {
            description: 'ゲーム終了',
            next: 'INIT',
            actions: [
                'save_high_score',
                'show_final_score',
                'show_retry_button'
            ]
        }
    },
    
    // 遷移条件
    transitions: {
        automatic: true,
        userInput: ['start', 'retry', 'pause'],
        gameEvents: ['brick_destroyed', 'ball_lost', 'stage_clear']
    }
};
```

## 3. 実装優先順位（正式版）

### Phase 1: 基本仕様の正確な実装
1. **ライフ数を3→4に変更**
2. **パドル幅をCanvas幅の10%に修正**
3. **パドル高さをCanvas高の1%に修正**
4. **ボール半径を6px（HDPI:8px）に調整**
5. **ブロック配置を5-6段×14列に変更**
6. **背景色を#001327に変更**
7. **初期速度を300px/sに設定**

### Phase 2: 物理演算の正確な実装
1. **パドル反射角度の正確な計算式実装**
2. **速度増加システム（10個破壊ごと+5%）**
3. **最大速度制限（800px/s）**
4. **HDPI対応のボールサイズ**

### Phase 3: ゲームフローの完全実装
1. **ステートマシンの実装**
2. **3-2-1カウントダウン**
3. **ステージクリアボーナス（+500点）**
4. **無限ループシステム**

### Phase 4: UI/UXの最終調整
1. **正確なHUDレイアウト**
2. **リッチなスタート画面**
3. **ゲームオーバー画面の改善**
4. **シェア機能の実装**

## 4. 技術実装詳細

### 4.1 正確なパドル反射計算
```javascript
function calculatePaddleReflection(ball, paddle, hitPos) {
    // hitPos: -1.0 (左端) ～ 1.0 (右端)
    const angle = 150 - (hitPos * 120); // 度数
    const radians = (angle * Math.PI) / 180;
    
    ball.dx = Math.cos(radians) * ball.speed;
    ball.dy = -Math.sin(radians) * ball.speed;
}
```

### 4.2 速度増加システム
```javascript
function updateBallSpeed(bricksDestroyed) {
    const speedIncreaseInterval = 10;
    const increaseRate = 1.05; // +5%
    const maxSpeed = 800;
    
    if (bricksDestroyed % speedIncreaseInterval === 0) {
        ball.speed = Math.min(ball.speed * increaseRate, maxSpeed);
    }
}
```

### 4.3 HDPI対応
```javascript
function getBallRadius() {
    const isHDPI = window.devicePixelRatio > 1.5;
    return isHDPI ? 8 : 6;
}
```

### 4.4 レスポンシブ計算
```javascript
function calculateGameObjectSizes() {
    // パドル
    paddle.width = canvas.width * 0.10;
    paddle.height = Math.max(canvas.height * 0.01, 8);
    
    // ブロック
    const cols = 14;
    const margin = 40;
    brick.width = (canvas.width - margin) / cols;
    brick.height = brick.width / 2.5;
}
```

## 5. 期待される完全再現効果

### 操作感の完全一致
1. **正確なパドルサイズによる本物同様の操作感**
2. **物理単位での速度管理による一貫した動き**
3. **正確な反射角度による戦略的プレイ**

### ゲームバランスの再現
1. **4ライフによる適切な難易度**
2. **段階的速度上昇による緊張感**
3. **無限ループによる継続的な挑戦**

### 視覚体験の一致
1. **濃紺背景による本物の雰囲気**
2. **正確なブロック配置による視覚バランス**
3. **適切なオブジェクトサイズによる見やすさ**

この正式仕様書v3.0により、Google ATARI Breakoutの完全再現が可能になります。