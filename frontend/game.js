const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 800;
canvas.height = 400;

let gameState = "home";

let currentLevel = 0;
let unlockedLevel = 1;
let levelComplete = false;

let playerId = null;


// PLAYER
let player = {
x:50,
y:300,
width:30,
height:32,
dx:0,
dy:0,
gravity:0.5,
jumpPower:-10
};


// LEVEL DATA
let platforms = [];
let gate = {};


// BUTTONS
let playButton = {x:300,y:150,width:200,height:50};
let loginButton = {x:300,y:220,width:200,height:50};

let level1Button = {x:300,y:150,width:200,height:50};
let level2Button = {x:300,y:220,width:200,height:50};
let level3Button = {x:300,y:290,width:200,height:50};

let homeButton = {x:20,y:20,width:100,height:40};


// ---------------------
// LOGIN FUNCTION
// ---------------------
function login(){

let username = document.getElementById("username").value;
let password = document.getElementById("password").value;

fetch("/api/login",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
username:username,
password:password
})
})
.then(res=>res.json())
.then(data=>{

if(data.error){

alert("Login failed");

}else{

playerId = data.id;

loadProgress();

alert("Login successful");

document.getElementById("loginUI").style.display="none";

}

});

}


// ---------------------
// LOAD PROGRESS
// ---------------------
function loadProgress(){

fetch("/api/load-progress/"+playerId)
.then(res=>res.json())
.then(data=>{

unlockedLevel = data.unlockedLevel;

});

}


// ---------------------
// SAVE PROGRESS
// ---------------------
function saveProgress(){

fetch("/api/save-progress",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
playerId:playerId,
unlockedLevel:unlockedLevel
})
});

}



// ---------------------
// LOAD LEVEL
// ---------------------
function loadLevel(levelIndex){

currentLevel = levelIndex;

platforms = levels[levelIndex].platforms;
gate = levels[levelIndex].gate;

resetPlayer();

}


function resetPlayer(){

player.x = 50;
player.y = 300;
player.dx = 0;
player.dy = 0;

levelComplete = false;

}


// ---------------------
// KEYBOARD
// ---------------------
document.addEventListener("keydown",function(e){

if(gameState !== "playing" || levelComplete) return;

if(e.code === "ArrowRight") player.dx = 5;
if(e.code === "ArrowLeft") player.dx = -5;

if(e.code === "Space" && player.dy === 0){
player.dy = player.jumpPower;
}

});

document.addEventListener("keyup",function(e){

if(e.code === "ArrowRight" || e.code === "ArrowLeft"){
player.dx = 0;
}

});



// ---------------------
// MOUSE
// ---------------------
canvas.addEventListener("click",function(e){

let rect = canvas.getBoundingClientRect();
let mouseX = e.clientX - rect.left;
let mouseY = e.clientY - rect.top;


// HOME
if(gameState === "home"){

if(mouseX > playButton.x && mouseX < playButton.x + playButton.width &&
mouseY > playButton.y && mouseY < playButton.y + playButton.height){

gameState = "levels";

}

if(mouseX > loginButton.x && mouseX < loginButton.x + loginButton.width &&
mouseY > loginButton.y && mouseY < loginButton.y + loginButton.height){

document.getElementById("loginUI").style.display="block";

}

}


// LEVEL SELECT
else if(gameState === "levels"){

if(mouseX > homeButton.x && mouseX < homeButton.x + homeButton.width &&
mouseY > homeButton.y && mouseY < homeButton.y + homeButton.height){

gameState = "home";

}

// LEVEL 1
if(mouseX > level1Button.x && mouseX < level1Button.x + level1Button.width &&
mouseY > level1Button.y && mouseY < level1Button.y + level1Button.height){

loadLevel(0);
gameState = "playing";

}

// LEVEL 2 LOCK
if(unlockedLevel >= 2 &&
mouseX > level2Button.x && mouseX < level2Button.x + level2Button.width &&
mouseY > level2Button.y && mouseY < level2Button.y + level2Button.height){

loadLevel(1);
gameState = "playing";

}

// LEVEL 3 LOCK
if(unlockedLevel >= 3 &&
mouseX > level3Button.x && mouseX < level3Button.x + level3Button.width &&
mouseY > level3Button.y && mouseY < level3Button.y + level3Button.height){

loadLevel(2);
gameState = "playing";

}

}

});



