// Global variables
let killer, detectives, campers;
let gameState = 'loading';
let score = 0;
let forestBg;
let killerAngle = 0; // Angle for knife direction
let level = 1;
let maxLevel = 10; // Maximum number of levels
let lastLevel = 1; // Track last level for background changes
let levelKills = 0; // Track kills in current level
let introShown = false; // Track if intro has been shown
let combo = 0;
let comboMultiplier = 1;
let lastKillTime = 0;
const COMBO_TIMEOUT = 2000; // 2 seconds to maintain combo
let killerVisible = false; // Track if killer is visible to detectives
let detectiveRespawnTimer = 0;
const DETECTIVE_RESPAWN_DELAY = 3000; // 3 seconds delay before respawning

// Story text
const storyText = [
  "1978: Summer camp massacre leaves 13 dead",
  "You are the vengeful killer returning to finish what you started",
  "Hunt down all campers before the detectives catch you",
  "With each level, your legend grows..."
];

// Asset loading variables
let customAssets = {
  killer: null,
  campers: [],
  detective: null,
  background: null,
  loaded: false,
  loading: false,
  loadCount: 0,
  totalAssets: 5 // Total number of assets to load (1 killer + 3 campers + 1 detective)
};

// Power-up system
let killerPowerUps = {
  active: null,
  duration: 0,
  killCounter: 0,
  availablePowerUps: [
    {
      name: "Invincibility",
      description: "Invulnerable to detectives for 5 seconds. Can kill detectives.",
      duration: 300, // 5 seconds at 60fps
      icon: "shield"
    },
    {
      name: "Speed Boost",
      description: "Double movement speed for 5 seconds.",
      duration: 300, // 5 seconds at 60fps
      icon: "lightning"
    },
    {
      name: "Camper Panic",
      description: "All campers enter high fear state for 5 seconds.",
      duration: 300, // 5 seconds at 60fps
      icon: "exclamation"
    },
    {
      name: "Shadow Step",
      description: "Invisible to detectives unless very close for 5 seconds.",
      duration: 300, // 5 seconds at 60fps
      icon: "ghost"
    },
    {
      name: "Intimidation",
      description: "Slows all nearby campers and detectives for 5 seconds.",
      duration: 300, // 5 seconds at 60fps
      icon: "ripple"
    }
  ],
  activatePowerUp: function(index) {
    // Don't activate if a power-up is already active
    if (this.active) return;
    
    if (index >= 0 && index < this.availablePowerUps.length) {
      this.active = this.availablePowerUps[index];
      this.duration = this.active.duration;
      console.log(`Power-up activated: ${this.active.name}`);
      gameState = 'playing';
    } else {
      console.log('Invalid power-up index:', index);
      this.active = null;
      this.duration = 0;
      gameState = 'playing';
    }
  },
  updatePowerUp: function() {
    if (this.active) {
      this.duration--;
      if (this.duration <= 0) {
        console.log(`Power-up ended: ${this.active.name}`);
        this.active = null;
        // Reset kill counter when power-up ends
        this.killCounter = 0;
        gameState = 'playing';
      }
    }
  },
  isPowerUpActive: function(name) {
    return this.active && this.active.name === name;
  },
  shouldTriggerPowerUp: function() {
    // Only trigger if no power-up is active and kill counter reaches threshold
    return !this.active && this.killCounter >= 3;
  },
  resetKillCounter: function() {
    this.killCounter = 0;
  }
};

// Horror elements
let blood = []; // Blood splatter particles
let screenShake = 0; // Screen shake effect
let darknessLevel = 50; // Increased from 30 to 50 for more dramatic effect
let mask; // Killer's mask
let gameTitle = "CAMP KILL";
let backstory = [
  "1978: Summer camp massacre leaves 13 dead",
  "You are the vengeful killer returning to finish what you started",
  "Hunt down all campers before the detectives catch you",
  "With each level, your legend grows..."
];

// Animation variables
let frameCounter = 0;
let killerSprite;
let camperSprites = [];
let detectiveSprite;

// Character animation frames
const WALK_CYCLE_FRAMES = 8;
const RUN_CYCLE_FRAMES = 6;

// Define colors for camper types
const colors = [
  [0, 80, 0],   // Green
  [150, 0, 0],  // Red
  [0, 0, 80]    // Blue
];

