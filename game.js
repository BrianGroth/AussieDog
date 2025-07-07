// AussieDog Herding Game
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Responsive canvas sizing
function resizeCanvas() {
  const width = Math.min(window.innerWidth, 480);
  const height = Math.min(window.innerHeight * 0.8, 720);
  canvas.width = width;
  canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Game variables
let score = 0;
let sheepCount = 5;
let sheep = [];
let obstacles = [];
let scrollY = 0;
let gameOver = false;

// Dog object
const dog = {
  x: canvas.width / 2,
  y: 80,
  radius: 18,
  color: '#6b4f1d',
  speed: 5,
  moveLeft: false,
  moveRight: false,
  moveUp: false,
  moveDown: false
};

// Load images
const images = {
  dog: new Image(),
  sheep: new Image(),
  rock: new Image(),
  log: new Image(),
  bramble: new Image()
};
images.dog.src = 'assets/dog.png';
images.sheep.src = 'assets/sheep.png';
images.rock.src = 'assets/rock.png';
images.log.src = 'assets/log.png';
images.bramble.src = 'assets/bramble.png';

// Sheep object factory
function createSheep(x, y) {
  return {
    x,
    y,
    radius: 12,
    color: '#fff',
    isLost: false,
    isInjured: false
  };
}

// Obstacle factory
function createObstacle(x, y, type) {
  return {
    x,
    y,
    width: 36,
    height: 18,
    type, // 'rock', 'log', 'bramble'
    color: type === 'rock' ? '#888' : type === 'log' ? '#a0522d' : '#228B22'
  };
}

// Initialize sheep
function initSheep() {
  sheep = [];
  for (let i = 0; i < sheepCount; i++) {
    sheep.push(createSheep(canvas.width / 2 + (i - 2) * 30, dog.y + 40));
  }
}

// Initialize obstacles
function initObstacles() {
  obstacles = [];
  for (let i = 1; i <= 20; i++) {
    const type = ['rock', 'log', 'bramble'][Math.floor(Math.random() * 3)];
    const x = 40 + Math.random() * (canvas.width - 80);
    const y = i * 200 + 100;
    obstacles.push(createObstacle(x, y, type));
  }
}

function resetGame() {
  score = 0;
  sheepCount = 5;
  scrollY = 0;
  gameOver = false;
  dog.x = canvas.width / 2;
  dog.y = 80;
  initSheep();
  initObstacles();
}

// Controls
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') dog.moveLeft = true;
  if (e.key === 'ArrowRight') dog.moveRight = true;
  if (e.key === 'ArrowUp') dog.moveUp = true;
  if (e.key === 'ArrowDown') dog.moveDown = true;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft') dog.moveLeft = false;
  if (e.key === 'ArrowRight') dog.moveRight = false;
  if (e.key === 'ArrowUp') dog.moveUp = false;
  if (e.key === 'ArrowDown') dog.moveDown = false;
});

// Touch controls for mobile
canvas.addEventListener('touchstart', handleTouch, false);
canvas.addEventListener('touchmove', handleTouch, false);
canvas.addEventListener('touchend', () => {
  dog.moveLeft = dog.moveRight = dog.moveUp = dog.moveDown = false;
});
function handleTouch(e) {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  dog.moveLeft = x < canvas.width / 3;
  dog.moveRight = x > canvas.width * 2 / 3;
  dog.moveUp = y < canvas.height / 3;
  dog.moveDown = y > canvas.height * 2 / 3;
}

