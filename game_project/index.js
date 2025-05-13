const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

drawStartScreen();

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 40,
    height: 40,
    speed: 6,
    angle: 0,
    playerColor: 'red'
};

let wave = 0;
let gameRunning = true;
let zombieCount = 0;
let gameHealth = 500;

function drawWave(){
    ctx.font = "25px Arial";
    ctx.fillStyle = "red";
    ctx.fillText('Wave: ' + wave, 5,30);
}

function drawHealth(){
    ctx.font = "25px Arial";
    ctx.fillText('Health: ' + gameHealth, 270,30);
}

let Normal = {
    x: 50,
    y: Math.floor(Math.random() * canvas.height),
    width: 30,
    height: 30,
    speed: 1.5,
    health: 100
};

let Brute = {
    x: 50,
    y: Math.floor(Math.random() * canvas.height),
    width: 40,
    height: 40,
    speed: 0.5,
    health: 200
};

let Speedy = {
    x: 50,
    y: Math.floor(Math.random() * canvas.height),
    width: 20,
    height: 20,
    speed: 2.5,
    health: 75
};

let options = [Normal, Brute, Speedy];
let activeZombies = [];

let bullets = [];

let gameStarted = false;

function drawStartScreen() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "24px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("Zombie Survival", canvas.width / 2 - 80, canvas.height / 2 - 40);

    ctx.fillStyle = "green";
    ctx.fillRect(canvas.width / 2 - 50, canvas.height / 2, 100, 40);

    ctx.fillStyle = "white";
    ctx.fillText("Play", canvas.width / 2 - 20, canvas.height / 2 + 25);
}

canvas.addEventListener("click", function(event) {
    let rect = canvas.getBoundingClientRect();
    let mouseX = event.clientX - rect.left;
    let mouseY = event.clientY - rect.top;

    if (mouseX >= canvas.width / 2 - 50 && mouseX <= canvas.width / 2 + 50 &&
        mouseY >= canvas.height / 2 && mouseY <= canvas.height / 2 + 40) {
        
        gameStarted = true;
        gameRunning = true;
        requestAnimationFrame(gameLoop);
    }
});

drawStartScreen();


function spawnZombie() {
    let zombieType = options[Math.floor(Math.random() * options.length)];
    let zombie = { 
        ...zombieType, 
        x: canvas.width, 
        y: Math.floor(Math.random() * canvas.height)
    };
    activeZombies.push(zombie);
    zombieCount += 1
}

function drawZombies() {
    activeZombies.forEach(zombie => {
        ctx.save();
        ctx.translate(zombie.x, zombie.y);
        ctx.fillStyle = "green";
        ctx.fillRect(-zombie.width / 2, -zombie.height / 2, zombie.width, zombie.height);
        ctx.restore();

        zombie.x -= zombie.speed;
    });
}

function shootBullet() {
    let bulletSpeed = 7;
    let angleRad = player.angle * Math.PI / 180;

    let bullet = {
        x: player.x + Math.cos(angleRad) * player.width / 2,
        y: player.y + Math.sin(angleRad) * player.width / 2,
        dx: Math.cos(angleRad) * bulletSpeed,
        dy: Math.sin(angleRad) * bulletSpeed,
        size: 5
    };

    bullets.push(bullet);
}

function isColliding(bullet, zombie) {
    return (
        bullet.x + bullet.size > zombie.x - zombie.width / 2 && 
        bullet.x - bullet.size < zombie.x + zombie.width / 2 && 
	bullet.y + bullet.size > zombie.y - zombie.height / 2 && 
	bullet.y - bullet.size < zombie.y + zombie.height / 2 
	);
}

let damage = 25;

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

	activeZombies.forEach((zombie, zombieIndex) => {
            if (isColliding(bullet, zombie)) {
                zombie.health -= damage; 
                bullets.splice(index, 1); 

                if (zombie.health <= 0) {
                    activeZombies.splice(zombieIndex, 1); 
                }
            }
        });

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(index, 1);
        }
    });
}

function drawBullets() {
    ctx.fillStyle = "blue";
    bullets.forEach(bullet => {
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawPlayer() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle * Math.PI / 180);

    ctx.fillStyle = player.playerColor;
    ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);

    ctx.fillStyle = "black";
    ctx.fillRect(player.width / 2, -5, 20, 10);

    ctx.restore();

    drawBullets();
    drawZombies();
}

let keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    z: false, 
    x: false
};
window.addEventListener("keydown", (event) => {
    if (keys.hasOwnProperty(event.key)) keys[event.key] = true;
    if (event.key === " ") shootBullet(); 
});

window.addEventListener("keyup", (event) => {
    if (keys.hasOwnProperty(event.key)) keys[event.key] = false;
});
function updatePlayerMovement() {
    if (keys.ArrowUp) player.y -= player.speed;
    if (keys.ArrowDown) player.y += player.speed;
    if (keys.ArrowLeft) player.x -= player.speed;
    if (keys.ArrowRight) player.x += player.speed;

    if (keys.z) player.angle -= 2; 
    if (keys.x) player.angle += 2;
    
    if (player.x > 400) player.x = 390;
    if (player.x < 0) player.x = 10;
    if (player.y < 0) player.y = 10;
    if (player.y > 400) player.y = 390
}

let powered_up = false;

function powerCollision(){
    let player_min_x = player.x - 20;
    let player_max_x = player.x + 20;
    let player_min_y = player.y - 20;
    let player_max_y = player.y + 20;

    let power_min_x = activePowerUp.x;
    let power_max_x = activePowerUp.x + 50;
    let power_min_y = activePowerUp.y;
    let power_max_y = activePowerUp.y + 50;

    if(power_max_y > player_min_y
        && power_min_y < player_max_y
        && power_max_x > player_min_x
        && power_min_x < player_max_x){
        powered_up = true

    }
    if (powered_up === true){
	if (activePowerUp.type === 'Strength'){
	    damage = 50;
	}
	if (activePowerUp.type === 'Speed'){
	    player.speed = 8;
	}
	if (activePowerUp.type === 'Health'){
	    gameHealth += 300;
	}
	if (activePowerUp.type === 'Bounce'){
	    bullet.size = 10;
	}
	player.playerColor = 'pink'
     }
}


powers = ["Strength", "Speed", "Health", "Bounce"]

let activePowerUp = null;
let powerUpSpeed = 4;

function spawnPowerUp() {
    activePowerUp = {
        type: powers[Math.floor(Math.random() * powers.length)],
        x: canvas.width,
        y: Math.floor(Math.random() * canvas.height),
        size: 10
    };
}

function movePowerUp() {
    if (activePowerUp) {
        activePowerUp.x -= powerUpSpeed;
        if (activePowerUp.x + activePowerUp.size <= 0) {
            activePowerUp = null;
        }
    }
}


function drawPower(){
    if (activePowerUp){
	ctx.fillStyle = "pink";
	ctx.beginPath();
	ctx.arc(activePowerUp.x, activePowerUp.y, activePowerUp.size, 0, Math.PI * 2);
	ctx.fill();
    }
}

function gameWave() {
    if (zombieCount === 5){ 
        wave += 1;
        powered_up = false;
	    if (powered_up === false){
		bullet.size = 5;
		player.speed = 6;
		damage = 25;
	    }
        zombieCount = 0;
	Normal.speed += 0.3;
	Brute.speed += 0.2;
	Speedy.speed += 0.4;
	
	spawnPowerUp();
    }
}
	 
function checkZombieEscape() {
    activeZombies.forEach((zombie, index) => {
        if (zombie.x + zombie.width / 2 <= 0) {
            activeZombies.splice(index, 1);
	    gameHealth -= zombie.health;
        }
    });
}

function gameLose() {
    if (gameHealth <= 0){
        gameRunning = false;
    }
} 

function gameWin() {
    if (wave >= 25){
	gameRunning = false;
    }
}   	



function gameLoop() {
    if (!gameRunning) return;
    gameLose();
    gameWin();
    updatePlayerMovement();
    updateBullets();
    drawPlayer();
    drawWave();
    drawHealth();
    gameWave();
    checkZombieEscape();
    movePowerUp();
    drawPowerUp();
    drawZombies();
    powerCollision();	

    requestAnimationFrame(gameLoop);
}

setInterval(spawnZombie, 2000);