// Add to global variables
let specialEvents = {
  active: null,
  duration: 0,
  events: [
    {
      name: "Night Vision",
      description: "Campers glow in the dark",
      duration: 10000, // 10 seconds
      effect: function() {
        // Campers will glow
        for (let camper of campers) {
          camper.glowing = true;
        }
      },
      cleanup: function() {
        for (let camper of campers) {
          camper.glowing = false;
        }
      }
    },
    {
      name: "Speed Demon",
      description: "Everyone moves faster!",
      duration: 8000,
      effect: function() {
        killer.speed *= 1.5;
        for (let camper of campers) {
          camper.speed *= 1.5;
        }
        for (let detective of detectives) {
          detective.speed *= 1.5;
        }
      },
      cleanup: function() {
        killer.speed /= 1.5;
        for (let camper of campers) {
          camper.speed /= 1.5;
        }
        for (let detective of detectives) {
          detective.speed /= 1.5;
        }
      }
    },
    {
      name: "Blood Moon",
      description: "More blood, more points!",
      duration: 12000,
      effect: function() {
        // Double blood particles and points
        for (let i = 0; i < 20; i++) {
          blood.push({
            x: killer.x + random(-20, 20),
            y: killer.y + random(-20, 20),
            size: random(5, 15),
            alpha: 255
          });
        }
      },
      cleanup: function() {
        // Nothing to clean up
      }
    },
    {
      name: "Fear Factor",
      description: "Campers freeze in fear!",
      duration: 7000,
      effect: function() {
        for (let camper of campers) {
          camper.speed *= 0.5; // Slow down campers
          camper.fear = 1; // Maximum fear
        }
      },
      cleanup: function() {
        for (let camper of campers) {
          camper.speed *= 2; // Restore normal speed
          camper.fear = 0.5; // Reset fear
        }
      }
    },
    {
      name: "Shadow Mode",
      description: "Killer becomes invisible!",
      duration: 9000,
      effect: function() {
        killer.invisible = true;
      },
      cleanup: function() {
        killer.invisible = false;
      }
    }
  ],
  triggerRandomEvent: function() {
    if (this.active) return;
    
    const event = random(this.events);
    this.active = event;
    this.duration = event.duration;
    event.effect();
    
    // Show event notification
    showNotification(event.name, event.description);
  },
  update: function() {
    if (this.active) {
      this.duration -= deltaTime;
      if (this.duration <= 0) {
        this.active.cleanup();
        this.active = null;
        showNotification("Event Ended", "The special event has ended!");
      }
    }
  }
};

// Add notification system
let notifications = [];
function showNotification(title, message) {
  notifications.push({
    title: title,
    message: message,
    duration: 3000,
    alpha: 255
  });
}

// Debug function
function debugLog(message) {
  const debugDiv = document.getElementById('debug');
  if (debugDiv) {
    debugDiv.innerHTML += message + '<br>';
    debugDiv.scrollTop = debugDiv.scrollHeight;
  }
  console.log(message);
}

// Preload function - this runs before setup
function preload() {
  debugLog('Starting preload...');
  
  // Load custom assets if they exist
  try {
    debugLog("Attempting to load custom assets...");
    customAssets.loading = true;
    
    // Load killer sprite
    customAssets.killer = loadImage('assets/images/killer.png', 
      () => {
        debugLog('Killer sprite loaded successfully');
        customAssets.loadCount++;
        checkLoadingComplete();
      },
      (e) => {
        debugLog('Failed to load killer sprite: ' + e);
        customAssets.loadCount++;
        checkLoadingComplete();
      }
    );
    
    // Load camper sprites (up to 3 different types)
    for (let i = 0; i < 3; i++) {
      const camperPath = `assets/images/camper${i + 1}.png`;
      debugLog(`Loading camper sprite: ${camperPath}`);
      customAssets.campers[i] = loadImage(camperPath,
        () => {
          debugLog(`Camper sprite ${i + 1} loaded successfully`);
          customAssets.loadCount++;
          checkLoadingComplete();
        },
        (e) => {
          debugLog(`Failed to load camper sprite ${i + 1}: ${e}`);
          customAssets.loadCount++;
          checkLoadingComplete();
        }
      );
    }
    
    // Load detective sprite
    customAssets.detective = loadImage('assets/images/detective.png',
      () => {
        debugLog('Detective sprite loaded successfully');
        customAssets.loadCount++;
        checkLoadingComplete();
      },
      (e) => {
        debugLog('Failed to load detective sprite: ' + e);
        customAssets.loadCount++;
        checkLoadingComplete();
      }
    );
    
  } catch (e) {
    debugLog('Custom asset loading failed: ' + e);
    customAssets.loaded = true;
    customAssets.loading = false;
  }
}

// Function to check if all assets are loaded
function checkLoadingComplete() {
  if (customAssets.loadCount >= customAssets.totalAssets) {
    customAssets.loaded = true;
    customAssets.loading = false;
    debugLog('All assets loaded successfully');
    debugLog(`Game State: ${gameState}`);
  }
}

// Setup function - initialize the game
function setup() {
  debugLog('Starting setup...');
  
  // Create canvas
  createCanvas(800, 600);
  
  // Initialize killer with larger size and faster speed
  killer = {
    x: width / 2,
    y: height / 2,
    size: 80,
    speed: 5, // Killer speed is 5, making it faster than detectives
    killCount: 0,
    walkFrame: 0,
    lastMoveTime: 0,
    moving: false,
    killAnimations: [],
    invisible: false
  };
  
  // Initialize forest background
  forestBg = createGraphics(width, height);
  drawForestBackground();
  
  // Set text alignment
  textAlign(CENTER, CENTER);
  
  // Set game state to intro
  gameState = 'intro';
  
  // Hide loading screen
  const loadingDiv = document.getElementById('loading');
  if (loadingDiv) {
    loadingDiv.style.display = 'none';
  }
  
  debugLog('Setup completed');
  debugLog(`Game State: ${gameState}`);
  debugLog(`Assets Loaded: ${customAssets.loaded}`);
  
  // Start the game loop
  frameRate(60);
}

