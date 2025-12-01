// game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const scoreBoard = document.querySelector('.score-board'); 
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const pauseButton = document.getElementById('pauseButton');
const gameMessage = document.getElementById('gameMessage');
const loadingMessage = document.getElementById('loadingMessage'); 

// --- 游戏状态变量 ---
let score = 0;
let basketX = canvas.width / 2 - 50; 
const basketWidth = 100;
const basketHeight = 60;
const basketY = canvas.height - basketHeight - 20; 
const basketSpeed = 10;
let basketExpression = 'happy'; 

let fruits = []; 
const fruitSize = 40;
const fruitSpeed = 3;
const fruitSpawnInterval = 1000; 
let lastFruitSpawnTime = 0;

let gameRunning = false;
let gamePaused = false; 
let animationFrameId; 
let keysPressed = {}; 

// --- 游戏结束分数界限 ---
const WIN_SCORE = 200;
const LOSE_SCORE = -100;
// ---

// --- 图片资源管理 ---
let imagesLoaded = 0;
const totalImages = 11; 
const gameImages = {}; 

const imagePaths = {
    background: 'assets/background.png', 
    basket_happy: 'assets/basket_happy.png',
    basket_sad: 'assets/basket_sad.png',
    apple_fresh: 'assets/apple_fresh.png',
    apple_spoiled: 'assets/apple_spoiled.png',
    orange_fresh: 'assets/orange_fresh.png',
    orange_spoiled: 'assets/orange_spoiled.png',
    broccoli_fresh: 'assets/broccoli_fresh.png',
    broccoli_spoiled: 'assets/broccoli_spoiled.png',
    tomato_fresh: 'assets/tomato_fresh.png',
    tomato_spoiled: 'assets/tomato_spoiled.png',
};

const fruitTypes = [
    { name: 'apple', width: fruitSize, height: fruitSize },
    { name: 'orange', width: fruitSize, height: fruitSize },
    { name: 'broccoli', width: fruitSize, height: fruitSize },
    { name: 'tomato', width: fruitSize, height: fruitSize },
];

function loadImages(callback) {
    loadingMessage.textContent = "正在加载美术素材...";
    
    for (const key in imagePaths) {
        gameImages[key] = new Image();
        gameImages[key].onload = () => {
            imagesLoaded++;
            loadingMessage.textContent = `正在加载... (${imagesLoaded}/${totalImages})`;
            if (imagesLoaded === totalImages) {
                callback(); 
            }
        };
        gameImages[key].onerror = () => {
             console.warn(`图片加载失败: ${imagePaths[key]}. 将使用后备绘制。`);
             imagesLoaded++;
             if (imagesLoaded === totalImages) {
                callback();
            }
        };
        gameImages[key].src = imagePaths[key];
    }
}


// --- 绘制函数 (使用图片) ---