// Game loop
function gameLoop() {
  if (gameOver) return;
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

function update() {
  // Move dog
  if (dog.moveLeft) dog.x -= dog.speed;
  if (dog.moveRight) dog.x += dog.speed;
  if (dog.moveUp) dog.y -= dog.speed;
  if (dog.moveDown) dog.y += dog.speed;
  // Clamp dog position
  dog.x = Math.max(dog.radius, Math.min(canvas.width - dog.radius, dog.x));
  dog.y = Math.max(60, Math.min(canvas.height - dog.radius, dog.y));

  // Move sheep to follow dog
  sheep.forEach((s, i) => {
    if (s.isLost || s.isInjured) return;
    const dx = dog.x - s.x + (Math.random() - 0.5) * 6;
    const dy = (dog.y + 40 + i * 5) - s.y + (Math.random() - 0.5) * 6;
    s.x += dx * 0.07;
    s.y += dy * 0.07;
  });

  // Scroll screen as dog moves down
  if (dog.y > canvas.height / 2) {
    const scrollAmount = dog.y - canvas.height / 2;
    scrollY += scrollAmount;
    dog.y -= scrollAmount;
    sheep.forEach(s => s.y -= scrollAmount);
    obstacles.forEach(o => o.y -= scrollAmount);
  }

  // Check collisions with obstacles
  obstacles.forEach(o => {
    sheep.forEach(s => {
      if (!s.isLost && !s.isInjured && isColliding(s, o)) {
        if (o.type === 'bramble') {
          s.isInjured = true;
          score -= 10;
        } else {
          s.isLost = true;
          score -= 15;
        }
      }
    });
    if (isColliding(dog, o)) {
      score += 5;
      o.y = -1000; // Move obstacle off screen
    }
  });

  // Remove lost/injured sheep from count
  sheepCount = sheep.filter(s => !s.isLost && !s.isInjured).length;

  // Check for game over (reached river or all sheep lost)
  if (scrollY > 3500 || sheepCount === 0) {
    gameOver = true;
    setTimeout(() => {
      alert('Game Over! Final Score: ' + score);
      resetGame();
      gameLoop();
    }, 500);
  }

  // Update scoreboard
  document.getElementById('score').textContent = 'Score: ' + score;
  document.getElementById('sheepCount').textContent = 'Sheep: ' + sheepCount;

  // Update river distance indicator
  const riverDistance = Math.max(0, Math.round((3500 - scrollY) / 10));
  document.getElementById('riverDistance').textContent = 'River: ' + riverDistance + 'm';
}

function isColliding(a, b) {
  // Circle-rectangle collision
  const distX = Math.abs(a.x - b.x - b.width / 2);
  const distY = Math.abs(a.y - b.y - b.height / 2);
  if (distX > (b.width / 2 + a.radius)) return false;
  if (distY > (b.height / 2 + a.radius)) return false;
  if (distX <= (b.width / 2)) return true;
  if (distY <= (b.height / 2)) return true;
  const dx = distX - b.width / 2;
  const dy = distY - b.height / 2;
  return (dx * dx + dy * dy <= (a.radius * a.radius));
}

function drawDog(dog) {
  if (images.dog.complete && images.dog.naturalWidth > 0) {
    ctx.drawImage(images.dog, dog.x - 32, dog.y - 32, 64, 64);
  } else {
    // fallback shape
    ctx.save();
    ctx.translate(dog.x, dog.y);
    ctx.beginPath();
    ctx.ellipse(0, 8, 14, 20, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#6b4f1d';
    ctx.fill();
    ctx.restore();
  }
}

function drawSheep(s) {
  if (images.sheep.complete && images.sheep.naturalWidth > 0) {
    ctx.drawImage(images.sheep, s.x - 28, s.y - 28, 56, 56);
  } else {
    // fallback shape
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 16, 0, 0, 2 * Math.PI);
    ctx.fillStyle = s.isInjured ? '#f88' : '#fff';
    ctx.fill();
    ctx.restore();
  }
}

function drawObstacle(o) {
  let img = null, w = 48, h = 32;
  if (o.type === 'rock') { img = images.rock; w = 48; h = 32; }
  else if (o.type === 'log') { img = images.log; w = 56; h = 24; }
  else if (o.type === 'bramble') { img = images.bramble; w = 56; h = 32; }
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, o.x, o.y, w, h);
  } else {
    // fallback shape
    ctx.save();
    ctx.translate(o.x + o.width / 2, o.y + o.height / 2);
    if (o.type === 'rock') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 12, 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = '#888';
      ctx.fill();
    } else if (o.type === 'log') {
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7, 0, 0, 2 * Math.PI);
      ctx.fillStyle = '#a0522d';
      ctx.fill();
    } else if (o.type === 'bramble') {
      ctx.beginPath();
      ctx.moveTo(-14, 0); ctx.lineTo(14, 0);
      ctx.moveTo(0, -7); ctx.lineTo(0, 7);
      ctx.moveTo(-10, -5); ctx.lineTo(10, 5);
      ctx.moveTo(-10, 5); ctx.lineTo(10, -5);
      ctx.strokeStyle = '#228B22';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.restore();
  }
}

function drawBackground() {
  // Draw mountain slopes
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width * 0.3, canvas.height * 0.3);
  ctx.lineTo(canvas.width * 0.7, canvas.height * 0.2);
  ctx.lineTo(canvas.width, 0);
  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();
  ctx.fillStyle = '#a3c9a8';
  ctx.fill();
  // Snow caps
  ctx.beginPath();
  ctx.moveTo(canvas.width * 0.25, canvas.height * 0.1);
  ctx.lineTo(canvas.width * 0.3, canvas.height * 0.3);
  ctx.lineTo(canvas.width * 0.35, canvas.height * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
  // Draw river at the bottom if close
  if (scrollY > 3200) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 60);
    ctx.bezierCurveTo(canvas.width * 0.3, canvas.height - 40, canvas.width * 0.7, canvas.height - 80, canvas.width, canvas.height - 40);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.fillStyle = '#4fc3f7';
    ctx.globalAlpha = 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  // Draw obstacles
  obstacles.forEach(o => drawObstacle(o));
  // Draw sheep
  sheep.forEach(s => {
    if (s.isLost) return;
    drawSheep(s);
  });
  // Draw dog
  drawDog(dog);
}

// Start game
resetGame();
gameLoop(); 