// Helper function to get a safe position away from the killer
function getSafePosition(refX, refY, minDist) {
  let x, y;
  do {
    x = random(width);
    y = random(height);
  } while (dist(refX, refY, x, y) < minDist);
  return { x: x, y: y };
}

// Function to draw the forest background
function drawForestBackground() {
  // Different background colors based on level
  let bgColor;
  let fogColor;
  let treeColor;
  let trunkColor;
  let groundColor;
  
  switch(level) {
    case 1: // Summer Camp - Bright but eerie
      bgColor = [30, 40, 30];
      fogColor = [200, 200, 200];
      treeColor = [0, 40, 0];
      trunkColor = [50, 35, 25];
      groundColor = [40, 30, 20];
      break;
      
    case 2: // Dusk - Orange tint
      bgColor = [40, 25, 15];
      fogColor = [255, 200, 150];
      treeColor = [20, 30, 10];
      trunkColor = [45, 30, 20];
      groundColor = [50, 35, 25];
      break;
      
    case 3: // Night - Deep blue
      bgColor = [15, 15, 35];
      fogColor = [150, 150, 200];
      treeColor = [10, 20, 10];
      trunkColor = [40, 25, 15];
      groundColor = [30, 20, 10];
      break;
      
    case 4: // Stormy - Dark gray
      bgColor = [25, 25, 25];
      fogColor = [100, 100, 100];
      treeColor = [15, 15, 15];
      trunkColor = [35, 25, 15];
      groundColor = [25, 15, 5];
      break;
      
    case 5: // Blood Moon - Red tint
      bgColor = [35, 15, 15];
      fogColor = [200, 150, 150];
      treeColor = [20, 10, 10];
      trunkColor = [30, 20, 10];
      groundColor = [20, 10, 5];
      break;
      
    case 6: // Haunted - Purple tint
      bgColor = [25, 15, 35];
      fogColor = [150, 100, 200];
      treeColor = [15, 10, 20];
      trunkColor = [25, 15, 25];
      groundColor = [15, 5, 15];
      break;
      
    case 7: // Misty - Green tint
      bgColor = [15, 25, 15];
      fogColor = [100, 200, 100];
      treeColor = [10, 20, 10];
      trunkColor = [20, 15, 10];
      groundColor = [10, 15, 5];
      break;
      
    case 8: // Abandoned - Brown tint
      bgColor = [35, 25, 15];
      fogColor = [200, 150, 100];
      treeColor = [25, 15, 10];
      trunkColor = [30, 20, 10];
      groundColor = [25, 15, 5];
      break;
      
    case 9: // Cursed - Dark purple
      bgColor = [15, 5, 25];
      fogColor = [100, 50, 150];
      treeColor = [10, 5, 15];
      trunkColor = [20, 10, 15];
      groundColor = [10, 5, 10];
      break;
      
    case 10: // Hellish - Deep red
      bgColor = [25, 5, 5];
      fogColor = [200, 50, 50];
      treeColor = [15, 5, 5];
      trunkColor = [20, 10, 5];
      groundColor = [15, 5, 0];
      break;
      
    default: // Fallback
      bgColor = [20, 25, 20];
      fogColor = [220, 220, 220];
      treeColor = [0, 30, 0];
      trunkColor = [40, 30, 20];
      groundColor = [30, 20, 10];
  }
  
  // Draw base background
  forestBg.background(bgColor[0], bgColor[1], bgColor[2]);
  
  // Draw ground
  forestBg.fill(groundColor[0], groundColor[1], groundColor[2]);
  forestBg.rect(0, height * 0.7, width, height * 0.3);
  
  // Draw fog effect with varying density based on level
  forestBg.noStroke();
  let fogDensity = min(100 + level * 5, 150); // More fog in higher levels
  for (let i = 0; i < fogDensity; i++) {
    let x = random(width);
    let y = random(height);
    let size = random(50, 200);
    let opacity = random(5, 30);
    forestBg.fill(fogColor[0], fogColor[1], fogColor[2], opacity);
    forestBg.ellipse(x, y, size, size);
  }
  
  // Draw trees with varying density and size based on level
  let numTrees = min(70 + level * 3, 100); // More trees in higher levels
  for (let i = 0; i < numTrees; i++) {
    let x = random(width);
    let y = random(height * 0.7); // Keep trees above ground
    forestBg.noStroke();
    
    // Tree trunk
    forestBg.fill(trunkColor[0], trunkColor[1], trunkColor[2]);
    forestBg.rect(x - 5, y, 10, 30);
    
    // Tree canopy
    forestBg.fill(treeColor[0], treeColor[1], treeColor[2]);
    forestBg.triangle(x, y - 60, x - 25, y, x + 25, y);
    forestBg.triangle(x, y - 80, x - 20, y - 30, x + 20, y - 30);
  }
  
  // Add some fallen logs and rocks
  for (let i = 0; i < 15; i++) {
    let x = random(width);
    let y = random(height * 0.7, height); // Only on ground
    forestBg.fill(trunkColor[0] + 10, trunkColor[1] + 10, trunkColor[2] + 10);
    forestBg.ellipse(x, y, random(30, 80), random(10, 20));
  }
  
  // Add creepy details in higher levels
  if (level > 6) {
    // Add some random dark spots that look like eyes
    for (let i = 0; i < 5; i++) {
      let x = random(width);
      let y = random(height * 0.7); // Keep above ground
      forestBg.fill(0, 0, 0, 30);
      forestBg.ellipse(x, y, 20, 20);
    }
  }
}

