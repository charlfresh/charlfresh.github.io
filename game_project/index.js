const canvas = document.getElementById("myCanvas");
const ctx = canvas.getContext("2d");

let player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    width: 40,
    height: 20,
    speed: 6,
    angle: 0
};

let Normal = {
    x: 50,
    y: Math.floor(Math.random() * canvas.height),
    width: 30,
    height: 30,
    speed: 2.5,
    health: 100
};

let Brute = {
    x: 50,
    y: Math.floor(Math.random() * canvas.height),
    width: 40,
    height: 40,
    speed: 1,
    health: 200
};

let Speedy = {
    x: 50,
    y: Math.floor(Math.random() * canvas.height),
    width: 20,
    height: 20,
    speed: 4,
    health: 75
};

let options = [Normal, Brute, Speedy];
let activeZombies = [];

let bullets = [];

function spawnZombie() {
    let zombieType = options[Math.floor(Math.random() * options.length)];
    let zombie = { 
        ...zombieType, 
        x: canvas.width, 
        y: Math.floor(Math.random() * canvas.height)
    };
    activeZombies.push(zombie);
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

function updateBullets() {
    bullets.forEach((bullet, index) => {
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

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

    ctx.fillStyle = "red";
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
}

function gameLoop() {
    updatePlayerMovement();
    updateBullets();
    drawPlayer();
    requestAnimationFrame(gameLoop);
}

setInterval(spawnZombie, 2000);
gameLoop();
window.addEventListener("keydown", movePlayer);
