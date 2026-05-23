const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

// ----------------------------
// GAME STATE
// ----------------------------
let gameState = "home";

let currentLevel = 0;
let levelCompleteFlag = false; // 🔥 renamed to avoid conflict

let playerId = localStorage.getItem("playerId");
let unlockedLevel = parseInt(localStorage.getItem("unlockedLevel")) || 1;

// sync with global window values
setInterval(() => {
    if (window.playerId) playerId = window.playerId;
    if (window.unlockedLevel) unlockedLevel = window.unlockedLevel;
}, 100);

// ----------------------------
// SOCKET
// ----------------------------
const socket = io();

socket.on("userJoined", (username) => {
    console.log(username + " joined the game");
});

socket.on("levelUpdate", (data) => {
    console.log("Level update:", data);
});

// ----------------------------
// PLAYER
// ----------------------------
let player = {
    x: 50,
    y: 300,
    width: 30,
    height: 32,
    dx: 0,
    dy: 0,
    gravity: 0.5,
    jumpPower: -10
};

// ----------------------------
// LEVEL DATA
// ----------------------------
let platforms = [];
let gate = {};

// ----------------------------
// BUTTONS
// ----------------------------
let playButton = { x: 300, y: 150, width: 200, height: 50 };
let loginButton = { x: 300, y: 220, width: 200, height: 50 };

let level1Button = { x: 300, y: 150, width: 200, height: 50 };
let level2Button = { x: 300, y: 220, width: 200, height: 50 };
let level3Button = { x: 300, y: 290, width: 200, height: 50 };

let homeButton = { x: 20, y: 20, width: 100, height: 40 };

// ----------------------------
// LOAD LEVEL
// ----------------------------
function loadLevel(levelIndex) {
    currentLevel = levelIndex;
    platforms = levels[levelIndex].platforms;
    gate = levels[levelIndex].gate;
    resetPlayer();
}

// ----------------------------
// RESET PLAYER
// ----------------------------
function resetPlayer() {
    player.x = 50;
    player.y = 300;
    player.dx = 0;
    player.dy = 0;
    levelCompleteFlag = false;
}

// ----------------------------
// KEYBOARD
// ----------------------------
document.addEventListener("keydown", (e) => {
    if (gameState !== "playing" || levelCompleteFlag) return;

    if (e.code === "ArrowRight") player.dx = 5;
    if (e.code === "ArrowLeft") player.dx = -5;

    if (e.code === "Space" && player.dy === 0) {
        player.dy = player.jumpPower;
    }
});

document.addEventListener("keyup", (e) => {
    if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        player.dx = 0;
    }
});

// ----------------------------
// MOUSE CLICK
// ----------------------------
canvas.addEventListener("click", (e) => {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;

    if (gameState === "home") {
        if (
            mouseX > playButton.x &&
            mouseX < playButton.x + playButton.width &&
            mouseY > playButton.y &&
            mouseY < playButton.y + playButton.height
        ) {
            gameState = "levels";
        }

        if (
            mouseX > loginButton.x &&
            mouseX < loginButton.x + loginButton.width &&
            mouseY > loginButton.y &&
            mouseY < loginButton.y + loginButton.height
        ) {
            document.getElementById("loginUI").style.display = "block";
        }
    }

    else if (gameState === "levels") {

        if (mouseX > homeButton.x && mouseX < homeButton.x + homeButton.width &&
            mouseY > homeButton.y && mouseY < homeButton.y + homeButton.height) {
            gameState = "home";
        }

        if (mouseX > level1Button.x && mouseX < level1Button.x + level1Button.width &&
            mouseY > level1Button.y && mouseY < level1Button.y + level1Button.height) {
            loadLevel(0);
            gameState = "playing";
        }

        if (unlockedLevel >= 2 &&
            mouseX > level2Button.x && mouseX < level2Button.x + level2Button.width &&
            mouseY > level2Button.y && mouseY < level2Button.y + level2Button.height) {
            loadLevel(1);
            gameState = "playing";
        }

        if (unlockedLevel >= 3 &&
            mouseX > level3Button.x && mouseX < level3Button.x + level3Button.width &&
            mouseY > level3Button.y && mouseY < level3Button.y + level3Button.height) {
            loadLevel(2);
            gameState = "playing";
        }
    }
});