// Draw function - main game loop
function draw() {
  // Clear the canvas
  clear();
  
  // Draw the forest background
  if (forestBg) {
    image(forestBg, 0, 0);
  } else {
    background(20, 25, 20);
  }
  
  // Debug information
  push();
  fill(255);
  noStroke();
  textSize(12);
  textAlign(LEFT, TOP);
  text(`Game State: ${gameState}`, 10, 10);
  text(`Assets Loaded: ${customAssets.loaded}`, 10, 30);
  text(`Loading: ${customAssets.loading}`, 10, 50);
  text(`Loaded Assets: ${customAssets.loadCount}/${customAssets.totalAssets}`, 10, 70);
  pop();
  
  // Show loading screen if assets are not loaded
  if (!customAssets.loaded || customAssets.loading) {
    push();
    fill(0, 0, 0, 200);
    noStroke();
    rect(0, 0, width, height);
    
    fill(255);
    textSize(24);
    textAlign(CENTER, CENTER);
    text('Loading assets...', width/2, height/2);
    
    // Show loading progress
    textSize(16);
    text(`${customAssets.loadCount}/${customAssets.totalAssets} assets loaded`, width/2, height/2 + 30);
    pop();
    return;
  }
  
  // Draw different screens based on game state
  if (gameState === 'intro') {
    drawIntroScreen();
  } else if (gameState === 'playing') {
    // Handle killer movement
    if (killer) {
      // Get movement speed (doubled if speed boost power-up is active)
      const moveSpeed = killerPowerUps.isPowerUpActive("Speed Boost") ? killer.speed * 2 : killer.speed;
      
      // Handle keyboard movement with arrow keys
      if (keyIsDown(LEFT_ARROW)) {
        killer.x -= moveSpeed;
        killer.moving = true;
        killer.walkFrame = (killer.walkFrame + 1) % WALK_CYCLE_FRAMES;
      }
      if (keyIsDown(RIGHT_ARROW)) {
        killer.x += moveSpeed;
        killer.moving = true;
        killer.walkFrame = (killer.walkFrame + 1) % WALK_CYCLE_FRAMES;
      }
      if (keyIsDown(UP_ARROW)) {
        killer.y -= moveSpeed;
        killer.moving = true;
        killer.walkFrame = (killer.walkFrame + 1) % WALK_CYCLE_FRAMES;
      }
      if (keyIsDown(DOWN_ARROW)) {
        killer.y += moveSpeed;
        killer.moving = true;
        killer.walkFrame = (killer.walkFrame + 1) % WALK_CYCLE_FRAMES;
      }
      
      // Keep killer within bounds
      killer.x = constrain(killer.x, killer.size/2, width - killer.size/2);
      killer.y = constrain(killer.y, killer.size/2, height - killer.size/2);
    }
    
    // Update positions
    updateCampers();
    updateDetectives();
    
    // Draw game elements
    if (campers) {
      for (let camper of campers) {
        drawCamper(camper);
      }
    }
    
    if (detectives) {
      for (let detective of detectives) {
        drawDetective(detective);
      }
    }
    
    if (killer) {
      drawKiller();
    }
    
    if (blood) {
      drawBlood();
    }
    
    if (killerPowerUps && killerPowerUps.active) {
      drawPowerUpUI();
    }
    
    drawHUD();
  } else if (gameState === 'gameover') {
    drawGameOver();
  } else if (gameState === 'victory') {
    drawVictory();
  } else if (gameState === 'levelComplete') {
    drawLevelComplete();
  }
  
  // Apply screen shake if active
  if (screenShake > 0) {
    screenShake--;
  }
  
  // Update power-up duration
  if (killerPowerUps) {
    killerPowerUps.updatePowerUp();
  }
  
  // Update frame counter for animations
  frameCounter++;
  
  // Update special events
  specialEvents.update();
  
  // Draw notifications
  for (let i = notifications.length - 1; i >= 0; i--) {
    const notif = notifications[i];
    notif.duration -= deltaTime;
    notif.alpha = map(notif.duration, 3000, 0, 255, 0);
    
    if (notif.duration <= 0) {
      notifications.splice(i, 1);
      continue;
    }
    
    push();
    fill(0, 0, 0, notif.alpha * 0.5);
    noStroke();
    rect(10, 150, 300, 80);
    
    fill(255, 255, 0, notif.alpha);
    textSize(24);
    textAlign(LEFT, TOP);
    text(notif.title, 20, 160);
    
    fill(255, notif.alpha);
    textSize(16);
    text(notif.message, 20, 190);
    pop();
  }
}

