const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const { CohereClient } = require('cohere-ai');
const fs = require('fs');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Initialize Cohere
let cohereClient = null;
if (process.env.COHERE_API_KEY && process.env.COHERE_API_KEY !== 'your_cohere_api_key_here') {
  try {
    cohereClient = new CohereClient({ apiKey: process.env.COHERE_API_KEY });
    console.log('Cohere client initialized successfully');
  } catch (error) {
    console.log('Failed to initialize Cohere client:', error.message);
  }
} else {
  console.log('No valid Cohere API key found - using fallback mode');
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Store bot status
let botStatus = {
  isRunning: false,
  currentStep: '',
  logs: [],
  error: null
};

// Read Excel file to get first property name
function getFirstPropertyName() {
  try {
    const workbook = XLSX.readFile('Book1.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (data.length > 0) {
      const firstRow = data[0];
      // Look for property name in common column names
      const propertyName = firstRow['Property Name'] || firstRow['Property'] || firstRow['Name'] || firstRow['Address'] || Object.values(firstRow)[0];
      return propertyName;
    }
    return 'Default Property';
  } catch (error) {
    console.log('Error reading Excel file:', error.message);
    return 'Default Property';
  }
}

// Bot functionality
async function runPolarooBot() {
  let browser = null;
  let page = null;
  
  try {
    botStatus.isRunning = true;
    botStatus.currentStep = 'Starting browser...';
    botStatus.logs.push(`${new Date().toISOString()}: 🚀 Starting browser initialization`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Preparing Chrome launch options...`);
    botStatus.actionDetails = {
      type: 'browser_start',
      icon: '🚀',
      title: 'Browser Launch',
      details: 'Initializing Chrome browser...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    // Launch browser with cloud-optimized Chrome
    const isCloud = process.env.NODE_ENV === 'production';
    
    const launchOptions = {
      headless: false,  // SHOW THE BROWSER WINDOW
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1280,720',
        '--start-maximized'
      ]
    };

    if (isCloud) {
      // Use cloud-optimized Chrome for production
      botStatus.logs.push(`${new Date().toISOString()}: 🌐 Cloud environment detected - getting Chrome path...`);
      launchOptions.executablePath = await chromium.executablePath();
      botStatus.logs.push(`${new Date().toISOString()}: ✅ Using cloud Chrome: ${launchOptions.executablePath}`);
    } else {
      // Use local Chrome for development
      botStatus.logs.push(`${new Date().toISOString()}: 💻 Local environment detected - using system Chrome`);
    }

    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Launching browser with ${launchOptions.args.length} arguments...`);
    browser = await puppeteer.launch(launchOptions);
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Browser launched successfully`);
    
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    botStatus.currentStep = 'Navigating to Polaroo login...';
    botStatus.logs.push(`${new Date().toISOString()}: 🌐 Navigating to Polaroo homepage...`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Setting viewport to 1280x720...`);
    botStatus.actionDetails = {
      type: 'navigation',
      icon: '🌐',
      title: 'Navigation',
      details: 'Loading Polaroo homepage...',
      url: 'https://polaroo.com',
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    // Navigate to Polaroo with better error handling
    try {
      botStatus.logs.push(`${new Date().toISOString()}: 🔗 Attempting to load https://polaroo.com...`);
      await page.goto('https://polaroo.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      botStatus.logs.push(`${new Date().toISOString()}: ✅ Successfully loaded Polaroo homepage`);
    } catch (error) {
      botStatus.logs.push(`${new Date().toISOString()}: ❌ Failed to load polaroo.com: ${error.message}`);
      botStatus.logs.push(`${new Date().toISOString()}: 🔄 Trying alternative URL: app.polaroo.com...`);
      await page.goto('https://app.polaroo.com', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      botStatus.logs.push(`${new Date().toISOString()}: ✅ Successfully loaded app.polaroo.com`);
    }

    // Navigate directly to login page (no Cohere needed)
    botStatus.currentStep = 'Navigating to login page...';
    botStatus.logs.push(`${new Date().toISOString()}: 🔗 Navigating directly to login page...`);
    botStatus.actionDetails = {
      type: 'navigation',
      icon: '🌐',
      title: 'Navigation',
      details: 'Going to login page...',
      url: 'https://app.polaroo.com/login',
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    await page.goto('https://app.polaroo.com/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Successfully loaded login page`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ WAITING 5 SECONDS so you can see the login page...`);
    await page.waitForTimeout(5000); // 5 second pause

    // Find and highlight the email field
    botStatus.currentStep = 'Looking for email field...';
    botStatus.logs.push(`${new Date().toISOString()}: 🔍 Looking for email/username field...`);
    botStatus.actionDetails = {
      type: 'searching',
      icon: '🔍',
      title: 'Finding Fields',
      details: 'Looking for email field...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"], input[type="text"]', { timeout: 15000 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Found email field!`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ WAITING 5 SECONDS so you can see the email field...`);
    await page.waitForTimeout(5000); // 5 second pause

    // Fill email field
    botStatus.currentStep = 'Filling email field...';
    botStatus.logs.push(`${new Date().toISOString()}: 📧 Filling email field...`);
    botStatus.actionDetails = {
      type: 'form_input',
      icon: '📝',
      title: 'Form Input',
      details: 'Typing email address...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    await page.type('input[type="email"], input[name="email"], input[id="email"], input[type="text"]', process.env.POLAROO_EMAIL, { delay: 200 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Email field filled successfully`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ WAITING 5 SECONDS so you can see the filled email...`);
    await page.waitForTimeout(5000); // 5 second pause
    
    // Find and highlight the password field
    botStatus.currentStep = 'Looking for password field...';
    botStatus.logs.push(`${new Date().toISOString()}: 🔍 Looking for password field...`);
    botStatus.actionDetails = {
      type: 'searching',
      icon: '🔍',
      title: 'Finding Fields',
      details: 'Looking for password field...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    await page.waitForSelector('input[type="password"], input[name="password"], input[id="password"]', { timeout: 15000 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Found password field!`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ WAITING 5 SECONDS so you can see the password field...`);
    await page.waitForTimeout(5000); // 5 second pause

    // Fill password field
    botStatus.currentStep = 'Filling password field...';
    botStatus.logs.push(`${new Date().toISOString()}: 🔒 Filling password field...`);
    botStatus.actionDetails = {
      type: 'form_input',
      icon: '🔒',
      title: 'Form Input',
      details: 'Typing password...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    await page.type('input[type="password"], input[name="password"], input[id="password"]', process.env.POLAROO_PASSWORD, { delay: 200 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Password field filled successfully`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ WAITING 5 SECONDS so you can see the filled password...`);
    await page.waitForTimeout(5000); // 5 second pause

    botStatus.currentStep = 'Submitting login form...';
    botStatus.logs.push(`${new Date().toISOString()}: Submitting login form`);
    io.emit('bot-update', botStatus);

    // Submit login form
    await page.click('button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign in")');
    botStatus.logs.push(`${new Date().toISOString()}: 🖱️ Login button clicked!`);
    await page.waitForTimeout(2000); // Pause so you can see the click
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Login successful - navigating to dashboard`);

    // Navigate to accounting dashboard
    botStatus.currentStep = 'Navigating to accounting dashboard...';
    botStatus.logs.push(`${new Date().toISOString()}: 🌐 Navigating to accounting dashboard...`);
    botStatus.actionDetails = {
      type: 'navigation',
      icon: '🌐',
      title: 'Navigation',
      details: 'Going to accounting dashboard...',
      url: 'https://app.polaroo.com/dashboard/accounting',
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    await page.goto('https://app.polaroo.com/dashboard/accounting', { waitUntil: 'domcontentloaded' });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Successfully reached accounting dashboard`);

    // Read first property name from Excel
    botStatus.currentStep = 'Reading property data from Excel...';
    botStatus.logs.push(`${new Date().toISOString()}: 📊 Reading Book1.xlsx for first property...`);
    botStatus.actionDetails = {
      type: 'file_reading',
      icon: '📊',
      title: 'File Reading',
      details: 'Reading Excel file for property data...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    const firstPropertyName = getFirstPropertyName();
    botStatus.logs.push(`${new Date().toISOString()}: 📋 First property name: "${firstPropertyName}"`);

    // Search for the property
    botStatus.currentStep = 'Searching for property...';
    botStatus.logs.push(`${new Date().toISOString()}: 🔍 Searching for property: "${firstPropertyName}"...`);
    botStatus.actionDetails = {
      type: 'searching',
      icon: '🔍',
      title: 'Searching',
      details: `Looking for property: ${firstPropertyName}`,
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    // Wait for search input and type property name
    await page.waitForSelector('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]', { timeout: 10000 });
    await page.type('input[type="search"], input[placeholder*="search"], input[placeholder*="Search"]', firstPropertyName, { delay: 200 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Property name entered in search field`);
    await page.waitForTimeout(1500); // Pause so you can see the typing

    // Press Enter to search
    await page.keyboard.press('Enter');
    botStatus.logs.push(`${new Date().toISOString()}: 🔍 Search executed`);
    await page.waitForTimeout(2000); // Pause so you can see the search results

    botStatus.currentStep = 'Successfully completed property search!';
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Successfully searched for property: "${firstPropertyName}"`);
    botStatus.isRunning = false;
    botStatus.actionDetails = {
      type: 'success',
      icon: '✅',
      title: 'Success',
      details: `Successfully searched for property: ${firstPropertyName}`,
      url: 'https://app.polaroo.com/dashboard/accounting',
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    // Keep page open for a bit to show success
    await page.waitForTimeout(5000);

  } catch (error) {
    botStatus.error = error.message;
    botStatus.isRunning = false;
    botStatus.logs.push(`${new Date().toISOString()}: ERROR - ${error.message}`);
    io.emit('bot-update', botStatus);
    console.error('Bot error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.get('/api/status', (req, res) => {
  res.json(botStatus);
});

app.post('/api/start-bot', async (req, res) => {
  if (botStatus.isRunning) {
    return res.json({ error: 'Bot is already running' });
  }
  
  // Reset status
  botStatus = {
    isRunning: false,
    currentStep: '',
    logs: [],
    error: null
  };
  
  // Start bot in background
  runPolarooBot();
  
  res.json({ message: 'Bot started' });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected');
  socket.emit('bot-update', botStatus);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

server.listen(PORT, () => {
  console.log(`Polaroo bot server running on port ${PORT}`);
});