// ---------------------
// PLAYER UPDATE
// ---------------------
function updatePlayer(){

if(levelComplete) return;

player.dy += player.gravity;

player.x += player.dx;
player.y += player.dy;


// SCREEN LIMIT
if(player.x < 0) player.x = 0;

if(player.x + player.width > canvas.width)
player.x = canvas.width - player.width;


// PLATFORM COLLISION
platforms.forEach(platform => {

if(
player.x < platform.x + platform.width &&
player.x + player.width > platform.x &&
player.y + player.height <= platform.y + player.dy &&
player.y + player.height + player.dy >= platform.y
){
player.y = platform.y - player.height;
player.dy = 0;
}

});


// GATE COLLISION
if(
player.x < gate.x + gate.width &&
player.x + player.width > gate.x &&
player.y < gate.y + gate.height &&
player.y + player.height > gate.y
){

levelComplete = true;

player.dx = 0;
player.dy = 0;


// LEVEL UNLOCK LOGIC
if(unlockedLevel === currentLevel + 1){

unlockedLevel++;

if(playerId !== null){
saveProgress();
}

}

setTimeout(()=>{
gameState = "levels";
},1500);

}

}



// ---------------------
// DRAW PLAYER
// ---------------------
function drawPlayer(){

let x = player.x;
let y = player.y;

ctx.fillStyle = "white";

ctx.beginPath();
ctx.arc(x+15,y+6,6,0,Math.PI*2);
ctx.fill();

ctx.fillRect(x+12,y+12,6,12);

ctx.fillRect(x+5,y+14,7,3);
ctx.fillRect(x+18,y+14,7,3);

ctx.fillRect(x+10,y+24,4,8);
ctx.fillRect(x+16,y+24,4,8);

}


// ---------------------
// DRAW PLATFORMS
// ---------------------
function drawPlatforms(){

ctx.fillStyle="gray";

platforms.forEach(p=>{
ctx.fillRect(p.x,p.y,p.width,p.height);
});

}


// ---------------------
// DRAW GATE
// ---------------------
function drawGate(){

ctx.fillStyle="green";
ctx.fillRect(gate.x,gate.y,gate.width,gate.height);

}


// ---------------------
// HOME BUTTON
// ---------------------
function drawHomeButton(){

ctx.fillStyle="gray";
ctx.fillRect(homeButton.x,homeButton.y,homeButton.width,homeButton.height);

ctx.fillStyle="black";
ctx.font="18px Arial";
ctx.fillText("HOME",45,45);

}


// ---------------------
// HOME SCREEN
// ---------------------
function drawHome(){

ctx.fillStyle="white";
ctx.font="50px Arial";
ctx.fillText("LEVEL DEVIL",230,100);

ctx.fillStyle="gray";
ctx.fillRect(playButton.x,playButton.y,playButton.width,playButton.height);
ctx.fillRect(loginButton.x,loginButton.y,loginButton.width,loginButton.height);

ctx.fillStyle="black";
ctx.font="25px Arial";

ctx.fillText("PLAY",370,185);
ctx.fillText("LOGIN",360,255);

}


// ---------------------
// LEVEL SCREEN
// ---------------------
function drawLevels(){

ctx.fillStyle="white";
ctx.font="40px Arial";
ctx.fillText("SELECT LEVEL",240,90);

drawHomeButton();

ctx.fillStyle="gray";
ctx.fillRect(level1Button.x,level1Button.y,level1Button.width,level1Button.height);

ctx.fillStyle = unlockedLevel>=2 ? "gray":"darkred";
ctx.fillRect(level2Button.x,level2Button.y,level2Button.width,level2Button.height);

ctx.fillStyle = unlockedLevel>=3 ? "gray":"darkred";
ctx.fillRect(level3Button.x,level3Button.y,level3Button.width,level3Button.height);

ctx.fillStyle="black";
ctx.font="25px Arial";

ctx.fillText("LEVEL 1",350,180);
ctx.fillText("LEVEL 2",350,250);
ctx.fillText("LEVEL 3",350,320);

}


// ---------------------
// GAME LOOP
// ---------------------
function gameLoop(){

ctx.clearRect(0,0,canvas.width,canvas.height);

if(gameState==="home"){
drawHome();
}

else if(gameState==="levels"){
drawLevels();
}

else if(gameState==="playing"){

updatePlayer();

drawPlatforms();
drawGate();
drawPlayer();

if(levelComplete){

ctx.fillStyle="yellow";
ctx.font="40px Arial";
ctx.fillText("LEVEL COMPLETE!",210,200);

}

}

requestAnimationFrame(gameLoop);

}

gameLoop();