// Function to draw the intro screen
function drawIntroScreen() {
  push();
  
  // Semi-transparent background
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  
  // Title
  fill(255, 0, 0);
  textSize(64);
  textAlign(CENTER, CENTER);
  text('CAMP KILL', width/2, height/4);
  
  // Story text
  fill(255);
  textSize(24);
  textAlign(CENTER, CENTER);
  for (let i = 0; i < storyText.length; i++) {
    text(storyText[i], width/2, height/2 - 50 + (i * 40));
  }
  
  // Start prompt
  fill(255, 255, 0);
  textSize(32);
  text('Press SPACE to begin the hunt', width/2, height * 3/4);
  
  pop();
}

// Function to draw the killer
function drawKiller() {
  push();
  
  // Apply screen shake
  translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  
  // Draw killer sprite if available and not invisible
  if (customAssets.killer && !killer.invisible) {
    // Draw the killer sprite with proper scaling
    imageMode(CENTER);
    image(
      customAssets.killer,
      killer.x,
      killer.y,
      killer.size,
      killer.size
    );
    imageMode(CORNER);
  } else if (!killer.invisible) {
    // Fallback drawing if sprite not loaded
    fill(0); // Black color for killer
    noStroke();
    ellipse(killer.x, killer.y, killer.size);
  }
  
  // Draw knife if killer is attacking
  if (killer.attacking && !killer.invisible) {
    push();
    // Calculate angle to mouse
    let angle = atan2(mouseY - killer.y, mouseX - killer.x);
    translate(killer.x, killer.y);
    rotate(angle);
    
    // Draw knife
    fill(200); // Silver color
    noStroke();
    rect(0, -5, 30, 10); // Knife blade
    fill(100); // Darker color for handle
    rect(30, -8, 15, 16); // Knife handle
    
    pop();
  }
  
  // Draw visibility indicator
  if (killerVisible) {
    // Draw a red glow around the killer when visible
    for (let i = 0; i < 3; i++) {
      const glowSize = killer.size + (i * 10);
      const glowAlpha = 100 - (i * 30);
      fill(255, 0, 0, glowAlpha);
      noStroke();
      ellipse(killer.x, killer.y, glowSize);
    }
  }
  
  pop();
}

// Function to draw a camper
function drawCamper(camper) {
  push();
  
  // Apply screen shake
  translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  
  // Draw glow effect if active
  if (camper.glowing) {
    // Draw outer glow
    for (let i = 0; i < 3; i++) {
      const glowSize = camper.size + (i * 10);
      const glowAlpha = 100 - (i * 30);
      fill(255, 255, 0, glowAlpha);
      noStroke();
      ellipse(camper.x, camper.y, glowSize);
    }
  }
  
  // Calculate movement direction
  let movementAngle = camper.angle;
  if (camper.moving) {
    // Calculate the actual movement direction based on position changes
    const dx = camper.x - camper.lastX;
    const dy = camper.y - camper.lastY;
    if (dx !== 0 || dy !== 0) {
      movementAngle = atan2(dy, dx);
    }
  }
  
  // Store current position for next frame
  camper.lastX = camper.x;
  camper.lastY = camper.y;
  
  // Draw camper with rotation
  push();
  translate(camper.x, camper.y);
  rotate(movementAngle);
  
  // Draw camper sprite if available
  if (customAssets.campers && customAssets.campers[camper.type]) {
    // Draw the camper sprite with proper scaling
    imageMode(CENTER);
    image(
      customAssets.campers[camper.type],
      0,
      0,
      camper.size,
      camper.size
    );
    imageMode(CORNER);
  } else {
    // Fallback drawing if sprite not loaded
    fill(colors[camper.type][0], colors[camper.type][1], colors[camper.type][2]);
    noStroke();
    ellipse(0, 0, camper.size);
  }
  pop();
  
  // Draw fear effect if camper is scared
  if (camper.fear > 0.5) {
    // Draw exclamation mark
    fill(255, 0, 0);
    textSize(20);
    textAlign(CENTER, CENTER);
    text('!', camper.x, camper.y - 30);
  }
  
  pop();
}

// Function to draw a detective
function drawDetective(detective) {
  push();
  
  // Apply screen shake
  translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  
  // Draw detective sprite if available
  if (customAssets.detective) {
    // Draw the detective sprite with proper scaling
    imageMode(CENTER);
    image(
      customAssets.detective,
      detective.x,
      detective.y,
      detective.size,
      detective.size
    );
    imageMode(CORNER);
  } else {
    // Fallback drawing if sprite not loaded
    fill(100, 100, 100); // Gray color for detectives
    noStroke();
    ellipse(detective.x, detective.y, detective.size);
  }
  
  // Draw flashlight beam
  push();
  // Draw flashlight cone
  fill(255, 255, 200, 30); // Yellow-white with transparency
  noStroke();
  arc(detective.x, detective.y, detective.flashlightRange * 2, detective.flashlightRange * 2, 
      detective.flashlightAngle - detective.flashlightWidth/2, 
      detective.flashlightAngle + detective.flashlightWidth/2);
  pop();
  
  pop();
}