// ----------------------------
// UPDATE PLAYER
// ----------------------------
function updatePlayer() {

    if (levelCompleteFlag) return;

    player.dy += player.gravity;
    player.x += player.dx;
    player.y += player.dy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }

    platforms.forEach(p => {
        if (
            player.x < p.x + p.width &&
            player.x + player.width > p.x &&
            player.y + player.height <= p.y + player.dy &&
            player.y + player.height + player.dy >= p.y
        ) {
            player.y = p.y - player.height;
            player.dy = 0;
        }
    });

    // ----------------------------
    // GATE COLLISION
    // ----------------------------
    if (
        player.x < gate.x + gate.width &&
        player.x + player.width > gate.x &&
        player.y < gate.y + gate.height &&
        player.y + player.height > gate.y
    ) {

        levelCompleteFlag = true;

        player.dx = 0;
        player.dy = 0;

        // 🔥 SAVE PROGRESS
        if (playerId !== null) {

            const newLevel = currentLevel + 2;

fetch("/api/save-progress", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",

        // 🔥 STEP 4 (JWT HEADER)
        Authorization: "Bearer " + localStorage.getItem("token")
    },
    body: JSON.stringify({
        playerId,
        unlockedLevel: newLevel
    })
})
.then(res => res.json())
.then(data => {
    console.log("Progress saved:", data);

    // 🔥 FIX: update BOTH values

    localStorage.setItem("unlockedLevel", newLevel);
unlockedLevel = newLevel;
});

            socket.emit("levelComplete", {
                playerId,
                level: currentLevel
            });
        }

        setTimeout(() => {
            gameState = "levels";
        }, 1500);
    }
}

// ----------------------------
// DRAW PLAYER
// ----------------------------
function drawPlayer() {
    let x = player.x;
    let y = player.y;

    ctx.fillStyle = "white";

    ctx.beginPath();
    ctx.arc(x + 15, y + 6, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillRect(x + 12, y + 12, 6, 12);

    ctx.fillRect(x + 5, y + 14, 7, 3);
    ctx.fillRect(x + 18, y + 14, 7, 3);

    ctx.fillRect(x + 10, y + 24, 4, 8);
    ctx.fillRect(x + 16, y + 24, 4, 8);
}

// ----------------------------
// DRAW FUNCTIONS
// ----------------------------
function drawPlatforms() {
    ctx.fillStyle = "gray";
    platforms.forEach(p => {
        ctx.fillRect(p.x, p.y, p.width, p.height);
    });
}

function drawGate() {
    ctx.fillStyle = "green";
    ctx.fillRect(gate.x, gate.y, gate.width, gate.height);
}

// ----------------------------
// SCREENS
// ----------------------------
function drawHome() {
    ctx.fillStyle = "white";
    ctx.font = "50px Arial";
    ctx.fillText("LEVEL DEVIL", 230, 100);

    ctx.fillStyle = "gray";
    ctx.fillRect(playButton.x, playButton.y, playButton.width, playButton.height);
    ctx.fillRect(loginButton.x, loginButton.y, loginButton.width, loginButton.height);

    ctx.fillStyle = "black";
    ctx.font = "25px Arial";

    ctx.fillText("PLAY", 370, 185);
    ctx.fillText("LOGIN", 360, 255);
}

function drawLevels() {
    ctx.fillStyle = "white";
    ctx.font = "40px Arial";
    ctx.fillText("SELECT LEVEL", 240, 90);

    ctx.fillStyle = "gray";
    ctx.fillRect(level1Button.x, level1Button.y, level1Button.width, level1Button.height);

    ctx.fillStyle = unlockedLevel >= 2 ? "gray" : "darkred";
    ctx.fillRect(level2Button.x, level2Button.y, level2Button.width, level2Button.height);

    ctx.fillStyle = unlockedLevel >= 3 ? "gray" : "darkred";
    ctx.fillRect(level3Button.x, level3Button.y, level3Button.width, level3Button.height);

    ctx.fillStyle = "black";
    ctx.font = "25px Arial";

    ctx.fillText("LEVEL 1", 350, 180);
    ctx.fillText("LEVEL 2", 350, 250);
    ctx.fillText("LEVEL 3", 350, 320);
}

// ----------------------------
// GAME LOOP
// ----------------------------
function gameLoop() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gameState === "home") {
        drawHome();
    }
    else if (gameState === "levels") {
        drawLevels();
    }
    else if (gameState === "playing") {

        updatePlayer();

        drawPlatforms();
        drawGate();
        drawPlayer();

        if (levelCompleteFlag) {
            ctx.fillStyle = "yellow";
            ctx.font = "40px Arial";
            ctx.fillText("LEVEL COMPLETE!", 210, 200);
        }
    }

    requestAnimationFrame(gameLoop);
}

gameLoop();