function drawBackground() {
    if (gameImages.background && gameImages.background.complete) {
        ctx.drawImage(gameImages.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#eafaea'; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawBasket() {
    let img;
    const imgKey = `basket_${basketExpression}`;

    if (gameImages[imgKey] && gameImages[imgKey].complete) {
        img = gameImages[imgKey];
    } else {
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(basketX, basketY, basketWidth, basketHeight);
        return; 
    }
    
    ctx.drawImage(img, basketX, basketY, basketWidth, basketHeight);
}

function drawFruit(fruit) {
    let imgKey;
    if (fruit.isFresh) {
        imgKey = fruit.type.name + '_fresh';
    } else {
        imgKey = fruit.type.name + '_spoiled';
    }

    const img = gameImages[imgKey];

    if (img && img.complete) {
        ctx.drawImage(img, fruit.x, fruit.y, fruit.width, fruit.height);
    } else {
        const color = fruit.isFresh ? 'green' : 'brown';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(fruit.x + fruitSize / 2, fruit.y + fruitSize / 2, fruitSize / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}


// --- 游戏结束函数 ---
function gameOver(message) {
    gameRunning = false;
    cancelAnimationFrame(animationFrameId);
    
    gameMessage.textContent = "游戏结束！" + message;
    restartButton.style.display = 'inline-block';
    pauseButton.style.display = 'none';
    
    // 清空屏幕上的果蔬
    fruits = []; 
}


// --- 游戏循环和逻辑 ---
function spawnFruit() {
    const randomType = fruitTypes[Math.floor(Math.random() * fruitTypes.length)];
    const randomX = Math.random() * (canvas.width - randomType.width);
    const isFresh = Math.random() > 0.3; 

    fruits.push({
        x: randomX,
        y: -randomType.height,
        type: randomType,
        isFresh: isFresh,
        width: randomType.width,
        height: randomType.height,
    });
}

function update() {
    if (!gameRunning || gamePaused) return;

    // 键盘移动逻辑
    if (keysPressed['ArrowLeft'] || keysPressed['a']) {
        basketX -= basketSpeed;
    }
    if (keysPressed['ArrowRight'] || keysPressed['d']) {
        basketX += basketSpeed;
    }

    // 限制篮子范围
    if (basketX < 0) basketX = 0;
    if (basketX > canvas.width - basketWidth) basketX = canvas.width - basketWidth;

    // 生成果蔬
    const currentTime = Date.now();
    if (currentTime - lastFruitSpawnTime > fruitSpawnInterval) {
        spawnFruit();
        lastFruitSpawnTime = currentTime;
    }

    // 更新位置和碰撞检测
    for (let i = fruits.length - 1; i >= 0; i--) {
        const fruit = fruits[i];
        fruit.y += fruitSpeed;

        // 碰撞检测：果蔬是否落入篮子
        if (fruit.y + fruit.height > basketY &&
            fruit.y < basketY + basketHeight &&
            fruit.x + fruit.width > basketX + 10 && 
            fruit.x < basketX + basketWidth - 10) {

            if (fruit.isFresh) {
                score += 10;
                basketExpression = 'happy';
                gameMessage.textContent = "👍 新鲜！+10分！";
            } else {
                score -= 20;
                basketExpression = 'sad';
                gameMessage.textContent = "👎 腐烂！-20分！";
            }
            scoreDisplay.textContent = score;

            // --- 新增：游戏结束检查 ---
            if (score >= WIN_SCORE) {
                gameOver("恭喜！你真是养鲜王者！");
                return; 
            }
            if (score <= LOSE_SCORE) {
                gameOver("失败！养鲜新手再接再厉");
                return; 
            }
            // ---

            fruits.splice(i, 1);

            // 短暂的表情和消息持续时间
            setTimeout(() => {
                // 确保只有在游戏运行时才清空消息（避免覆盖 Game Over 消息）
                if (gameRunning) {
                   basketExpression = 'happy'; 
                   gameMessage.textContent = "";
                }
            }, 500); 
        }

        // 果蔬掉出屏幕
        if (fruit.y > canvas.height) {
            fruits.splice(i, 1);
        }
    }
}

function gameLoop() {
    if (!gameRunning || gamePaused) return;

    update();
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    drawBasket();
    fruits.forEach(drawFruit);
    
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- 游戏控制函数 ---

function startGame() {
    startScreen.style.display = 'none';
    scoreBoard.style.display = 'block'; 
    gameMessage.style.display = 'block';
    
    score = 0;
    scoreDisplay.textContent = score;
    fruits = [];
    basketX = canvas.width / 2 - 50;
    basketExpression = 'happy';
    gameRunning = true;
    gamePaused = false;
    gameMessage.textContent = "";
    restartButton.style.display = 'none';
    pauseButton.style.display = 'inline-block';
    pauseButton.textContent = '暂停';

    lastFruitSpawnTime = Date.now();
    gameLoop();
}

function pauseGame() {
    if (gamePaused) {
        gamePaused = false;
        pauseButton.textContent = '暂停';
        gameLoop(); 
        gameMessage.textContent = "";
    } else {
        gamePaused = true;
        pauseButton.textContent = '继续';
        cancelAnimationFrame(animationFrameId); 
        gameMessage.textContent = "⏸️ 游戏暂停";
    }
}

function restartGame() {
    // 重启时，回到开始界面，让玩家重新点击开始
    cancelAnimationFrame(animationFrameId); 
    startScreen.style.display = 'flex'; 
    scoreBoard.style.display = 'none';
    restartButton.style.display = 'none';
    pauseButton.style.display = 'none';
    gameMessage.textContent = "";
    gameRunning = false;
}


// --- 事件监听器 ---

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'arrowright' || key === 'a' || key === 'd') {
        keysPressed[e.key] = true;
    }
    if (e.key === ' ' && gameRunning) {
        e.preventDefault(); 
        pauseGame();
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'arrowleft' || key === 'arrowright' || key === 'a' || key === 'd') {
        keysPressed[e.key] = false;
    }
});

startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
pauseButton.addEventListener('click', pauseGame);

// --- 游戏启动逻辑 ---
loadImages(() => {
    loadingMessage.style.display = 'none';
    startButton.style.visibility = 'visible'; 
    startScreen.style.display = 'flex';
    scoreBoard.style.display = 'none';
    drawBackground(); 
});

startButton.style.visibility = 'hidden';
startScreen.style.display = 'flex';

scoreBoard.style.display = 'none';