// Function to draw power-up UI
function drawPowerUpUI() {
  if (!killerPowerUps.active) return;
  
  push();
  
  // Draw background panel with lower opacity
  fill(0, 0, 0, 100);
  noStroke();
  rect(10, height - 70, 250, 60);
  
  // Draw power-up icon
  fill(255, 255, 0);
  noStroke();
  textSize(30);
  textAlign(LEFT, CENTER);
  
  // Draw different icons based on power-up type
  switch(killerPowerUps.active.icon) {
    case "shield":
      text("🛡️", 15, height - 45);
      break;
    case "lightning":
      text("⚡", 15, height - 45);
      break;
    case "exclamation":
      text("⚠️", 15, height - 45);
      break;
    case "ghost":
      text("👻", 15, height - 45);
      break;
    case "ripple":
      text("🌊", 15, height - 45);
      break;
    default:
      text("✨", 15, height - 45);
  }
  
  // Draw power-up name
  fill(255);
  textSize(18);
  textAlign(LEFT, CENTER);
  text(killerPowerUps.active.name, 55, height - 45);
  
  // Draw duration bar
  const barWidth = 230;
  const barHeight = 4;
  const progress = killerPowerUps.duration / killerPowerUps.active.duration;
  
  // Background
  fill(50);
  rect(15, height - 25, barWidth, barHeight);
  
  // Progress
  fill(0, 255, 0);
  rect(15, height - 25, barWidth * progress, barHeight);
  
  pop();
}

// Function to draw HUD (score, level, etc.)
function drawHUD() {
  push();
  fill(255);
  noStroke();
  textSize(20);
  textAlign(RIGHT, TOP);
  text(`Score: ${score}`, width - 10, 10);
  text(`Level: ${level}`, width - 10, 40);
  
  // Draw combo
  if (combo > 1) {
    const comboText = `${combo}x COMBO!`;
    const comboWidth = textWidth(comboText);
    fill(255, 0, 0);
    textSize(24);
    text(comboText, width - 10, 70);
    
    // Draw combo multiplier
    fill(255, 255, 0);
    textSize(20);
    text(`${comboMultiplier.toFixed(1)}x Score`, width - 10, 100);
  }
  
  pop();
}

// Function to draw game over screen
function drawGameOver() {
  push();
  // Semi-transparent background
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Game over text
  fill(255, 0, 0);
  textSize(48);
  textAlign(CENTER, CENTER);
  text('GAME OVER', width/2, height/2 - 50);
  
  // Score and kills
  fill(255);
  textSize(24);
  text(`Final Score: ${score}`, width/2, height/2 + 10);
  text(`Total Kills: ${levelKills}`, width/2, height/2 + 40);
  
  // Restart prompt
  textSize(20);
  text('Press R to restart', width/2, height/2 + 90);
  pop();
}

// Function to draw victory screen
function drawVictory() {
  push();
  // Semi-transparent background
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Victory text
  fill(0, 255, 0);
  textSize(48);
  textAlign(CENTER, CENTER);
  text('VICTORY!', width/2, height/2 - 50);
  
  // Score
  fill(255);
  textSize(24);
  text(`Final Score: ${score}`, width/2, height/2 + 10);
  
  // Restart prompt
  textSize(20);
  text('Press SPACE to play again', width/2, height/2 + 50);
  pop();
}

// Function to draw level complete screen
function drawLevelComplete() {
  push();
  
  // Draw the forest background first
  if (forestBg) {
    image(forestBg, 0, 0);
  }
  
  // Semi-transparent black overlay
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Level complete text
  fill(255, 255, 0);
  textSize(48);
  textAlign(CENTER, CENTER);
  text('LEVEL COMPLETE!', width/2, height/2 - 50);
  
  // Kills and score
  fill(255);
  textSize(24);
  text(`Kills: ${levelKills}`, width/2, height/2 + 10);
  text(`Score: ${score}`, width/2, height/2 + 40);
  
  // Next level prompt
  textSize(20);
  text('Press SPACE to start next level', width/2, height/2 + 90);
  
  pop();
}

