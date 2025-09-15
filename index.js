const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer');
const cohere = require('cohere-ai');
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
cohere.init(process.env.COHERE_API_KEY);

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

// Bot functionality
async function runPolarooBot() {
  let browser = null;
  let page = null;
  
  try {
    botStatus.isRunning = true;
    botStatus.currentStep = 'Starting browser...';
    botStatus.logs.push(`${new Date().toISOString()}: Starting browser`);
    io.emit('bot-update', botStatus);

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    botStatus.currentStep = 'Navigating to Polaroo login...';
    botStatus.logs.push(`${new Date().toISOString()}: Navigating to Polaroo`);
    io.emit('bot-update', botStatus);

    // Navigate to Polaroo
    await page.goto('https://polaroo.com', { waitUntil: 'networkidle2' });

    // Look for login button/link
    botStatus.currentStep = 'Looking for login button...';
    botStatus.logs.push(`${new Date().toISOString()}: Looking for login button`);
    io.emit('bot-update', botStatus);

    // Try to find and click login button
    const loginSelectors = [
      'a[href*="login"]',
      'button:contains("Login")',
      'a:contains("Sign in")',
      '[data-testid*="login"]',
      '.login',
      '#login'
    ];

    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        loginClicked = true;
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loginClicked) {
      // Try direct navigation to login page
      await page.goto('https://app.polaroo.com/login', { waitUntil: 'networkidle2' });
    }

    botStatus.currentStep = 'Filling login credentials...';
    botStatus.logs.push(`${new Date().toISOString()}: Filling login credentials`);
    io.emit('bot-update', botStatus);

    // Wait for login form and fill credentials
    await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"]', { timeout: 10000 });
    
    // Fill email
    await page.type('input[type="email"], input[name="email"], input[id="email"]', process.env.POLAROO_EMAIL);
    
    // Fill password
    await page.type('input[type="password"], input[name="password"], input[id="password"]', process.env.POLAROO_PASSWORD);

    botStatus.currentStep = 'Submitting login form...';
    botStatus.logs.push(`${new Date().toISOString()}: Submitting login form`);
    io.emit('bot-update', botStatus);

    // Submit login form
    await page.click('button[type="submit"], input[type="submit"], button:contains("Login"), button:contains("Sign in")');
    
    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

    botStatus.currentStep = 'Navigating to accounting dashboard...';
    botStatus.logs.push(`${new Date().toISOString()}: Navigating to accounting dashboard`);
    io.emit('bot-update', botStatus);

    // Navigate to accounting dashboard
    await page.goto('https://app.polaroo.com/dashboard/accounting', { waitUntil: 'networkidle2' });

    botStatus.currentStep = 'Successfully reached accounting dashboard!';
    botStatus.logs.push(`${new Date().toISOString()}: Successfully reached accounting dashboard`);
    botStatus.isRunning = false;
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
