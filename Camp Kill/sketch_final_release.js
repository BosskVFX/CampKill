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
let lastTime = 0; // Add lastTime variable for deltaTime calculation
let deltaTime = 0; // Add deltaTime variable
const COMBO_TIMEOUT = 2000; // 2 seconds to maintain combo
let killerVisible = false; // Track if killer is visible to detectives
let detectiveRespawnTimer = 0;
const DETECTIVE_RESPAWN_DELAY = 3000; // 3 seconds delay before respawning
let horrorFont; // Add horror font variable
let detectivesCaught = 0; // Track how many detectives were caught

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
      duration: 5000, // 5000 milliseconds (5 seconds)
      icon: "shield"
    },
    {
      name: "Speed Boost",
      description: "Double movement speed for 5 seconds.",
      duration: 5000, // 5000 milliseconds (5 seconds)
      icon: "lightning"
    },
    {
      name: "Camper Panic",
      description: "All campers enter high fear state for 5 seconds.",
      duration: 5000, // 5000 milliseconds (5 seconds)
      icon: "exclamation"
    },
    {
      name: "Shadow Step",
      description: "Invisible to detectives unless very close for 5 seconds.",
      duration: 5000, // 5000 milliseconds (5 seconds)
      icon: "ghost"
    },
    {
      name: "Intimidation",
      description: "Slows all nearby campers and detectives for 5 seconds.",
      duration: 5000, // 5000 milliseconds (5 seconds)
      icon: "ripple"
    }
  ],
  activatePowerUp: function(index) {
    // Don't activate if a power-up is already active
    if (this.active) return;
    
    if (index >= 0 && index < this.availablePowerUps.length) {
      this.active = this.availablePowerUps[index];
      this.duration = this.active.duration;
      this.startTime = millis(); // Store the current time when activated
      
      console.log(`Power-up activated: ${this.active.name}, duration: ${this.duration}ms`);
      
      // Show notification based on power-up type
      let icon = "✨";
      let message = `Activated for ${this.duration/1000} seconds`;
      
      switch(this.active.name) {
        case "Invincibility":
          icon = "🛡️";
          message = "You can kill detectives!";
          break;
        case "Speed Boost":
          icon = "⚡";
          message = "Move twice as fast!";
          break;
        case "Camper Panic":
          icon = "⚠️";
          message = "Campers are afraid!";
          break;
        case "Shadow Step":
          icon = "👻";
          message = "Invisible to detectives unless close!";
          // Extra effect for Shadow Step - make killer briefly flash
          killer.flashing = true;
          setTimeout(() => { killer.flashing = false; }, 500);
          break;
        case "Intimidation":
          icon = "🌊";
          message = "Nearby characters are slowed!";
          break;
      }
      
      showNotification(this.active.name, message, icon);
      gameState = 'playing';
    } else {
      console.log('Invalid power-up index:', index);
      this.active = null;
      this.duration = 0;
      this.startTime = 0;
      gameState = 'playing';
    }
  },
  updatePowerUp: function() {
    if (this.active) {
      // Check how much time has elapsed since power-up activation
      const currentTime = millis();
      const elapsedTime = currentTime - this.startTime;
      
      // If we've exceeded the duration, end the power-up
      if (elapsedTime >= this.active.duration) {
        const powerUpName = this.active.name;
        console.log(`Power-up ended: ${powerUpName} after ${elapsedTime}ms`);
        
        // Show notification that power-up ended
        showNotification("Power-Up Ended", `${powerUpName} has worn off`, "⏱️");
        
        this.active = null;
        this.duration = 0;
        this.startTime = 0;
        // Reset kill counter when power-up ends
        this.killCounter = 0;
        gameState = 'playing';
      } else {
        // Update remaining duration
        this.duration = this.active.duration - elapsedTime;
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

// Text rendering helper functions for consistent text display
function drawTextWithShadow(content, x, y, textSize, fillColor, alignX = CENTER, alignY = CENTER) {
  push();
  textAlign(alignX, alignY);
  textSize(textSize);
  
  // Black shadow for readability on any background
  fill(0);
  text(content, x + 2, y + 2);
  
  // Main text
  fill(fillColor);
  text(content, x, y);
  pop();
}

function drawTitle(content, x, y, textSize, fillColor) {
  push();
  textAlign(CENTER, CENTER);
  textSize(textSize);
  
  // Larger black shadow for titles
  fill(0);
  text(content, x + 3, y + 3);
  
  // Main title text
  fill(fillColor);
  text(content, x, y);
  pop();
}

function drawButtonText(content, x, y, buttonWidth, buttonHeight, textSize, textColor, shadowColor) {
  push();
  textAlign(CENTER, CENTER);
  textSize(textSize);
  
  // Black base shadow
  fill(0);
  text(content, x + buttonWidth/2 + 2, y + buttonHeight/2 + 2);
  
  // Colored shadow
  fill(shadowColor);
  text(content, x + buttonWidth/2 + 1, y + buttonHeight/2 + 1);
  
  // Main text
  fill(textColor);
  text(content, x + buttonWidth/2, y + buttonHeight/2);
  pop();
}

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
function showNotification(title, message, icon = "✨") {
  // Remove any existing notifications with the same title
  notifications = notifications.filter(n => n.title !== title);
  
  // Add new notification with simplified message
  notifications.push({
    title: title,
    message: message, // Just the power-up name
    icon: icon,
    duration: 3000, // 3 seconds duration
    alpha: 255,
    startTime: millis()
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

// Supabase Configuration - using values from index.html
// const SUPABASE_URL = 'https://nqnxcqvxyboqmwzvrowt.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xbnhjcXZ4eWJvcW13enZyb3d0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MjMyMDcsImV4cCI6MjA1OTE5OTIwN30.kTK0mFYpWs1qMfvtBu-Ei9xI-jofiYDF94BHmqhMJ_w';
let supabase;

// Leaderboard UI State
let leaderboardState = {
  showEmailInput: false,
  email: '',
  submitting: false,
  showLeaderboard: false,
  scores: [],
  loading: false,
  error: null
};

// Social Sharing State
let sharingState = {
  showShareOptions: false,
  shareUrl: window.location.href,
  shareText: ''
};

// Initialize Supabase client
function initSupabase() {
  try {
    console.log("Initializing Supabase connection...");
    
    // If we can't find the global supabase object, create a minimal mock
    if (typeof supabaseJs === 'undefined' && 
        typeof supabase === 'undefined' &&
        typeof window.supabase === 'undefined' &&
        typeof window.supabaseJs === 'undefined') {
      
      console.warn("Creating a mock Supabase client as the real one couldn't be found");
      
      // Create a simple mock client that logs operations but doesn't fail
      supabase = {
        _isMock: true, // Flag to identify this as a mock client
        from: function(table) {
          return {
            select: function() {
              console.log(`Mock select from ${table}`);
              return {
                order: function() {
                  return {
                    limit: function() {
                      console.log(`Mock query: select from ${table}`);
                      return Promise.resolve({ data: [], error: null });
                    }
                  };
                }
              };
            },
            insert: function(data) {
              console.log(`Mock insert into ${table}:`, data);
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
      
      console.log("Mock Supabase client created successfully");
      return;
    }
    
    // Try different ways to access the Supabase client
    const supabaseClient = 
      typeof supabaseJs !== 'undefined' ? supabaseJs : 
      typeof supabase !== 'undefined' ? supabase :
      typeof window.supabase !== 'undefined' ? window.supabase :
      typeof window.supabaseJs !== 'undefined' ? window.supabaseJs : null;
    
    if (!supabaseClient) {
      console.error("Supabase library not loaded. Make sure to include the Supabase script in your HTML.");
      document.getElementById('debug').innerHTML = "Error: Supabase library not loaded";
      return;
    }
    
    // Access globals defined in index.html
    if (typeof window.SUPABASE_URL === 'undefined' || typeof window.SUPABASE_ANON_KEY === 'undefined') {
      console.error("Could not find Supabase configuration in window object");
      document.getElementById('debug').innerHTML = "Error: Could not find Supabase configuration";
      return;
    }
    
    // Use the window-level variables
    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;
    
    console.log("Using Supabase configuration from window object:", url);
    
    if (!url || !key) {
      console.error("Supabase URL or key is missing");
      document.getElementById('debug').innerHTML = "Error: Supabase configuration missing";
      return;
    }
    
    supabase = supabaseClient.createClient(url, key);
    console.log("Supabase client initialized successfully");
  } catch (error) {
    console.error("Error initializing Supabase client:", error);
    document.getElementById('debug').innerHTML = "Error initializing Supabase: " + error.message;
    
    // Create a fallback mock Supabase client that won't crash the game
    console.warn("Creating a fallback mock Supabase client");
    supabase = {
      _isMock: true, // Flag to identify this as a mock client
      from: function(table) {
        return {
          select: function() {
            console.log(`Mock select from ${table}`);
            return {
              order: function() {
                return {
                  limit: function() {
                    console.log(`Mock query: select from ${table}`);
                    return Promise.resolve({ data: [], error: null });
                  }
                };
              }
            };
          },
          insert: function(data) {
            console.log(`Mock insert into ${table}:`, data);
            return Promise.resolve({ data: null, error: null });
          }
        };
      }
    };
  }
}

// Preload function - this runs before setup
function preload() {
  debugLog('Starting preload...');
  // Show loading message in UI
  if (document.getElementById('loading')) {
    document.getElementById('loading').innerHTML = 'Loading game assets... Please wait.';
  }
  
  // Set asset loading state
  customAssets = {
    campers: [],
    killer: null,
    detective: null,
    loaded: false,
    loading: true,
    loadCount: 0,
    expectedCount: 5, // 1 killer + 1 detective + 3 campers
    totalAssets: 5, // Update to match expectedCount for consistency
    errors: []
  };
  
  // Load assets sequentially with better error reporting
  loadKillerAsset()
    .then(() => {
      debugLog('Killer asset loaded or fallback created, proceeding with other assets');
      return loadCamperAssets();
    })
    .then(() => {
      debugLog('Camper assets loaded or fallbacks created, proceeding with detective');
      return loadDetectiveAsset();
    })
    .catch(err => {
      console.error('Asset loading chain failed:', err);
      debugLog('Asset loading error: ' + err.message);
      customAssets.errors.push(err.message);
    })
    .finally(() => {
      // Final check regardless of success/failure
      setTimeout(() => {
        checkLoadingComplete();
        hideLoadingMessage();
      }, 1000);
    });
}

// Function to load the killer asset
function loadKillerAsset() {
  return new Promise((resolve, reject) => {
    console.log("Loading killer sprite with absolute path...");
    
    try {
      // Show specific assets being loaded in UI
      updateLoadingMessage('Loading killer sprite...');
      
      // Try with absolute path
      const killerPath = 'assets/images/killer.png';
      console.log("Attempting to load killer from:", killerPath);
      
      loadImage(
        killerPath,
        (img) => {
          console.log('Successfully loaded killer sprite');
          customAssets.killer = img;
          customAssets.loadCount++;
          resolve();
        },
        (err) => {
          console.error(`Failed to load killer sprite: ${err}`);
          updateLoadingMessage('Creating fallback for killer sprite...');
          
          // Create more detailed fallback killer sprite
          let fallback = createGraphics(80, 80);
          fallback.background(30, 30, 30, 0);
          // Body
          fallback.fill(120, 0, 0);
          fallback.noStroke();
          fallback.ellipse(40, 40, 60);
          // Mask
          fallback.fill(255);
          fallback.rect(25, 25, 30, 25, 5);
          // Eyes
          fallback.fill(0);
          fallback.ellipse(32, 35, 6, 8);
          fallback.ellipse(48, 35, 6, 8);
          // Knife
          fallback.fill(200);
          fallback.rect(55, 45, 20, 5);
          fallback.fill(100);
          fallback.rect(65, 42, 10, 10);
          
          customAssets.killer = fallback;
          customAssets.loadCount++;
          customAssets.errors.push('Killer sprite failed to load, using fallback');
          resolve();
        }
      );
    } catch (e) {
      console.error(`Error in killer sprite loading: ${e}`);
      updateLoadingMessage('Error loading killer sprite, creating fallback...');
      
      // Create emergency fallback for killer
      let fallback = createGraphics(80, 80);
      fallback.fill(255, 0, 0);
      fallback.noStroke();
      fallback.ellipse(40, 40, 60);
      customAssets.killer = fallback;
      customAssets.loadCount++;
      customAssets.errors.push('Exception loading killer sprite: ' + e.message);
      resolve();
    }
  });
}

// Function to load the camper assets
function loadCamperAssets() {
  return new Promise((resolve, reject) => {
    console.log("Loading camper sprites...");
    updateLoadingMessage('Loading camper sprites...');
    
    let loadedCount = 0;
    const totalCampers = 3;
    
    // Create simple colors for fallback sprites
    const colors = [
      [255, 100, 100], // Red
      [100, 100, 255], // Blue
      [100, 255, 100]  // Green
    ];
    
    // Load each camper sprite
    for (let i = 0; i < totalCampers; i++) {
      try {
        const camperPath = `assets/images/camper${i+1}.png`;
        console.log(`Loading camper${i+1} from:`, camperPath);
        
        loadImage(
          camperPath,
          (img) => {
            console.log(`Successfully loaded camper${i+1}`);
            customAssets.campers[i] = img;
            customAssets.loadCount++;
            loadedCount++;
            
            if (loadedCount === totalCampers) {
              resolve();
            }
          },
          (err) => {
            console.error(`Failed to load camper${i+1}: ${err}`);
            
            // Create more detailed fallback sprite
            let fallback = createGraphics(60, 60);
            fallback.background(30, 30, 30, 0);
            // Body
            fallback.fill(colors[i][0], colors[i][1], colors[i][2]);
            fallback.noStroke();
            fallback.ellipse(30, 30, 40);
            // Face
            fallback.fill(255, 220, 180);
            fallback.ellipse(30, 25, 20, 25);
            // Eyes
            fallback.fill(0);
            fallback.ellipse(25, 20, 4, 6);
            fallback.ellipse(35, 20, 4, 6);
            // Mouth
            fallback.noFill();
            fallback.stroke(0);
            fallback.strokeWeight(2);
            fallback.arc(30, 30, 10, 5, 0, PI);
            
            customAssets.campers[i] = fallback;
            customAssets.loadCount++;
            customAssets.errors.push(`Camper${i+1} sprite failed to load, using fallback`);
            loadedCount++;
            
            if (loadedCount === totalCampers) {
              resolve();
            }
          }
        );
      } catch (e) {
        console.error(`Error loading camper${i+1}: ${e}`);
        
        // Create emergency fallback
        let fallback = createGraphics(60, 60);
        fallback.fill(colors[i][0], colors[i][1], colors[i][2]);
        fallback.ellipse(30, 30, 40);
        customAssets.campers[i] = fallback;
        customAssets.loadCount++;
        customAssets.errors.push(`Exception loading camper${i+1}: ${e.message}`);
        loadedCount++;
        
        if (loadedCount === totalCampers) {
          resolve();
        }
      }
    }
  });
}

// Function to load the detective asset
function loadDetectiveAsset() {
  return new Promise((resolve, reject) => {
    console.log("Loading detective sprite...");
    updateLoadingMessage('Loading detective sprite...');
    
    try {
      const detectivePath = 'assets/images/detective.png';
      console.log("Attempting to load detective from:", detectivePath);
      
      loadImage(
        detectivePath,
        (img) => {
          console.log('Successfully loaded detective sprite');
          customAssets.detective = img;
          customAssets.loadCount++;
          resolve();
        },
        (err) => {
          console.error(`Failed to load detective sprite: ${err}`);
          
          // Create more detailed fallback detective sprite
          let fallback = createGraphics(70, 70);
          fallback.background(30, 30, 30, 0);
          // Body
          fallback.fill(60, 60, 100);
          fallback.noStroke();
          fallback.ellipse(35, 35, 50);
          // Hat
          fallback.fill(40, 40, 80);
          fallback.arc(35, 25, 40, 30, PI, TWO_PI);
          fallback.rect(20, 25, 30, 5);
          // Face
          fallback.fill(240, 200, 160);
          fallback.ellipse(35, 35, 30, 35);
          // Eyes
          fallback.fill(0);
          fallback.ellipse(28, 30, 5, 7);
          fallback.ellipse(42, 30, 5, 7);
          // Flashlight
          fallback.fill(150);
          fallback.rect(50, 35, 15, 7);
          
          customAssets.detective = fallback;
          customAssets.loadCount++;
          customAssets.errors.push('Detective sprite failed to load, using fallback');
          resolve();
        }
      );
    } catch (e) {
      console.error(`Error loading detective: ${e}`);
      
      // Create emergency fallback
      let fallback = createGraphics(70, 70);
      fallback.fill(100, 100, 100);
      fallback.ellipse(35, 35, 50);
      customAssets.detective = fallback;
      customAssets.loadCount++;
      customAssets.errors.push('Exception loading detective: ' + e.message);
      resolve();
    }
  });
}

// Update loading message in the UI
function updateLoadingMessage(message) {
  if (document.getElementById('loading')) {
    document.getElementById('loading').innerHTML = message;
  }
  debugLog(message);
}

// Hide loading message when complete
function hideLoadingMessage() {
  if (document.getElementById('loading')) {
    if (customAssets.errors.length > 0) {
      document.getElementById('loading').innerHTML = 'Game loaded with some asset errors:<br>' + 
        customAssets.errors.join('<br>') + 
        '<br><br>Click to start the game anyway.';
      
      // Add click handler to dismiss the message
      document.getElementById('loading').onclick = function() {
        this.style.display = 'none';
      };
    } else {
      document.getElementById('loading').style.display = 'none';
    }
  }
}

// Check if all assets are loaded
function checkLoadingComplete() {
  console.log(`Asset loading status: ${customAssets.loadCount}/${customAssets.totalAssets} loaded`);
  
  if (customAssets.loadCount >= customAssets.expectedCount) {
    customAssets.loading = false;
    customAssets.loaded = true;
    console.log('All assets loaded or fallbacks created');
    debugLog('All assets loaded or fallbacks created');
    
    // Hide loading message
    hideLoadingMessage();
    
    // Auto transition to intro state when loading is complete
    if (gameState === 'loading') {
      gameState = 'intro';
      console.log('Automatically transitioning to intro state');
    }
    
    // Log any errors that occurred
    if (customAssets.errors.length > 0) {
      console.warn('Asset loading completed with errors:', customAssets.errors);
    }
  }
}

// Setup function - initialize the game
function setup() {
  createCanvas(1000, 600);
  
  // Set default font to Courier New for better readability
  textFont('Courier New');
  
  // Set up error handling for asset loading
  window.onerror = function(message, source, lineno, colno, error) {
    console.error("Game error:", message, error);
    showNotification("Game Error", message, "❌");
    return false; // Allow default error handling as well
  };
  
  // Initialize loading state if not already loaded
  if (!customAssets.loaded && !customAssets.loading) {
    console.log("Starting asset loading...");
    customAssets.loading = true;
    loadKillerAsset();
    loadCamperAssets();
    loadDetectiveAsset();
  }
  
  // Create placeholder background
  forestBg = createGraphics(width, height);
  drawForestBackground();
  
  // Initialize game state
  gameState = customAssets.loaded ? 'intro' : 'loading';
  
  // Initialize arrays
  campers = [];
  detectives = [];
  blood = [];
  notifications = [];
  
  // Initialize killer
  killer = {
    x: width / 2,
    y: height / 2,
    size: 80,
    speed: 5,
    walkFrame: 0,
    lastMoveTime: 0,
    moving: false,
    invisible: false
  };
  
  // Initialize leaderboard state
  leaderboardState = {
    scores: [],
    loading: false,
    error: null,
    showLeaderboard: false,
    showEmailInput: false,
    email: "",
    submitting: false
  };
  
  // Initialize sharing state
  sharingState = {
    showShareOptions: false,
    shareUrl: window.location.href
  };
  
  // Initialize Supabase client if configured
  if (typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_ANON_KEY !== 'undefined') {
    try {
      initSupabase();
    } catch (e) {
      console.error("Failed to initialize Supabase:", e);
    }
  } else {
    console.log("Supabase not configured, using mock client");
  }
  
  console.log("Game setup complete");
  
  // Initialize deltaTime to prevent large first frame
  lastTime = millis();
  deltaTime = 0;
  
  // Set lastLevel to 1 to prevent background regeneration first time
  lastLevel = 1;
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
  console.log("Drawing forest background...");
  
  // Create forestBg if it doesn't exist yet
  if (!forestBg) {
    console.log("Creating new forest background graphics buffer");
    forestBg = createGraphics(width, height);
  }
  
  // Clear the graphics buffer first
  forestBg.clear();
  
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
  
  // Log completion
  console.log("Forest background drawn successfully for level " + level);
  return forestBg;
}

// Draw function - main game loop
function draw() {
  // Update delta time
  deltaTime = (millis() - lastTime) / 1000;
  lastTime = millis();
  
  // Clear background
  background(0);
  
  // Handle different game states
  if (gameState === 'loading') {
    // Draw loading screen instead of the default loading logic
    drawLoadingScreen();
    return; // Exit early to avoid drawing other elements
  }
  
  // Draw forest background (for all non-loading states)
  if (forestBg) {
    image(forestBg, 0, 0);
  } else {
    drawForestBackground();
  }
  
  // Draw game elements based on state
  if (gameState === 'playing') {
    // Update power-up timer
    killerPowerUps.updatePowerUp();
    
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
    if (campers && Array.isArray(campers)) {
      for (let camper of campers) {
        if (camper) {
          drawCamper(camper);
        }
      }
    }
    
    if (detectives && Array.isArray(detectives)) {
      for (let detective of detectives) {
        if (detective) {
          drawDetective(detective);
        }
      }
    }
    
    if (killer) {
      drawKiller();
    }
    
    if (blood && Array.isArray(blood)) {
      drawBlood();
    }
    
    if (killerPowerUps && killerPowerUps.active) {
      drawPowerUpUI();
    }
    
    drawHUD();
  } else if (gameState === 'gameOver') {
    drawGameOver(); // Use the consistent drawGameOver function instead of inline code
  } else if (gameState === 'intro') {
    drawIntroScreen();
  } else if (gameState === 'levelComplete') {
    drawLevelComplete();
  }
  
  // Draw UI overlays based on state - these should be drawn last to appear on top
  if (leaderboardState.showEmailInput) {
    console.log("Drawing email input modal");
    drawEmailInputModal();
  } else if (leaderboardState.showLeaderboard) {
    drawLeaderboard();
  } else if (sharingState.showShareOptions) {
    drawShareOptions();
  }
  
  // Draw notifications
  drawNotifications();
}

// Function to draw the intro screen
function drawIntroScreen() {
  push();
  
  // Draw the forest background first if available
  if (forestBg) {
    image(forestBg, 0, 0);
  }
  
  // Semi-transparent background
  fill(0, 0, 0, 200);
  noStroke();
  rect(0, 0, width, height);
  
  // Main title container with darker background
  fill(0, 0, 0, 230);
  stroke(255, 0, 0);
  strokeWeight(4);
  rectMode(CENTER);
  rect(width/2, height/4, 550, 140);
  rectMode(CORNER);
  
  // Title text
  textFont('Arial'); // Use Arial font
  textAlign(CENTER, CENTER);
  textSize(64);
  
  // Main title text with clear contrast
  fill(255, 0, 0);
  text('CAMP KILL', width/2, height/4);
  
  // Add blood drip details
  noStroke();
  for (let i = 0; i < 5; i++) {
    const dropX = width/2 - 150 + (i * 75);
    const dropY = height/4 + 50;
    const dropSize = random(10, 25);
    const dropLength = random(20, 50);
    
    // Blood drop
    fill(200, 0, 0);
    ellipse(dropX, dropY + dropLength, dropSize, dropSize * 1.5);
    
    // Blood trail
    fill(255, 0, 0);
    beginShape();
    vertex(dropX - dropSize/2, dropY);
    vertex(dropX + dropSize/2, dropY);
    vertex(dropX + dropSize/3, dropY + dropLength);
    vertex(dropX - dropSize/3, dropY + dropLength);
    endShape(CLOSE);
  }
  
  // Story text container with better contrast
  fill(0, 0, 0, 230);
  stroke(100, 100, 100);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2, 650, 220);
  rectMode(CORNER);
  
  // Story text
  textFont('Arial'); // Use Arial font
  textSize(20);
  textAlign(CENTER, CENTER);
  
  for (let i = 0; i < storyText.length; i++) {
    // Main text with pure white for maximum contrast
    fill(255);
    text(storyText[i], width/2, height/2 - 50 + (i * 40));
  }
  
  // Start prompt container
  fill(0, 0, 0, 230);
  stroke(255, 255, 0);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height * 3/4, 550, 80);
  rectMode(CORNER);
  
  // Start prompt with clear text
  textFont('Arial'); // Use Arial font
  textSize(28);
  textAlign(CENTER, CENTER);
  
  // Main text
  fill(255, 255, 0);
  text('Press SPACE to begin the hunt', width/2, height * 3/4);
  
  // Only show debug info when in development mode
  if (false) { // Set to false to hide debug info
    // Debug info with improved readability
    fill(0, 0, 0, 180);
    noStroke();
    rect(5, 5, 250, 70);
    
    // Debug info text 
    textFont('Arial'); // Use Arial font
    textSize(12);
    textAlign(LEFT, TOP);
    fill(220, 220, 220);
    text(`Game State: ${gameState}`, 10, 10);
    text(`Assets Loaded: ${customAssets.loaded}`, 10, 25);
    text(`Loading: ${customAssets.loading}`, 10, 40);
    text(`Loaded Assets: ${customAssets.loadCount}/${customAssets.totalAssets}`, 10, 55);
  }
  
  pop();
}

// Function to draw the killer
function drawKiller() {
  if (!killer) {
    console.error("Cannot draw killer: killer object is undefined!");
    return;
  }
  
  push();
  
  // Apply screen shake
  translate(random(-screenShake, screenShake), random(-screenShake, screenShake));
  
  // Check if we have a killer sprite before drawing
  const hasValidSprite = customAssets && customAssets.killer && 
                         (customAssets.killer.width > 0 || customAssets.killer instanceof p5.Graphics);
  
  // Log the drawing attempt
  console.log("Drawing killer at", killer.x, killer.y, 
              "Sprite loaded:", hasValidSprite ? "yes" : "no", 
              "Invisible:", killer.invisible);
  
  // Draw killer sprite if available and not invisible
  if (hasValidSprite && !killer.invisible) {
    try {
      // Draw glow effect if visible to detectives
      if (killerVisible) {
        // Draw outer glow
        for (let i = 0; i < 3; i++) {
          const glowSize = killer.size + (i * 10);
          const glowAlpha = 100 - (i * 30);
          tint(255, 0, 0, glowAlpha); // Red tint with transparency
          imageMode(CENTER);
          image(
            customAssets.killer,
            killer.x,
            killer.y,
            glowSize,
            glowSize
          );
          imageMode(CORNER);
        }
      }
      
      // Draw the killer sprite with proper scaling and red tint if visible
      tint(killerVisible ? 255 : 255, killerVisible ? 0 : 255, killerVisible ? 0 : 255);
      imageMode(CENTER);
      image(
        customAssets.killer,
        killer.x,
        killer.y,
        killer.size,
        killer.size
      );
      imageMode(CORNER);
      noTint(); // Reset tint
    } catch (e) {
      console.error("Error drawing killer sprite:", e);
      // Fallback drawing if sprite drawing fails
      fill(killerVisible ? 255 : 0, killerVisible ? 0 : 0, killerVisible ? 0 : 0); // Red if visible, black if not
  noStroke();
      ellipse(killer.x, killer.y, killer.size);
    }
  } else if (!killer.invisible) {
    // Fallback drawing if sprite not loaded
    fill(killerVisible ? 255 : 0, killerVisible ? 0 : 0, killerVisible ? 0 : 0); // Red if visible, black if not
    noStroke();
    ellipse(killer.x, killer.y, killer.size);
    
    // Add a distinctive marker to make it clear this is the killer
    fill(255);
    ellipse(killer.x, killer.y, killer.size * 0.5);
    fill(0);
    ellipse(killer.x, killer.y, killer.size * 0.2);
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

  pop();
}

// Function to draw a camper
function drawCamper(camper) {
      push();
      translate(camper.x, camper.y);
  
  // Check if we have a valid camper sprite
  const hasValidSprite = customAssets && 
                        customAssets.campers && 
                        customAssets.campers[camper.type] && 
                        (customAssets.campers[camper.type].width > 0 || 
                         customAssets.campers[camper.type] instanceof p5.Graphics);
  
  // Draw the camper using their sprite if available
  if (hasValidSprite) {
    try {
      // Apply glow effect if camper is glowing
      if (camper.glowing) {
        // Outer glow
        for (let i = 0; i < 3; i++) {
          const glowSize = camper.size + (i * 10);
          const glowAlpha = 150 - (i * 40);
          tint(255, 255, 100, glowAlpha); // Yellow glow
          imageMode(CENTER);
          image(customAssets.campers[camper.type], 0, 0, glowSize, glowSize);
        }
        noTint();
      }
      
      // Draw the camper sprite
      imageMode(CENTER);
      image(customAssets.campers[camper.type], 0, 0, camper.size, camper.size);
      imageMode(CORNER);
      
      // Add fear indicator above camper
      if (camper.fear > 0) {
        fill(255, 0, 0, camper.fear * 2.5);
      noStroke();
        ellipse(0, -camper.size/2 - 10, 20, 20);
      }
    } catch (e) {
      console.error("Error drawing camper sprite:", e, "camper:", camper);
      // Fallback drawing
      drawCamperFallback(camper);
    }
  } else {
    // Fallback drawing if sprite not available
    drawCamperFallback(camper);
  }
  
      pop();
    }

// Fallback function to draw a camper without using sprites
function drawCamperFallback(camper) {
  // Colors for different camper types
  const colors = [
    [255, 100, 100], // Red
    [100, 100, 255], // Blue
    [100, 255, 100]  // Green
  ];
  
  // Draw body
  fill(colors[camper.type][0], colors[camper.type][1], colors[camper.type][2]);
  noStroke();
  ellipse(0, 0, camper.size);
  
  // Add fear indicator
  if (camper.fear > 0) {
    fill(255, 0, 0, camper.fear * 2.5);
    noStroke();
    ellipse(0, -camper.size/2 - 10, 20, 20);
  }
  
  // Add a face to make it clear this is a camper
  fill(255, 220, 180);
  ellipse(0, -5, camper.size * 0.5);
  
  // Draw eyes
  fill(0);
  ellipse(-8, -10, 5, 7);
  ellipse(8, -10, 5, 7);
  
  // Draw mouth
  if (camper.fear > 50) {
    // Scared mouth
    ellipse(0, 5, 10, 10);
  } else {
    // Normal mouth
    arc(0, 5, 15, 10, 0, PI);
  }
}

// Function to draw a detective
function drawDetective(detective) {
  push();
  translate(detective.x, detective.y);
  
  // Check if we have a valid detective sprite
  const hasValidSprite = customAssets && 
                         customAssets.detective && 
                         (customAssets.detective.width > 0 || 
                          customAssets.detective instanceof p5.Graphics);
  
  // Draw the detective using sprite if available
  if (hasValidSprite) {
    try {
      // Draw detective sprite
      imageMode(CENTER);
      image(customAssets.detective, 0, 0, detective.size, detective.size);
      imageMode(CORNER);
      
      // Draw flashlight cone if detective has one
      if (detective.hasFlashlight) {
        drawFlashlightCone(detective);
      }
    } catch (e) {
      console.error("Error drawing detective sprite:", e);
      // Fallback drawing
      drawDetectiveFallback(detective);
    }
  } else {
    // Fallback drawing if sprite not available
    drawDetectiveFallback(detective);
  }
  
  pop();
}

// Fallback function to draw a detective without using sprites
function drawDetectiveFallback(detective) {
  // Draw body
  fill(60, 60, 100);
  noStroke();
  ellipse(0, 0, detective.size);
  
  // Draw hat
  fill(40, 40, 80);
  arc(0, -10, detective.size * 0.8, detective.size * 0.6, PI, TWO_PI);
  rect(-15, -10, 30, 5);
  // Face
  fill(240, 200, 160);
  ellipse(0, 0, detective.size * 0.6, detective.size * 0.7);
  
  // Draw eyes
  fill(0);
  ellipse(-7, -5, 5, 7);
  ellipse(7, -5, 5, 7);
  
  // Draw flashlight
  fill(150);
  rect(15, 0, 20, 8);
  
  // Draw flashlight cone
  if (detective.hasFlashlight) {
    drawFlashlightCone(detective);
  }
}

// Draw flashlight cone for detective
function drawFlashlightCone(detective) {
  push();
  // Calculate flashlight direction
  let flashlightAngle = detective.flashlightAngle || 0;
  
  // Adjust cone position to start from the detective's position
  translate(0, 0);
  rotate(flashlightAngle);
  
  // Draw flashlight cone
  fill(255, 255, 200, 50);
  noStroke();
  beginShape();
  vertex(detective.size/2, 0);
  vertex(detective.flashlightRange * cos(-detective.flashlightWidth/2), 
         detective.flashlightRange * sin(-detective.flashlightWidth/2));
  vertex(detective.flashlightRange * cos(detective.flashlightWidth/2), 
         detective.flashlightRange * sin(detective.flashlightWidth/2));
  endShape(CLOSE);
  pop();
}

// Function to draw power-up UI
function drawPowerUpUI() {
  if (!killerPowerUps.active) return;
  
  push();
  
  // Draw background panel with lower opacity
  fill(0, 0, 0, 100);
  noStroke();
  rect(10, height - 60, 250, 50); // Reduced height since we're not showing description
  
  // Draw power-up icon
  fill(255, 255, 0);
  noStroke();
  textSize(30);
  textAlign(LEFT, CENTER);
  
  // Draw different icons based on power-up type
  switch(killerPowerUps.active.icon) {
    case "shield":
      text("🛡️", 15, height - 35);
      break;
    case "lightning":
      text("⚡", 15, height - 35);
      break;
    case "exclamation":
      text("⚠️", 15, height - 35);
      break;
    case "ghost":
      text("👻", 15, height - 35);
      break;
    case "ripple":
      text("🌊", 15, height - 35);
      break;
    default:
      text("✨", 15, height - 35);
  }
  
  // Calculate remaining time in seconds (with one decimal place)
  const remainingSeconds = Math.max(0, killerPowerUps.duration / 1000).toFixed(1);
  
  // Draw power-up name with remaining time
  fill(255);
  textSize(18);
  textAlign(LEFT, CENTER);
  text(`${killerPowerUps.active.name}`, 55, height - 45);
  
  // Display the remaining time more prominently
  fill(255, 255, 0); // Yellow color for better visibility
  textSize(20);
  text(`${remainingSeconds}s`, 55, height - 20);
  
  // Draw duration bar
  const barWidth = 230;
  const barHeight = 6; // Slightly thicker bar
  const progress = killerPowerUps.duration / killerPowerUps.active.duration;
  
  // Background
  fill(50);
  rect(15, height - 15, barWidth, barHeight);
  
  // Progress color based on remaining time
  if (progress < 0.25) {
    fill(255, 50, 50); // Red when almost expired
  } else if (progress < 0.5) {
    fill(255, 200, 50); // Orange when half expired
  } else {
    fill(50, 255, 50); // Green when plenty of time
  }
  
  // Progress bar
  rect(15, height - 15, barWidth * progress, barHeight);
  
  pop();
}

// Function to draw HUD (score, level, etc.)
function drawHUD() {
  push();
  
  // Create a dark background for better readability
  fill(0, 0, 0, 180);
  noStroke();
  rect(width - 150, 5, 145, combo > 1 ? 135 : 65);
  
  // Draw score and level with high-contrast white
  textFont('Arial'); // Use Arial font
  fill(220, 220, 220);
  noStroke();
  textSize(20);
  textAlign(RIGHT, TOP);
  text(`Score: ${score}`, width - 10, 10);
  text(`Level: ${level}`, width - 10, 40);
  
  // Draw combo if active
  if (combo > 1) {
    const comboText = `${combo}x COMBO!`;
    
    // Draw combo text
    textFont('Arial'); // Use Arial font
    fill(255, 100, 100);
  textSize(24);
    text(comboText, width - 10, 70);
    
    // Draw combo multiplier
    fill(255, 255, 100);
    textSize(20);
    text(`${comboMultiplier.toFixed(1)}x Score`, width - 10, 100);
  }
  
  pop();
}

// Function to draw level complete screen
function drawLevelComplete() {
  push();
  
  // Draw the forest background first
  if (forestBg) {
    image(forestBg, 0, 0);
  } else {
    // Create and draw a new forest background if it doesn't exist
    forestBg = createGraphics(width, height);
    drawForestBackground();
    image(forestBg, 0, 0);
  }
  
  // Semi-transparent black overlay
  fill(0, 0, 0, 150);
  noStroke();
  rect(0, 0, width, height);
  
  // Level complete box
  fill(0, 0, 0, 220);
  stroke(255, 255, 0);
  strokeWeight(3);
  rectMode(CENTER);
  rect(width/2, height/2, 500, 320);
  rectMode(CORNER);
  
  // Level complete text with cleaner styling
  textFont('Arial'); // Use Arial font
  textSize(48);
  textAlign(CENTER, CENTER);
  
  // Simple drop shadow
  fill(0);
  text('LEVEL COMPLETE!', width/2 + 2, height/2 - 50 + 2);
  
  // Main title text with high contrast
  fill(255, 255, 0);
  text('LEVEL COMPLETE!', width/2, height/2 - 50);
  
  // Kills and score with cleaner styling
  textSize(28); // Slightly larger text
  textFont('Arial'); // Consistent font
  
  // Background for text area - additional readability
  fill(0, 0, 0, 200); // Darker background
  noStroke();
  rect(width/2 - 140, height/2 - 10, 280, 100); // Wider container
  
  // Text shadow for stats
  fill(0, 0, 0, 150);
  textAlign(CENTER, CENTER);
  text(`Kills: ${levelKills}`, width/2 + 2, height/2 + 10 + 2);
  text(`Score: ${score}`, width/2 + 2, height/2 + 50 + 2); // More vertical spacing
  
  // Text with high contrast
  fill(255);
  text(`Kills: ${levelKills}`, width/2, height/2 + 10);
  text(`Score: ${score}`, width/2, height/2 + 50); // More vertical spacing
  
  // Next level prompt with button-like styling
  const promptWidth = 360;
  const promptHeight = 50;
  const promptX = width/2 - promptWidth/2;
  const promptY = height/2 + 120;
  
  // Button-like background
  fill(0, 100, 0); // Dark green background
  stroke(255);
  strokeWeight(2);
  rect(promptX, promptY, promptWidth, promptHeight);
  
  // Add highlight/shadow for depth - improved contrast
  noStroke();
  fill(255, 255, 255, 80); // Brighter highlight at top
  rect(promptX, promptY, promptWidth, 3);
  fill(0, 0, 0, 100); // Darker shadow at bottom
  rect(promptX, promptY + promptHeight - 3, promptWidth, 3);
  
  // Animated subtle glow effect on text
  const pulseAmount = sin(frameCount * 0.1) * 0.5 + 0.5; // Value between 0 and 1
  
  // Text shadow
  textSize(24);
  fill(0, 0, 0, 150);
  text('Press SPACE to start next level', width/2 + 1, promptY + promptHeight/2 + 1);
  
  // Main text with white for maximum readability
  fill(255);
  text('Press SPACE to start next level', width/2, promptY + promptHeight/2);
  
  pop();
}

// Function to initialize a new level
function initializeLevel() {
  console.log("Initializing level " + level + "...");
  
  // Clear existing arrays
  campers = [];
  detectives = [];
  blood = [];
  
  // Log the killer asset status
  if (customAssets.killer) {
    console.log("Killer asset is loaded:", customAssets.killer);
  } else {
    console.error("Killer asset is not loaded!");
    // Create an emergency fallback graphic for the killer
    customAssets.killer = createGraphics(80, 80);
    customAssets.killer.fill(255, 0, 0);
    customAssets.killer.noStroke();
    customAssets.killer.ellipse(40, 40, 60);
    console.log("Created emergency fallback for killer");
  }
  
  // Reset killer state if not initialized yet
  if (!killer) {
    console.log("Initializing killer object");
    killer = {
      x: width / 2,
      y: height / 2,
      size: 80,
      speed: 5,
      walkFrame: 0,
      lastMoveTime: 0,
      moving: false,
      invisible: false
    };
  } else {
    console.log("Reusing existing killer object");
    // Reset killer position
      killer.x = width / 2;
      killer.y = height / 2;
    killer.invisible = false;
    killer.moving = false;
    killer.walkFrame = 0;
  }
  
  // Calculate number of campers and detectives based on level
  const numCampers = min(6 + level * 4, 30);
  
  // Adjust detective count based on level
  let numDetectives;
  if (level < 3) {
    numDetectives = 1;
  } else if (level >= 8) {
    numDetectives = 4; // Maximum 4 detectives for levels 8 and 9
  } else {
    // For levels 3-7, add one detective per level
    numDetectives = 1 + (level - 2);
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
      glowing: false,
      lastX: pos.x, // Add last position for movement direction
      lastY: pos.y  // Add last position for movement direction
    });
  }
  
  // Define all possible corners
  const corners = [
    { x: 0, y: 0 },           // Top-left
    { x: width, y: 0 },       // Top-right
    { x: 0, y: height },      // Bottom-left
    { x: width, y: height }   // Bottom-right
  ];
  
  // Function to check if a position is safe from killer
  function isSafeFromKiller(x, y, minDistance = 200) {
    const dx = x - killer.x;
    const dy = y - killer.y;
    return sqrt(dx * dx + dy * dy) >= minDistance;
  }
  
  // Function to get safe corners for detectives
  function getSafeDetectiveCorners() {
    // Filter corners that are safe from killer
    const safeCorners = corners.filter(corner => isSafeFromKiller(corner.x, corner.y));
    
    // If we have enough safe corners, use them
    if (safeCorners.length >= numDetectives) {
      return safeCorners.slice(0, numDetectives);
    }
    
    // If we don't have enough safe corners, try to find alternative positions
    const alternativePositions = [];
    let attempts = 0;
    const maxAttempts = 20;
    
    while (alternativePositions.length < numDetectives && attempts < maxAttempts) {
      // Try positions along the edges of the map
      const side = floor(random(4)); // 0: top, 1: right, 2: bottom, 3: left
      let x, y;
      
      switch(side) {
        case 0: // top
          x = random(width);
          y = 0;
          break;
        case 1: // right
          x = width;
          y = random(height);
          break;
        case 2: // bottom
          x = random(width);
          y = height;
          break;
        case 3: // left
          x = 0;
          y = random(height);
          break;
      }
      
      if (isSafeFromKiller(x, y)) {
        alternativePositions.push({ x, y });
      }
      
      attempts++;
    }
    
    // Combine safe corners with alternative positions
    return [...safeCorners, ...alternativePositions].slice(0, numDetectives);
  }
  
  // Get safe positions for detectives
  const detectivePositions = getSafeDetectiveCorners();
  
  // Create detectives
  for (let i = 0; i < numDetectives; i++) {
    const pos = detectivePositions[i];
    
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
  }
  
  // Reset power-up system
  killerPowerUps.active = null;
  killerPowerUps.duration = 0;
  killerPowerUps.killCounter = 0;
  
  // Always redraw the background for the new level
  if (!forestBg || lastLevel !== level) {
    console.log(`Redrawing forest background for level ${level}`);
    lastLevel = level;
    
    // Ensure we have a graphics buffer of the right size
    if (!forestBg) {
      forestBg = createGraphics(width, height);
    }
    
    // Draw the new forest background for this level
    drawForestBackground();
  }
  
  // Set game state to playing
  gameState = 'playing';
  
  console.log(`Level ${level} initialized with ${numCampers} campers and ${numDetectives} detectives`);
  
  // Increased chance of special events based on level
  const eventChance = min(0.3 + (level * 0.1), 0.8);
  if (random(1) < eventChance) {
    specialEvents.triggerRandomEvent();
  }
  
  // Reset detective respawn timer
  detectiveRespawnTimer = 0;
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
      
      // Move away from killer if too close or if Camper Panic is active
      if (distanceToKiller < 200 || killerPowerUps.isPowerUpActive("Camper Panic")) {
        // Calculate direction away from killer
        const angle = atan2(dy, dx);
        // Apply speed reduction if Intimidation is active and camper is within range
        const currentSpeed = killerPowerUps.isPowerUpActive("Intimidation") && distanceToKiller < 300 ? 
          camper.speed * 0.5 : camper.speed;
        const moveX = cos(angle) * currentSpeed;
        const moveY = sin(angle) * currentSpeed;
        
        // Move camper
        camper.x += moveX;
        camper.y += moveY;
        
        // Update movement state
        camper.moving = true;
        camper.walkFrame = (camper.walkFrame + 1) % WALK_CYCLE_FRAMES;
        
        // Set maximum fear during Camper Panic
        if (killerPowerUps.isPowerUpActive("Camper Panic")) {
          camper.fear = 1;
        }
      } else {
        // Random movement when not fleeing
        if (random(1) < 0.05) {
        camper.angle = random(TWO_PI);
      }
        
        // Apply speed reduction if Intimidation is active and camper is within range
        const currentSpeed = killerPowerUps.isPowerUpActive("Intimidation") && distanceToKiller < 300 ? 
          camper.speed * 0.5 : camper.speed;
        
        // Move in current direction
        camper.x += cos(camper.angle) * currentSpeed;
        camper.y += sin(camper.angle) * currentSpeed;
        camper.moving = true;
        camper.walkFrame = (camper.walkFrame + 1) % WALK_CYCLE_FRAMES;
      }
      
      // Keep camper within bounds
      camper.x = constrain(camper.x, camper.size/2, width - camper.size/2);
      camper.y = constrain(camper.y, camper.size/2, height - camper.size/2);
      
      // Update fear level based on distance to killer
      if (!killerPowerUps.isPowerUpActive("Camper Panic")) {
        camper.fear = map(distanceToKiller, 0, 200, 1, 0);
      }
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
      // Function to check if a position is safe from killer
      function isSafeFromKiller(x, y, minDistance = 200) {
        const dx = x - killer.x;
        const dy = y - killer.y;
        return sqrt(dx * dx + dy * dy) >= minDistance;
      }
      
      // Function to get safe corners for detective
      function getSafeDetectivePosition() {
        // Define all possible corners
        const corners = [
          { x: 0, y: 0 },
          { x: width, y: 0 },
          { x: 0, y: height },
          { x: width, y: height }
        ];
        
        // Filter corners that are safe from killer
        const safeCorners = corners.filter(corner => isSafeFromKiller(corner.x, corner.y));
        
        // If we have safe corners, use one of them
        if (safeCorners.length > 0) {
          return random(safeCorners);
        }
        
        // If no safe corners, try positions along the edges
        let attempts = 0;
        const maxAttempts = 20;
        
        while (attempts < maxAttempts) {
          const side = floor(random(4));
          let x, y;
          
          switch(side) {
            case 0: // top
              x = random(width);
              y = 0;
              break;
            case 1: // right
              x = width;
              y = random(height);
              break;
            case 2: // bottom
              x = random(width);
              y = height;
              break;
            case 3: // left
              x = 0;
              y = random(height);
              break;
          }
          
          if (isSafeFromKiller(x, y)) {
            return { x, y };
          }
          
          attempts++;
        }
        
        // If no safe position found, return a corner as last resort
        return random(corners);
      }
      
      const pos = getSafeDetectivePosition();
      
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
      showNotification("New Detective", "A new detective has arrived!", "👮");
    }
  }
  
  // Track if killer is visible to any detective
  let isVisibleToAnyDetective = false;
  
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
      
      // Shadow Step makes killer invisible unless very close
      const shadowStepActive = killerPowerUps.isPowerUpActive("Shadow Step");
      const shadowStepMinDistance = 80; // Increased from 50 to 80
      const isInBeam = distanceToKiller <= detective.flashlightRange && 
                      angleDiff <= detective.flashlightWidth/2 &&
                      (!shadowStepActive || distanceToKiller < shadowStepMinDistance);
      
      // Update visibility state
      if (isInBeam && !killer.invisible) {
        isVisibleToAnyDetective = true;
        
        // If Shadow Step is active, only make visible when very close
        if (shadowStepActive && distanceToKiller < shadowStepMinDistance) {
          console.log("Shadow Step broken: Killer visible at close range:", distanceToKiller);
        }
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
          
          // Increment detectives caught counter
          detectivesCaught++;
          
          // Show notification
          showNotification("Detective Eliminated", "The detective has been eliminated!");
          
          // Start respawn timer if no detectives left
          if (detectives.length === 0) {
            detectiveRespawnTimer = DETECTIVE_RESPAWN_DELAY;
          }
        }
        // If killer doesn't have Invincibility and is visible, game over
        else if (killerVisible) {
          gameState = 'gameOver';
          return;
        } 
      }
      
      // Only move towards killer if killer is visible or Shadow Step is not active
      // This is the key change for Shadow Step functionality
      if (killerVisible || !shadowStepActive) {
        // Move towards the killer if visible or Shadow Step is not active
        const angle = atan2(dy, dx);
        // Apply speed reduction if Intimidation is active and detective is within range
        const currentSpeed = killerPowerUps.isPowerUpActive("Intimidation") && distanceToKiller < 300 ? 
          detective.speed * 0.5 : detective.speed;
        const moveX = cos(angle) * currentSpeed;
        const moveY = sin(angle) * currentSpeed;
        
        detective.x += moveX;
        detective.y += moveY;
        
        // Update flashlight angle to point towards killer
        detective.flashlightAngle = angle;
      } else {
        // When Shadow Step is active and killer is not visible, wander randomly
        if (random(1) < 0.05) {
          detective.flashlightAngle = random(TWO_PI);
        }
        
        // Move in current direction
        const wanderSpeed = detective.speed * 0.3; // Slower wandering speed
        const moveX = cos(detective.flashlightAngle) * wanderSpeed;
        const moveY = sin(detective.flashlightAngle) * wanderSpeed;
        detective.x += moveX;
        detective.y += moveY;
      }
      
      // Update movement state
      detective.moving = true;
      detective.walkFrame = (detective.walkFrame + 1) % WALK_CYCLE_FRAMES;
      
      // Keep detective within bounds
      detective.x = constrain(detective.x, detective.size/2, width - detective.size/2);
      detective.y = constrain(detective.y, detective.size/2, height - detective.size/2);
    }
  }
  
  // Update killer visibility state with quick fade
  if (isVisibleToAnyDetective) {
    killerVisible = true;
  } else {
    // Quick fade out when not visible to any detective
    killerVisible = false;
  }
}

// ... existing code ...

// Add keyboard event handlers
function keyPressed() {
  console.log("Key pressed:", key, "keyCode:", keyCode, "Game state:", gameState, "Email modal:", leaderboardState.showEmailInput);
  
  // Handle email input if the email modal is active
  if (leaderboardState.showEmailInput) {
    console.log("Email input active, processing key:", key);
    // Handle Enter key - submit the email
    if (keyCode === ENTER && leaderboardState.email.trim()) {
      console.log("Enter pressed, submitting:", leaderboardState.email);
      submitScore(leaderboardState.email.trim());
      return false;
    }
    // Handle Escape key - close the modal
    else if (keyCode === ESCAPE) {
      console.log("Escape pressed, closing email input");
      leaderboardState.showEmailInput = false;
      return false;
    }
    // Handle Backspace key - delete the last character
    else if (keyCode === BACKSPACE) {
      console.log("Backspace pressed, removing last character");
      leaderboardState.email = leaderboardState.email.slice(0, -1);
      return false;
    }
    // Handle printable characters - add to email string
    else if (key.length === 1 && leaderboardState.email.length < 50) {
      console.log("Adding character to email:", key);
      leaderboardState.email += key;
      return false;
    }
    
    return false; // Prevent default behavior when the email modal is active
  }
  
  // Handle game navigation keys
  if (key === ' ') { // Space key
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
    } else if (gameState === 'gameOver' || gameState === 'victory') {
      // Reset game state
      resetGame();
    }
  } else if (key === 'r' || key === 'R') {
    if (gameState === 'gameOver' || gameState === 'victory') {
      // Reset game state
      resetGame();
    }
  }
  
  return true; // Allow default behavior for other keys
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

// Add mouse interaction handling
function mousePressed() {
  console.log("Mouse pressed at:", mouseX, mouseY, "Game state:", gameState);
  
  if (gameState === 'gameOver') {
    const buttonY = height/2 + 80;
    const buttonHeight = 40;
    const buttonWidth = 160;
    const buttonSpacing = 20;
    
    // Restart button
    const restartX = width/2 - buttonWidth - buttonSpacing/2;
    
    if (mouseY > buttonY && mouseY < buttonY + buttonHeight &&
        mouseX > restartX && mouseX < restartX + buttonWidth) {
      console.log("Restart button clicked");
      resetGame();
      return;
    }
    
    // Submit Score button
    const submitX = width/2 + buttonSpacing/2;
    
    if (mouseY > buttonY && mouseY < buttonY + buttonHeight &&
        mouseX > submitX && mouseX < submitX + buttonWidth) {
      console.log("Submit Score button clicked");
      leaderboardState.showEmailInput = true;
      return;
    }
    
    // NEW: Leaderboard button
    const leaderboardX = width/2 - buttonWidth/2;
    const leaderboardY = buttonY + buttonHeight + 20;
    
    console.log(`Leaderboard button: x=${leaderboardX}-${leaderboardX+buttonWidth}, y=${leaderboardY}-${leaderboardY+buttonHeight}`);
    console.log(`Click in leaderboard button: ${mouseX >= leaderboardX && mouseX <= leaderboardX + buttonWidth && mouseY >= leaderboardY && mouseY <= leaderboardY + buttonHeight}`);
    
    if (mouseY >= leaderboardY && mouseY <= leaderboardY + buttonHeight &&
        mouseX >= leaderboardX && mouseX <= leaderboardX + buttonWidth) {
      console.log("!!!! LEADERBOARD BUTTON CLICKED !!!!");
      fetchLeaderboard();
      leaderboardState.showLeaderboard = true;
      return;
    }
  }
  
  // Email input modal buttons
  if (leaderboardState.showEmailInput) {
    console.log("Email input modal is shown, checking button clicks");
    
    // Submit button coordinates - match these exactly with the drawing code
    const submitX = width/2 - 60;
    const submitY = height/2 + 40;
    const buttonWidth = 120;
    const buttonHeight = 40;
    
    // Check if button is clicked
    const submitBtnClicked = mouseX >= submitX && mouseX <= submitX + buttonWidth && 
                             mouseY >= submitY && mouseY <= submitY + buttonHeight;
    
    // Debug logging for button click detection
    console.log(`Email submit button: x=${submitX}-${submitX+buttonWidth}, y=${submitY}-${submitY+buttonHeight}`);
    console.log(`Mouse clicked at: x=${mouseX}, y=${mouseY}`);
    console.log(`Click in submit button: ${submitBtnClicked}`);
    
    if (submitBtnClicked) {
      console.log("Submit button clicked with email:", leaderboardState.email);
      submitScore(leaderboardState.email.trim());
      return;
    }
    
    // Cancel button
    const cancelY = height/2 + 90;
    const cancelX = width/2 - 60;
    
    console.log(`Email cancel button: x=${cancelX}-${cancelX+buttonWidth}, y=${cancelY}-${cancelY+buttonHeight}`);
    console.log(`Click in cancel button: ${mouseX >= cancelX && mouseX <= cancelX + buttonWidth && mouseY >= cancelY && mouseY <= cancelY + buttonHeight}`);
    
    if (mouseX >= cancelX && mouseX <= cancelX + buttonWidth && 
        mouseY >= cancelY && mouseY <= cancelY + buttonHeight) {
      console.log("Cancel button clicked");
      leaderboardState.showEmailInput = false;
      return;
    }
  }
  
  // Leaderboard close button
  if (leaderboardState.showLeaderboard) {
    const playAgainX = width/2 - 80;
    const playAgainY = height/2 + 180; // Update to match the actual drawing position
    const buttonWidth = 160;
    const buttonHeight = 40;
    
    // ADDED VERY OBVIOUS BUTTON DEBUGGING
    fill(255, 0, 0, 100); // RED HIGHLIGHT for debugging
    noStroke();
    rect(playAgainX, playAgainY, buttonWidth, buttonHeight);
    
    console.log(`Play Again button: x=${playAgainX}-${playAgainX+buttonWidth}, y=${playAgainY}-${playAgainY+buttonHeight}`);
    console.log(`Mouse clicked at: x=${mouseX}, y=${mouseY}`);
    console.log(`Click in Play Again button: ${mouseX >= playAgainX && mouseX <= playAgainX + buttonWidth && mouseY >= playAgainY && mouseY <= playAgainY + buttonHeight}`);
    
    // EXTRA LOUD DEBUG MESSAGE
    if (mouseX >= playAgainX && mouseX <= playAgainX + buttonWidth && 
        mouseY >= playAgainY && mouseY <= playAgainY + buttonHeight) {
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!!!! PLAY AGAIN BUTTON CLICKED !!!!!");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      leaderboardState.showLeaderboard = false;
      resetGame();
      return;
    }
  }
  
  // Share options buttons
  if (sharingState.showShareOptions) {
    // Share to X button
    const shareXButtonX = width/2 - 150;
    const shareXButtonY = height/2 - 60;
    const shareButtonWidth = 300;
    const shareButtonHeight = 50;
    
    console.log(`Share X button: x=${shareXButtonX}-${shareXButtonX+shareButtonWidth}, y=${shareXButtonY}-${shareXButtonY+shareButtonHeight}`);
    console.log(`Click in X button: ${mouseX >= shareXButtonX && mouseX <= shareXButtonX + shareButtonWidth && mouseY >= shareXButtonY && mouseY <= shareXButtonY + shareButtonHeight}`);
    
    if (mouseX >= shareXButtonX && mouseX <= shareXButtonX + shareButtonWidth && 
        mouseY >= shareXButtonY && mouseY <= shareXButtonY + shareButtonHeight) {
      console.log("Share to X button clicked");
      shareToX();
      return;
    }
    
    // Share link button
    const shareLinkButtonX = width/2 - 150;
    const shareLinkButtonY = height/2;
    
    console.log(`Share link button: x=${shareLinkButtonX}-${shareLinkButtonX+shareButtonWidth}, y=${shareLinkButtonY}-${shareLinkButtonY+shareButtonHeight}`);
    console.log(`Click in link button: ${mouseX >= shareLinkButtonX && mouseX <= shareLinkButtonX + shareButtonWidth && mouseY >= shareLinkButtonY && mouseY <= shareLinkButtonY + shareButtonHeight}`);
    
    if (mouseX >= shareLinkButtonX && mouseX <= shareLinkButtonX + shareButtonWidth && 
        mouseY >= shareLinkButtonY && mouseY <= shareLinkButtonY + shareButtonHeight) {
      console.log("Share link button clicked");
      shareGameLink();
      return;
    }
    
    // Close button
    const closeButtonX = width/2 - 60;
    const closeButtonY = height/2 + 80;
    const closeButtonWidth = 120;
    const closeButtonHeight = 40;
    
    console.log(`Share close button: x=${closeButtonX}-${closeButtonX+closeButtonWidth}, y=${closeButtonY}-${closeButtonY+closeButtonHeight}`);
    console.log(`Click in close button: ${mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonWidth && mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonHeight}`);
    
    if (mouseX >= closeButtonX && mouseX <= closeButtonX + closeButtonWidth && 
        mouseY >= closeButtonY && mouseY <= closeButtonY + closeButtonHeight) {
      console.log("Share options close button clicked");
      sharingState.showShareOptions = false;
      return;
    }
  }
}

// Modify resetGame function
function resetGame() {
  // Reset game state
  gameState = 'playing';
  score = 0;
  level = 1;
  levelKills = 0;
  lastLevel = 1;
  combo = 0;
  comboMultiplier = 1;
  detectivesCaught = 0; // Reset detectives caught counter
  
  // Reset killer position
  killer.x = width / 2;
  killer.y = height / 2;
  killer.invisible = false;
  
  // Reset UI states
  leaderboardState.showEmailInput = false;
  leaderboardState.email = '';
  leaderboardState.showLeaderboard = false;
  sharingState.showShareOptions = false;
  
  // Clear notifications
  notifications = [];
  
  // Clear power-ups
  killerPowerUps.active = null;
  killerPowerUps.duration = 0;
  killerPowerUps.killCounter = 0;
  
  // Initialize new level
  initializeLevel();
}

// Modify game over handling
function gameOver() {
  gameState = 'gameOver';
  // Don't automatically show email input, wait for player to click the button
}

// Draw notifications
function drawNotifications() {
  // Draw notifications
  for (let i = notifications.length - 1; i >= 0; i--) {
    const notif = notifications[i];
    
    // Calculate time elapsed
    const currentTime = millis();
    const elapsedTime = currentTime - notif.startTime;
    
    // Remove notification if it's been shown for the duration
    if (elapsedTime >= 3000) {
      notifications.splice(i, 1);
      continue;
    }
    
    // Fade out notification when getting close to end time
    notif.alpha = map(elapsedTime, 0, 3000, 255, 0);
    
    // Calculate vertical position based on index
    const baseY = 20; // Moved up from 50
    const spacing = 80; // Reduced from 120
    const yPos = baseY + (i * spacing);
    
    push();
    // Draw background panel - smaller overall size
    fill(0, 0, 0, Math.min(notif.alpha * 0.9, 220));
    noStroke();
    rect(10, yPos, 220, 50); // Reduced width from 300 to 220, height from 70 to 50
    
    // Draw border
    stroke(255, 255, 0, notif.alpha * 0.7);
    strokeWeight(1); // Thinner border
    noFill();
    rect(10, yPos, 220, 50);
    
    // Draw power-up icon with high contrast
    noStroke();
    fill(255, 255, 0, notif.alpha);
    textSize(20); // Smaller from 30
    textAlign(LEFT, CENTER);
    text(notif.icon || "✨", 20, yPos + 25); // Vertically centered
    
    // Draw title with high contrast
    fill(255, 100, 100, notif.alpha);
    textSize(16); // Smaller from 24
    textAlign(LEFT, TOP);
    text(notif.title, 50, yPos + 8); // Adjusted position
    
    // Draw message with high contrast
    fill(220, 220, 220, notif.alpha);
    textSize(14); // Smaller from 18
    textAlign(LEFT, TOP);
    text(notif.message, 50, yPos + 28); // Adjusted position
    
    // Draw progress bar
    const barWidth = 190; // Smaller from 270
    const barHeight = 2; // Thinner from 4
    const progress = 1 - (elapsedTime / 3000); // Countdown
    
    // Background
    fill(50, notif.alpha);
    rect(20, yPos + 45, barWidth, barHeight); // Adjusted position
    
    // Progress
    fill(0, 255, 0, notif.alpha);
    rect(20, yPos + 45, barWidth * progress, barHeight); // Adjusted position
    
    pop();
  }
}

// Submit score to leaderboard
async function submitScore(email) {
  try {
    // Debug logging
    console.log("submitScore function called with email:", email);
    
    // Check if the email is valid
    if (!email || email.trim() === '' || !email.includes('@') || email.length < 5) {
      console.error("Invalid email format:", email);
      leaderboardState.error = 'Please enter a valid email address.';
      return false;
    }
    
    // Get player initials for notifications
    const playerInitials = getInitialsFromEmail(email);
    
    // Update UI state
    leaderboardState.submitting = true;
    leaderboardState.error = null;
    
    // Ensure Supabase is initialized
    if (!supabase) {
      try {
        console.log("Supabase not initialized, attempting to initialize");
        initSupabase();
        
        if (!supabase) {
          throw new Error("Failed to initialize Supabase client");
        }
      } catch (e) {
        console.error("Failed to initialize Supabase:", e);
        leaderboardState.error = 'Could not connect to leaderboard. Please try again.';
        leaderboardState.submitting = false;
        return false;
      }
    }
    
    // Prepare submission data
    const scoreData = {
      email: email.trim(),
      score: score,
      level: level,
      created_at: new Date().toISOString()
    };
    
    console.log("Submitting score to leaderboard:", scoreData);
    console.log("Using Supabase URL:", SUPABASE_URL);
    console.log("Using Supabase key:", SUPABASE_ANON_KEY.substring(0, 20) + "...");
    
    // Simple mock submission if using mock Supabase client
    if (supabase._isMock) {
      console.log("Using mock client to simulate submission");
      
      // Show temporary confirmation notification
      showNotification("Score Submitted!", `Player ${playerInitials} added to the leaderboard!`, "🏆");
      
      // Close the email input modal
      leaderboardState.showEmailInput = false;
      
      // Clear notifications when showing leaderboard
      setTimeout(() => {
        notifications = [];
        leaderboardState.showLeaderboard = true;
      }, 1500);
      
      return true;
    }
    
    // Submit score to Supabase
    const { data, error } = await supabase
      .from('leaderboard')
      .insert([scoreData]);
    
    // Handle errors
    if (error) {
      console.error("Supabase insertion error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      if (error.code === '42P01') {
        leaderboardState.error = 'Leaderboard table not found. Please create the table first.';
      } else if (error.code === '23505') {
        leaderboardState.error = 'This email has already submitted a score for this level.';
      } else if (error.code === '23503') {
        leaderboardState.error = 'Invalid data format. Please try again.';
      } else if (error.code === '42501') {
        leaderboardState.error = 'Permission denied. Check RLS policies.';
      } else {
        leaderboardState.error = `Database error: ${error.message || 'Unknown error'}`;
      }
      
      leaderboardState.submitting = false;
      return false;
    }
    
    console.log("Score submitted successfully:", data);
    
    // Show temporary confirmation notification with player initials
    showNotification("Score Submitted!", `Player ${playerInitials} added to the leaderboard!`, "🏆");
    
    // Close email input modal
    leaderboardState.showEmailInput = false;
    
    // Fetch and display leaderboard after a short delay, clearing notifications
    setTimeout(async () => {
      await fetchLeaderboard();
      notifications = []; // Clear notifications when showing leaderboard
      leaderboardState.showLeaderboard = true;
    }, 1500);
    
    return true;
  } catch (error) {
    // Catch any unexpected errors
    console.error('Error submitting score:', error);
    leaderboardState.error = `Error: ${error.message || 'An unknown error occurred'}`;
    leaderboardState.submitting = false;
    return false;
  } finally {
    // Always reset the submitting state after a short delay
    setTimeout(() => {
      leaderboardState.submitting = false;
    }, 1000);
  }
}

// Fetch leaderboard data
async function fetchLeaderboard() {
  try {
    leaderboardState.loading = true;
    leaderboardState.error = null;
    
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('score', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    leaderboardState.scores = data;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    leaderboardState.error = 'Failed to load leaderboard. Please try again.';
  } finally {
    leaderboardState.loading = false;
  }
}

// Draw email input modal
function drawEmailInputModal() {
  console.log("Inside drawEmailInputModal function");
  
  // Semi-transparent background
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Modal box - consistent size for text
  fill(30, 30, 30);
  stroke(100, 100, 100);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2, 450, 320);
  rectMode(CORNER);
  
  // Store button dimensions for consistency
  const submitX = width/2 - 60;
  const submitY = height/2 + 40;
  const cancelX = width/2 - 60;
  const cancelY = height/2 + 90;
  const buttonWidth = 120;
  const buttonHeight = 40;
  
  // Email input instructions with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(14);
  text("Enter your email to save your score to the leaderboard", width/2 + 1, height/2 - 100 + 1);
  
  // Main text
  fill(200, 200, 200);
  text("Enter your email to save your score to the leaderboard", width/2, height/2 - 100);
  
  // Privacy note with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0);
  textSize(12);
  text("Only your initials will be displayed publicly", width/2 + 1, height/2 - 80 + 1);
  
  // Main text
  fill(150, 220, 150);
  text("Only your initials will be displayed publicly", width/2, height/2 - 80);
  
  // Title with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Enter Your Email", width/2 + 2, height/2 - 60 + 2);
  
  // Main title
  fill(255);
  text("Enter Your Email", width/2, height/2 - 60);
  
  // Email input box
  fill(50, 50, 50);
  stroke(100, 100, 100);
  rect(width/2 - 150, height/2 - 20, 300, 40);
  
  // Email input text with consistent contrast
  textFont('Arial'); // Use Arial font
  fill(255);
  textAlign(LEFT, CENTER);
  textSize(18);
  text(leaderboardState.email + (frameCount % 60 < 30 ? '|' : ''), width/2 - 140, height/2);
  
  // Preview initials if email is entered
  if (leaderboardState.email && leaderboardState.email.length > 0) {
    // Shadow
    textFont('Arial'); // Use Arial font
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(12);
    const initials = getInitialsFromEmail(leaderboardState.email);
    text(`Your initials will appear as: ${initials}`, width/2 + 1, height/2 + 30 + 1);
    
    // Main text
    fill(200, 255, 200);
    text(`Your initials will appear as: ${initials}`, width/2, height/2 + 30);
  }
  
  // Submit button - consistent styling
  fill(0, 200, 0); // Bright green
  stroke(255);
  strokeWeight(2);
  rect(submitX, submitY, buttonWidth, buttonHeight);
  
  // Add button highlight/shadow for depth
  noStroke();
  fill(255, 255, 255, 50); // Light highlight at top
  rect(submitX, submitY, buttonWidth, 2);
  fill(0, 0, 0, 50); // Dark shadow at bottom
  rect(submitX, submitY + buttonHeight - 2, buttonWidth, 2);
  
  // Submit button text with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text(leaderboardState.submitting ? "Submitting..." : "Submit", width/2 + 1, submitY + buttonHeight/2 + 1);
  
  // Main button text
  fill(255);
  text(leaderboardState.submitting ? "Submitting..." : "Submit", width/2, submitY + buttonHeight/2);
  
  // Cancel button - consistent styling
  fill(200, 50, 50); // Bright red
  stroke(255);
  strokeWeight(2);
  rect(cancelX, cancelY, buttonWidth, buttonHeight);
  
  // Add button highlight/shadow for depth
  noStroke();
  fill(255, 255, 255, 50); // Light highlight at top
  rect(cancelX, cancelY, buttonWidth, 2);
  fill(0, 0, 0, 50); // Dark shadow at bottom
  rect(cancelX, cancelY + buttonHeight - 2, buttonWidth, 2);
  
  // Cancel button text with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("Cancel", width/2 + 1, cancelY + buttonHeight/2 + 1);
  
  // Main button text
  fill(255);
  text("Cancel", width/2, cancelY + buttonHeight/2);
  
  // Error message - draw last to appear on top
  if (leaderboardState.error) {
    // Text shadow
    textFont('Arial'); // Use Arial font
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(16);
    text(leaderboardState.error, width/2 + 1, height/2 + 150 + 1);
    
    // Main error text
    fill(255, 0, 0);
    text(leaderboardState.error, width/2, height/2 + 150);
  }
  
  // Debug logging
  console.log(`Email modal: submitX=${submitX}, submitY=${submitY}, cancelX=${cancelX}, cancelY=${cancelY}`);
}

// Share score to X (Twitter)
function shareToX() {
  const text = `🎮 I scored ${score} points and reached level ${level} in Camp Kill! Can you beat my score? #CampKill #GameDev`;
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(sharingState.shareUrl)}`;
  window.open(url, '_blank');
  sharingState.showShareOptions = false;
  showNotification("Sharing", "Opened X (Twitter) to share your score!", "🔄");
}

// Share game link
function shareGameLink() {
  try {
    navigator.clipboard.writeText(sharingState.shareUrl)
      .then(() => {
        showNotification("Link Copied!", "Game link copied to clipboard!", "🔗");
        sharingState.showShareOptions = false;
      })
      .catch(() => {
        showNotification("Error", "Failed to copy link. Please try again.", "❌");
      });
  } catch (e) {
    console.error("Clipboard error:", e);
    showNotification("Error", "Your browser doesn't support clipboard operations", "❌");
  }
}

// Handle email input
function handleEmailInput(key) {
  console.log("handleEmailInput called with key:", key, "keyCode:", keyCode);
  
  // Handle Enter key
  if (keyCode === ENTER && leaderboardState.email.trim()) {
    console.log("Enter pressed, submitting:", leaderboardState.email);
    submitScore(leaderboardState.email.trim());
    return;
  } 
  // Handle Escape key
  else if (keyCode === ESCAPE) {
    console.log("Escape pressed, closing email input");
    leaderboardState.showEmailInput = false;
    return;
  }
  // Handle Backspace key
  else if (keyCode === BACKSPACE) {
    console.log("Backspace pressed, removing last character");
    leaderboardState.email = leaderboardState.email.slice(0, -1);
    return;
  }
  
  // Handle regular character input
  if (key.length === 1 && leaderboardState.email.length < 50) {
    console.log("Adding character to email:", key);
    leaderboardState.email += key;
  }
}

// Draw leaderboard
function drawLeaderboard() {
  // Semi-transparent background
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Leaderboard box with better contrast
  fill(0, 0, 0, 230);
  stroke(100, 100, 100);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2, 550, 450);
  rectMode(CORNER);
  
  // Title with high contrast
  textFont('Arial'); // Use Arial font
  textAlign(CENTER, CENTER);
  textSize(24);
  fill(255);
  text("Leaderboard", width/2, height/2 - 160);
  
  // Loading state
  if (leaderboardState.loading) {
    // Loading indicator
    textFont('Arial'); // Use Arial font
    textAlign(CENTER, CENTER);
    textSize(18);
    fill(255);
    text("Loading leaderboard...", width/2, height/2);
  }
  // Error state
  else if (leaderboardState.error) {
    // Error message
    textFont('Arial'); // Use Arial font
    textAlign(CENTER, CENTER);
    textSize(18);
    fill(255, 0, 0);
    text(leaderboardState.error, width/2, height/2);
  }
  // Display scores
  else if (leaderboardState.scores && leaderboardState.scores.length > 0) {
    // Header background
    fill(40, 40, 40, 200);
    rect(width/2 - 220, height/2 - 135, 440, 30);
    
    // Column headers
    textFont('Arial'); // Use Arial font
    textAlign(LEFT, CENTER);
    textSize(18);
    fill(200);
    text("Rank", width/2 - 200, height/2 - 120);
    text("Player", width/2 - 120, height/2 - 120);
    text("Score", width/2 - 20, height/2 - 120);
    text("Level", width/2 + 60, height/2 - 120);
    text("Date", width/2 + 120, height/2 - 120);
    
    // Score entries background - alternating rows
    for (let i = 0; i < leaderboardState.scores.length; i++) {
      if (i % 2 === 0) {
        fill(30, 30, 30, 150);
      } else {
        fill(50, 50, 50, 150);
      }
      rect(width/2 - 220, height/2 - 95 + (i * 30), 440, 30);
    }
    
    // Score entries text
    leaderboardState.scores.forEach((entry, index) => {
      const y = height/2 - 80 + (index * 30);
      
      textFont('Arial'); // Use Arial font
      textAlign(LEFT, CENTER);
      textSize(16);
      fill(255);
      
      // Rank
      text(index + 1, width/2 - 200, y);
      
      // Player initials
      const initials = getInitialsFromEmail(entry.email);
      text(initials, width/2 - 120, y);
      
      // Score
      text(entry.score, width/2 - 20, y);
      
      // Level
      text(entry.level, width/2 + 60, y);
      
      // Date
      const date = new Date(entry.created_at);
      const formattedDate = `${date.getMonth()+1}/${date.getDate()}/${date.getFullYear().toString().substr(-2)}`;
      text(formattedDate, width/2 + 120, y);
    });
  } else {
    // No scores found - consistent shadow
    textFont('Arial'); // Use Arial font
    fill(0);
    textAlign(CENTER, CENTER);
    textSize(18);
    text("No scores found. Be the first to submit!", width/2 + 2, height/2 + 2);
    
    // Main text
    fill(255);
    text("No scores found. Be the first to submit!", width/2, height/2);
  }
  
  // Play Again button with improved rendering
  const playAgainX = width/2 - 80;
  const playAgainY = height/2 + 180;
  const buttonWidth = 160;
  const buttonHeight = 40;
  
  // DEBUGGING - Make sure everyone can see this button
  fill(255, 0, 0); // BRIGHT RED for visibility
  stroke(255, 255, 0); // Yellow border
  strokeWeight(4); // Very thick border
  rect(playAgainX, playAgainY, buttonWidth, buttonHeight);
  
  // Add highlight/shadow for depth
  noStroke();
  fill(255, 255, 255, 80); // Brighter highlight at top
  rect(playAgainX, playAgainY, buttonWidth, 3); // Slightly thicker
  
  fill(0, 0, 0, 100); // Darker shadow at bottom
  rect(playAgainX, playAgainY + buttonHeight - 3, buttonWidth, 3); // Slightly thicker
  
  // Button text with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0, 0, 0, 150); // More subtle shadow
  textAlign(CENTER, CENTER);
  textSize(20);
  text("Play Again", playAgainX + buttonWidth/2 + 1, playAgainY + buttonHeight/2 + 1);
  
  // Main button text
  fill(255);
  noStroke(); // Remove stroke that caused double rendering
  text("Play Again", playAgainX + buttonWidth/2, playAgainY + buttonHeight/2);
  
  // DEBUGGING - Draw a box around the entire button area
  stroke(255, 0, 0);
  strokeWeight(2);
  noFill();
  rect(playAgainX-5, playAgainY-5, buttonWidth+10, buttonHeight+10);
  
  // Debug info
  console.log(`Drawing Play Again button at: x=${playAgainX}, y=${playAgainY}, width=${buttonWidth}, height=${buttonHeight}`);
}

// Function to extract initials from email address
function getInitialsFromEmail(email) {
  if (!email) return "???";
  
  try {
    // Get the part before the @ symbol
    const username = email.split('@')[0];
    
    // Handle different username patterns
    if (username.includes('.')) {
      // Example: john.doe@example.com -> JD
      const parts = username.split('.');
      return parts.map(part => part[0].toUpperCase()).join('');
    } else if (username.match(/[A-Z]/)) {
      // Example: johnDoe@example.com -> JD
      const initials = username.match(/[A-Z]/g);
      if (initials && initials.length > 0) {
        return initials.join('');
      }
    }
    
    // Default: take first 2-3 characters
    if (username.length <= 3) {
      return username.toUpperCase();
    } else {
      return username.substring(0, 2).toUpperCase();
    }
  } catch (e) {
    console.error("Error getting initials from email:", e);
    return "??";
  }
}

// Draw share options
function drawShareOptions() {
  // Semi-transparent background
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Share options box
  fill(30, 30, 30);
  stroke(100, 100, 100);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2, 400, 300);
  rectMode(CORNER);
  
  // Title with consistent shadow
  textFont('Arial'); // Use Arial font
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(24);
  text("Share Your Score", width/2 + 2, height/2 - 120 + 2);
  
  // Title main text
  fill(255);
  text("Share Your Score", width/2, height/2 - 120);
  
  // Share to X button
  const shareXButtonX = width/2 - 150;
  const shareXButtonY = height/2 - 60;
  const shareButtonWidth = 300;
  const shareButtonHeight = 50;
  
  fill(29, 161, 242); // Twitter blue
  noStroke();
  rect(shareXButtonX, shareXButtonY, shareButtonWidth, shareButtonHeight);
  
  // Draw button border
  stroke(255);
  strokeWeight(2);
  noFill();
  rect(shareXButtonX, shareXButtonY, shareButtonWidth, shareButtonHeight);
  
  // Button text shadow
  textFont('Arial'); // Use Arial font
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("Share to X (Twitter)", width/2 + 1, shareXButtonY + shareButtonHeight/2 + 1);
  
  // Button main text
  fill(255);
  text("Share to X (Twitter)", width/2, shareXButtonY + shareButtonHeight/2);
  
  // Share link button
  const shareLinkButtonX = width/2 - 150;
  const shareLinkButtonY = height/2;
  
  fill(100, 100, 100);
  noStroke();
  rect(shareLinkButtonX, shareLinkButtonY, shareButtonWidth, shareButtonHeight);
  
  // Draw button border
  stroke(255);
  strokeWeight(2);
  noFill();
  rect(shareLinkButtonX, shareLinkButtonY, shareButtonWidth, shareButtonHeight);
  
  // Button text shadow
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("Copy Game Link", width/2 + 1, shareLinkButtonY + shareButtonHeight/2 + 1);
  
  // Button main text
  textFont('Arial'); // Use Arial font
  fill(255);
  text("Copy Game Link", width/2, shareLinkButtonY + shareButtonHeight/2);
  
  // Close button
  const closeButtonX = width/2 - 60;
  const closeButtonY = height/2 + 80;
  const closeButtonWidth = 120;
  const closeButtonHeight = 40;
  
  fill(100, 100, 100);
  noStroke();
  rect(closeButtonX, closeButtonY, closeButtonWidth, closeButtonHeight);
  
  // Draw button border
  stroke(255);
  strokeWeight(2);
  noFill();
  rect(closeButtonX, closeButtonY, closeButtonWidth, closeButtonHeight);
  
  // Button text shadow
  textFont('Arial'); // Use Arial font
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(18);
  text("Close", width/2 + 1, closeButtonY + closeButtonHeight/2 + 1);
  
  // Button main text
  textFont('Arial'); // Use Arial font
  fill(255);
  text("Close", width/2, closeButtonY + closeButtonHeight/2);
  
  // Debug info
  console.log(`Drawing share buttons at: X button(${shareXButtonX},${shareXButtonY}), Link button(${shareLinkButtonX},${shareLinkButtonY}), Close(${closeButtonX},${closeButtonY})`);
}

// Check if leaderboard table exists
async function checkLeaderboardTable() {
  try {
    console.log("Checking if leaderboard table exists...");
    
    if (!supabase) {
      console.error("Cannot check leaderboard table: Supabase client not initialized");
      return false;
    }
    
    // Try to query the table with a limit of 1 to see if it exists
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.error("Leaderboard table does not exist. Please create it in the Supabase dashboard.");
        showNotification("Table Missing", "Create 'leaderboard' table in Supabase dashboard", "❌");
        return false;
      } else {
        console.error("Error checking leaderboard table:", error);
        return false;
      }
    }
    
    console.log("Leaderboard table exists:", data);
    return true;
  } catch (e) {
    console.error("Exception checking leaderboard table:", e);
    return false;
  }
}

// Draw Game Over screen
function drawGameOver() {
  // Semi-transparent background
  fill(0, 0, 0, 200);
  rect(0, 0, width, height);
  
  // Game Over box 
  fill(0, 0, 0, 230);
  stroke(150, 0, 0);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2, 450, 320);
  rectMode(CORNER);
  
  // Title with high contrast
  textFont('Arial'); // Use Arial font
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255, 0, 0);
  text("GAME OVER", width/2, height/2 - 100);
  
  // Score background for better readability
  fill(0, 0, 0, 180);
  noStroke();
  rect(width/2 - 150, height/2 - 70, 300, 100);
  
  // Score info with clean styling
  textFont('Arial'); // Use Arial font
  textSize(20);
  fill(255);
  text(`Score: ${score}`, width/2, height/2 - 50);
  text(`Level: ${level}`, width/2, height/2 - 20);
  text(`Detectives Caught: ${detectivesCaught}`, width/2, height/2 + 10);
  
  // Buttons
  const buttonWidth = 160;
  const buttonHeight = 40;
  const buttonSpacing = 20;
  const baseY = height/2 + 80;
  
  // Restart button
  const restartX = width/2 - buttonWidth - buttonSpacing/2;
  const restartY = baseY;
  
  fill(0, 180, 0); // Green button
  stroke(255);
  strokeWeight(2);
  rect(restartX, restartY, buttonWidth, buttonHeight);
  
  // Add highlight/shadow for depth - improved contrast
  noStroke();
  fill(255, 255, 255, 80); // Brighter highlight at top
  rect(restartX, restartY, buttonWidth, 3); // Slightly thicker
  fill(0, 0, 0, 100); // Darker shadow at bottom
  rect(restartX, restartY + buttonHeight - 3, buttonWidth, 3); // Slightly thicker
  
  // Button text with shadow for depth
  fill(0, 0, 0, 150); // Subtle shadow
  textAlign(CENTER, CENTER);
  textSize(20);
  text("Restart", restartX + buttonWidth/2 + 1, restartY + buttonHeight/2 + 1);
  
  // Button text
  fill(255);
  text("Restart", restartX + buttonWidth/2, restartY + buttonHeight/2);
  
  // Submit Score button
  const submitX = width/2 + buttonSpacing/2;
  const submitY = baseY;
  
  fill(0, 100, 180); // Blue button
  stroke(255);
  strokeWeight(2);
  rect(submitX, submitY, buttonWidth, buttonHeight);
  
  // Add highlight/shadow for depth - improved contrast
  noStroke();
  fill(255, 255, 255, 80); // Brighter highlight at top
  rect(submitX, submitY, buttonWidth, 3); // Slightly thicker
  fill(0, 0, 0, 100); // Darker shadow at bottom
  rect(submitX, submitY + buttonHeight - 3, buttonWidth, 3); // Slightly thicker
  
  // Button text with shadow for depth
  fill(0, 0, 0, 150); // Subtle shadow
  text("Submit Score", submitX + buttonWidth/2 + 1, submitY + buttonHeight/2 + 1);
  
  // Button text
  fill(255);
  text("Submit Score", submitX + buttonWidth/2, submitY + buttonHeight/2);
  
  // ADDED: Leaderboard Button 
  const leaderboardX = width/2 - buttonWidth/2;
  const leaderboardY = baseY + buttonHeight + 20;
  
  // Leaderboard button with bright colors for visibility
  fill(255, 165, 0); // Orange button
  stroke(255);
  strokeWeight(2);
  rect(leaderboardX, leaderboardY, buttonWidth, buttonHeight);
  
  // Add highlight/shadow for depth
  noStroke();
  fill(255, 255, 255, 80); // Brighter highlight at top
  rect(leaderboardX, leaderboardY, buttonWidth, 3);
  fill(0, 0, 0, 100); // Darker shadow at bottom
  rect(leaderboardX, leaderboardY + buttonHeight - 3, buttonWidth, 3);
  
  // Button text with shadow
  fill(0, 0, 0, 150);
  text("Leaderboard", leaderboardX + buttonWidth/2 + 1, leaderboardY + buttonHeight/2 + 1);
  
  // Button text
  fill(255);
  text("Leaderboard", leaderboardX + buttonWidth/2, leaderboardY + buttonHeight/2);
}

// Draw the loading screen
function drawLoadingScreen() {
  push();
  
  // Black background
  background(0);
  
  // Loading container
  fill(0, 0, 0, 230);
  stroke(150, 150, 150);
  strokeWeight(2);
  rectMode(CENTER);
  rect(width/2, height/2, 500, 200);
  rectMode(CORNER);
  
  // Loading title
  textFont('Arial'); // Use Arial font
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  text("LOADING GAME...", width/2, height/2 - 50);
  
  // Loading progress
  const progress = customAssets.loadCount / customAssets.totalAssets;
  const barWidth = 400;
  const barHeight = 20;
  
  // Progress bar background
  fill(50);
  noStroke();
  rect(width/2 - barWidth/2, height/2, barWidth, barHeight);
  
  // Progress bar
  fill(0, 200, 0);
  rect(width/2 - barWidth/2, height/2, barWidth * progress, barHeight);
  
  // Progress text
  textFont('Arial'); // Use Arial font
  fill(255);
  textSize(16);
  text(`${Math.round(progress * 100)}% - Asset ${customAssets.loadCount} of ${customAssets.totalAssets}`, width/2, height/2 + 50);
  
  pop();
}