// Function to initialize a new level
function initializeLevel() {
  console.log("Initializing level...");
  
  // Clear existing arrays
  campers = [];
  detectives = [];
  blood = [];
  
  try {
    // Calculate number of campers and detectives based on level
    const numCampers = min(6 + level * 4, 30); // Doubled from (3 + level * 2, 15)
    
    // Adjust detective count based on level
    let numDetectives;
    if (level < 3) {
      numDetectives = 1; // Only one detective for first two levels
    } else {
      numDetectives = min(1 + Math.floor((level - 2) / 2), 5); // Start adding more from level 3
    }
    
    // Create campers with larger size and slower speed
    for (let i = 0; i < numCampers; i++) {
      const pos = getSafePosition(killer.x, killer.y, 200);
      campers.push({
        x: pos.x,
        y: pos.y,
        size: 60,
        speed: 2,
        type: floor(random(3)),
        fear: 0,
        lastMoveTime: 0,
        walkFrame: 0,
        moving: false,
        angle: random(TWO_PI),
        glowing: false
      });
    }
    
    // Create detectives with slower initial speed and adjusted progression
    for (let i = 0; i < numDetectives; i++) {
      // Spawn new detective
      // Choose a random corner
      const corner = random([
        { x: 0, y: 0 }, // Top-left
        { x: width, y: 0 }, // Top-right
        { x: 0, y: height }, // Bottom-left
        { x: width, y: height } // Bottom-right
      ]);
      
      detectives.push({
        x: corner.x,
        y: corner.y,
        size: 70,
        speed: 2 + (level * 0.15),
        angle: random(TWO_PI),
        hasFlashlight: true,
        lastMoveTime: 0,
        walkFrame: 0,
        moving: false,
        searching: false,
        flashlightAngle: random(TWO_PI),
        flashlightRange: 150 + (level * 20),
        flashlightWidth: PI/4 + (level * PI/40)
      });
    }
    
    // Reset power-up system
    killerPowerUps.active = null;
    killerPowerUps.duration = 0;
    killerPowerUps.killCounter = 0;
    
    // Always redraw the background for the new level
    drawForestBackground();
    
    // Set game state to playing
    gameState = 'playing';
    
    console.log(`Level ${level} initialized with ${numCampers} campers and ${numDetectives} detectives`);
    
    // Increased chance of special events based on level
    const eventChance = min(0.3 + (level * 0.1), 0.8); // Starts at 30% and increases up to 80%
    if (random(1) < eventChance) {
      specialEvents.triggerRandomEvent();
    }
    
    // Reset detective respawn timer
    detectiveRespawnTimer = 0;
    
  } catch (e) {
    debugLog('Level initialization failed: ' + e);
  }
}

// Update camper positions
function updateCampers() {
  if (gameState !== 'playing') return;
  
  if (campers) {
    for (let i = campers.length - 1; i >= 0; i--) {
      const camper = campers[i];
      
      // Check for collision with killer
      const dx = camper.x - killer.x;
      const dy = camper.y - killer.y;
      const distanceToKiller = sqrt(dx * dx + dy * dy);
      
      // Kill camper if killer touches them
      if (distanceToKiller < (killer.size + camper.size) / 2) {
        // Kill camper
        campers.splice(i, 1);
        
        // Combo system
        const currentTime = millis();
        if (currentTime - lastKillTime < COMBO_TIMEOUT) {
          combo++;
          comboMultiplier = min(combo * 0.5 + 1, 5); // Max 5x multiplier
        } else {
          combo = 1;
          comboMultiplier = 1;
        }
        lastKillTime = currentTime;
        
        // Score with combo multiplier
        score += 100 * comboMultiplier;
        levelKills++;
        
        // Add blood effect
        for (let j = 0; j < 10; j++) {
          blood.push({
            x: camper.x + random(-20, 20),
            y: camper.y + random(-20, 20),
            size: random(5, 15),
            alpha: 255
          });
        }

        // Check for power-up trigger
        killerPowerUps.killCounter++;
        if (killerPowerUps.shouldTriggerPowerUp()) {
          const randomPowerUp = floor(random(killerPowerUps.availablePowerUps.length));
          killerPowerUps.activatePowerUp(randomPowerUp);
        }

        // Check if this was the last camper
        if (campers.length === 0) {
          console.log("All campers killed - transitioning to level complete");
          gameState = 'levelComplete';
          return;
        }
        
        continue;
      }
      
      // Move away from killer if too close
      if (distanceToKiller < 200) { // Increased detection range
        // Calculate direction away from killer
        const angle = atan2(dy, dx);
        const moveX = cos(angle) * camper.speed;
        const moveY = sin(angle) * camper.speed;
        
        // Move camper
        camper.x += moveX;
        camper.y += moveY;
        
        // Update movement state
        camper.moving = true;
        camper.walkFrame = (camper.walkFrame + 1) % WALK_CYCLE_FRAMES;
      } else {
        // Random movement when not fleeing
        if (random(1) < 0.05) { // Increased from 0.02 to 0.05 for more frequent direction changes
          camper.angle = random(TWO_PI);
        }
        
        // Move in current direction
        camper.x += cos(camper.angle) * camper.speed;
        camper.y += sin(camper.angle) * camper.speed;
        camper.moving = true;
        camper.walkFrame = (camper.walkFrame + 1) % WALK_CYCLE_FRAMES;
      }
      
      // Keep camper within bounds
      camper.x = constrain(camper.x, camper.size/2, width - camper.size/2);
      camper.y = constrain(camper.y, camper.size/2, height - camper.size/2);
      
      // Update fear level based on distance to killer
      camper.fear = map(distanceToKiller, 0, 200, 1, 0);
    }
  }
  
  // Check if all campers are dead after all updates
  if (campers && campers.length === 0 && gameState === 'playing') {
    console.log("All campers killed - transitioning to level complete");
    gameState = 'levelComplete';
  }
}

