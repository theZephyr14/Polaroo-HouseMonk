const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer-core');
const { CohereClient } = require('cohere-ai');
const fs = require('fs');
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
if (process.env.COHERE_API_KEY) {
  cohereClient = new CohereClient({ apiKey: process.env.COHERE_API_KEY });
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

// Bot functionality
async function runPolarooBot() {
  let browser = null;
  let page = null;
  
  try {
    botStatus.isRunning = true;
    botStatus.currentStep = 'Starting browser...';
    botStatus.logs.push(`${new Date().toISOString()}: Starting browser`);
    io.emit('bot-update', botStatus);

    // Launch browser with flexible Chrome detection
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    };

    // Try different Chrome paths for different environments
    const chromePaths = [
      process.env.PUPPETEER_EXECUTABLE_PATH,
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/opt/google/chrome/chrome',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe' // Windows 32-bit
    ];

    // Find the first available Chrome executable
    let chromePath = null;
    for (const path of chromePaths) {
      if (path && fs.existsSync(path)) {
        chromePath = path;
        break;
      }
    }

    if (chromePath) {
      launchOptions.executablePath = chromePath;
      botStatus.logs.push(`${new Date().toISOString()}: Using Chrome at: ${chromePath}`);
    } else {
      botStatus.logs.push(`${new Date().toISOString()}: No Chrome found, letting Puppeteer auto-detect`);
    }

    browser = await puppeteer.launch(launchOptions);
    
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    botStatus.currentStep = 'Navigating to Polaroo login...';
    botStatus.logs.push(`${new Date().toISOString()}: Navigating to Polaroo`);
    io.emit('bot-update', botStatus);

    // Navigate to Polaroo
    await page.goto('https://polaroo.com', { waitUntil: 'networkidle2' });

   // Use Cohere to analyze the page and find login elements
    botStatus.currentStep = 'Analyzing page with Cohere AI...';
    botStatus.logs.push(`${new Date().toISOString()}: Analyzing page with Cohere AI`);
    io.emit('bot-update', botStatus);

    // Get page content for Cohere analysis
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    
    let loginStrategy = 'direct';
    if (cohereClient) {
      try {
        const response = await cohereClient.generate({
          model: 'command',
          prompt: `Analyze this webpage content and determine the best way to find and click the login button. Look for login links, buttons, or navigation elements. Return only the CSS selector or XPath that would work best.

Webpage content: ${pageText.substring(0, 2000)}

Common login selectors to consider:
- a[href*="login"]
- button:contains("Login") 
- a:contains("Sign in")
- [data-testid*="login"]
- .login, #login
- nav a[href*="signin"]
- header a[href*="login"]

Return the best selector:`,
          max_tokens: 50,
          temperature: 0.1
        });
        
        loginStrategy = response.generations[0].text.trim();
        botStatus.logs.push(`${new Date().toISOString()}: Cohere suggested: ${loginStrategy}`);
      } catch (error) {
        botStatus.logs.push(`${new Date().toISOString()}: Cohere analysis failed, using fallback`);
      }
    }

    // Try to find and click login button
    botStatus.currentStep = 'Looking for login button...';
    botStatus.logs.push(`${new Date().toISOString()}: Looking for login button`);
    io.emit('bot-update', botStatus);

    const loginSelectors = [
      'a[href*="login"]',
      'a[href*="signin"]', 
      'button:contains("Login")',
      'button:contains("Sign in")',
      'a:contains("Login")',
      'a:contains("Sign in")',
      '[data-testid*="login"]',
      '.login',
      '#login',
      'nav a[href*="login"]',
      'header a[href*="login"]'
    ];

    let loginClicked = false;
    for (const selector of loginSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        await page.click(selector);
        loginClicked = true;
        botStatus.logs.push(`${new Date().toISOString()}: Clicked login with selector: ${selector}`);
        break;
      } catch (e) {
        continue;
      }
    }

    if (!loginClicked) {
      // Try direct navigation to login page
      botStatus.logs.push(`${new Date().toISOString()}: No login button found, trying direct navigation`);
      await page.goto('https://app.polaroo.com/login', { waitUntil: 'networkidle2' });
    }

    botStatus.currentStep = 'Filling login credentials...';
    botStatus.logs.push(`${new Date().toISOString()}: Filling login credentials`);
    io.emit('bot-update', botStatus);

    // Wait for login form and analyze with Cohere
    botStatus.currentStep = 'Analyzing login form with Cohere...';
    botStatus.logs.push(`${new Date().toISOString()}: Analyzing login form`);
    io.emit('bot-update', botStatus);

    // Wait for form to load
    await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"], input[type="text"]', { timeout: 15000 });
    
    // Use Cohere to find the best selectors for email and password fields
    let emailSelector = 'input[type="email"], input[name="email"], input[id="email"]';
    let passwordSelector = 'input[type="password"], input[name="password"], input[id="password"]';
    
    if (cohereClient) {
      try {
        const formHTML = await page.evaluate(() => {
          const forms = document.querySelectorAll('form');
          return Array.from(forms).map(form => form.outerHTML).join('\n');
        });
        
        const response = await cohereClient.generate({
          model: 'command',
          prompt: `Analyze this login form HTML and return the best CSS selectors for email and password fields. Return in format: email:selector,password:selector

Form HTML: ${formHTML.substring(0, 1500)}

Common patterns:
- input[type="email"]
- input[name="email"] 
- input[id="email"]
- input[type="password"]
- input[name="password"]
- input[id="password"]

Return format: email:selector,password:selector`,
          max_tokens: 100,
          temperature: 0.1
        });
        
        const cohereResult = response.generations[0].text.trim();
        if (cohereResult.includes('email:') && cohereResult.includes('password:')) {
          const [emailPart, passwordPart] = cohereResult.split(',');
          emailSelector = emailPart.split(':')[1]?.trim() || emailSelector;
          passwordSelector = passwordPart.split(':')[1]?.trim() || passwordSelector;
          botStatus.logs.push(`${new Date().toISOString()}: Cohere selectors - Email: ${emailSelector}, Password: ${passwordSelector}`);
        }
      } catch (error) {
        botStatus.logs.push(`${new Date().toISOString()}: Cohere form analysis failed, using defaults`);
      }
    }
    
    // Fill email
    await page.type(emailSelector, process.env.POLAROO_EMAIL, { delay: 100 });
    botStatus.logs.push(`${new Date().toISOString()}: Filled email field`);
    
    // Fill password  
    await page.type(passwordSelector, process.env.POLAROO_PASSWORD, { delay: 100 });
    botStatus.logs.push(`${new Date().toISOString()}: Filled password field`);

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
