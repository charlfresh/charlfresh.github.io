const canvas = document.getElementById("myCanvas");
        const ctx = canvas.getContext("2d");

        let player = {
            x: canvas.width / 2,
            y: canvas.height / 2,
            width: 40,
            height: 20,
            speed: 10,
            angle: 0, // Rotation angle in degrees
        };

	// let zombieStart = Math.floor(Math.random() * canvas.height);
	
	let options = [Normal, Brute, Speedy];

	let Normal = {
	    x: 50,
	    y: Math.floor(Math.random() * canvas.height),
	    width: 30,
            height: 30,
	    speed: 4,
	    health: 100,
	}
	let Brute = {
	    x: 50,
            y: Math.floor(Math.random() * canvas.height),
            width: 40,
            height: 40,
            speed: 2,
            health: 200,
	}
	let Speedy = {
	    x: 50,
            y: Math.floor(Math.random() * canvas.height),
            width: 20,
            height: 20,
            speed: 7,
            health: 75,
	}

	let bullets = []; // Array to store bullets	

	function drawZombie() {
	    let type = options[Math.floor(Math.random() * options.length)];
		
	    ctx.save();
            ctx.translate(type.x, type.y);
            ctx.rotate(player.angle * Math.PI / 180);

            ctx.fillStyle = "green";
            ctx.fillRect(-type.width / 2, -type.height / 2, type.width, type.height);
            
            ctx.restore();
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

        // Remove bullets that go off-screen
            if (
            	bullet.x < 0 || bullet.x > canvas.width ||
                bullet.y < 0 || bullet.y > canvas.height
        	) {
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
        }

        function movePlayer(event) {
            switch (event.key) {
                case "ArrowUp":
                    player.y -= player.speed;
                    break;
                case "ArrowDown":
                    player.y += player.speed;
                    break;
                case "ArrowLeft":
                    player.x -= player.speed;
                    break;
                case "ArrowRight":
                    player.x += player.speed;
                    break;
                case "z":
                    player.angle -= 15; // Rotate counterclockwise
                    break;
                case "x":
                    player.angle += 15; // Rotate clockwise
                    break;
            }
            drawPlayer();
        }
	
	window.addEventListener("keydown", function(event) {
    if (event.key === " ") {
        shootBullet(); // Fire a bullet when space is pressed
    }
});

function gameLoop() {
    updateBullets();
    drawPlayer();
    drawZombie();
    requestAnimationFrame(gameLoop);
}

gameLoop();

        window.addEventListener("keydown", movePlayer);
        drawPlayer();