// Update detective positions
function updateDetectives() {
  if (gameState !== 'playing') return;
  
  // Update respawn timer
  if (detectiveRespawnTimer > 0) {
    detectiveRespawnTimer -= deltaTime;
    if (detectiveRespawnTimer <= 0) {
      // Spawn new detective
      const pos = getSafePosition(killer.x, killer.y, 300);
      detectives.push({
        x: pos.x,
        y: pos.y,
        size: 70,
        speed: 2 + (level * 0.15),
        angle: random(TWO_PI),
        hasFlashlight: true,
        lastMoveTime: 0,
        walkFrame: 0,
        moving: false,
        searching: false,
        flashlightAngle: random(TWO_PI),
        flashlightRange: 150 + (level * 20),
        flashlightWidth: PI/4 + (level * PI/40)
      });
      
      // Show notification
      showNotification("New Detective", "A new detective has arrived!");
    }
  }
  
  if (detectives) {
    for (let i = detectives.length - 1; i >= 0; i--) {
      const detective = detectives[i];
      
      // Calculate distance to killer
      const dx = killer.x - detective.x;
      const dy = killer.y - detective.y;
      const distanceToKiller = sqrt(dx * dx + dy * dy);
      
      // Check if killer is in flashlight beam
      const angleToKiller = atan2(dy, dx);
      const angleDiff = abs(angleToKiller - detective.flashlightAngle);
      const isInBeam = distanceToKiller <= detective.flashlightRange && 
                      angleDiff <= detective.flashlightWidth/2;
      
      // Update killer visibility
      if (isInBeam && !killer.invisible) {
        killerVisible = true;
      }
      
      // Check for collision with killer
      if (distanceToKiller < (killer.size + detective.size) / 4) {
        // If killer has Invincibility power-up, kill the detective
        if (killerPowerUps.isPowerUpActive("Invincibility")) {
          // Remove the detective
          detectives.splice(i, 1);
          
          // Add blood effect
          for (let j = 0; j < 10; j++) {
            blood.push({
              x: detective.x + random(-20, 20),
              y: detective.y + random(-20, 20),
              size: random(5, 15),
              alpha: 255
            });
          }
          
          // Add score for killing detective
          score += 200;
          
          // Show notification
          showNotification("Detective Eliminated", "The detective has been eliminated!");
          
          // Start respawn timer if no detectives left
          if (detectives.length === 0) {
            detectiveRespawnTimer = DETECTIVE_RESPAWN_DELAY;
          }
        }
        // If killer doesn't have Invincibility and is visible, game over
        else if (killerVisible) {
          gameState = 'gameover';
          return;
        }
      }
      
      // Move towards killer only if visible and game is playing
      if (killerVisible && gameState === 'playing') {
        const angle = atan2(dy, dx);
        const moveX = cos(angle) * detective.speed;
        const moveY = sin(angle) * detective.speed;
        
        detective.x += moveX;
        detective.y += moveY;
        
        // Update movement state
        detective.moving = true;
        detective.walkFrame = (detective.walkFrame + 1) % WALK_CYCLE_FRAMES;
      } else {
        // Random movement when killer is not visible
        if (random(1) < 0.02) {
          detective.flashlightAngle = random(TWO_PI);
        }
        
        // Move in current direction
        detective.x += cos(detective.flashlightAngle) * detective.speed * 0.5;
        detective.y += sin(detective.flashlightAngle) * detective.speed * 0.5;
      }
      
      // Keep detective within bounds
      detective.x = constrain(detective.x, detective.size/2, width - detective.size/2);
      detective.y = constrain(detective.y, detective.size/2, height - detective.size/2);
    }
  }
}

// Add keyboard event handlers
function keyPressed() {
  if (key === ' ') {
    if (gameState === 'intro') {
      // Start the game
      gameState = 'playing';
      initializeLevel();
    } else if (gameState === 'levelComplete') {
      // Start next level
      level++;
      levelKills = 0; // Reset level kills
      
      // Check if game is complete
      if (level > maxLevel) {
        gameState = 'victory';
        return;
      }
      
      // Initialize next level
      initializeLevel();
    } else if (gameState === 'gameover' || gameState === 'victory') {
      // Reset game state
      gameState = 'playing';
      score = 0;
      level = 1;
      levelKills = 0;
      lastLevel = 1;
      
      // Reset killer position
      killer.x = width / 2;
      killer.y = height / 2;
      
      // Initialize new level
      initializeLevel();
    }
  } else if (key === 'r' || key === 'R') {
    if (gameState === 'gameover' || gameState === 'victory') {
      // Reset game state
      gameState = 'playing';
      score = 0;
      level = 1;
      levelKills = 0;
      lastLevel = 1;
      
      // Reset killer position
      killer.x = width / 2;
      killer.y = height / 2;
      
      // Initialize new level
      initializeLevel();
    }
  }
}

// Function to draw blood effects
function drawBlood() {
  // Draw each blood particle
  for (let particle of blood) {
    push();
    
    // Apply screen shake
    translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
    
    // Draw blood particle
    fill(150, 0, 0, particle.alpha); // Red color with transparency
    noStroke();
    ellipse(particle.x, particle.y, particle.size);
    
    // Update particle
    particle.alpha -= 0.5; // Fade out
    particle.size -= 0.1; // Shrink
    
    // Remove particle if it's too small or transparent
    if (particle.alpha <= 0 || particle.size <= 0) {
      let index = blood.indexOf(particle);
      if (index > -1) {
        blood.splice(index, 1);
      }
    }
    
    pop();
  }
}