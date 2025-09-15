const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
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
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
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

    // Use Cohere to analyze the page and find login elements
    botStatus.currentStep = 'Analyzing page with Cohere AI...';
    botStatus.logs.push(`${new Date().toISOString()}: 🧠 Starting Cohere AI analysis...`);
    io.emit('bot-update', botStatus);

    // Get page content for Cohere analysis
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Extracting page content...`);
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body.innerText);
    botStatus.logs.push(`${new Date().toISOString()}: 📄 Page content extracted: ${pageContent.length} chars HTML, ${pageText.length} chars text`);
    
    let loginStrategy = 'direct';
    if (cohereClient) {
      try {
        botStatus.logs.push(`${new Date().toISOString()}: 📤 Sending page content to Cohere API (${pageText.length} chars)...`);
        botStatus.logs.push(`${new Date().toISOString()}: ⏳ Waiting for Cohere response...`);
        
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
        
        if (response && response.generations && response.generations[0]) {
          loginStrategy = response.generations[0].text.trim();
          botStatus.logs.push(`${new Date().toISOString()}: ✅ Cohere AI suggested selector: "${loginStrategy}"`);
        } else {
          botStatus.logs.push(`${new Date().toISOString()}: ⚠️ Cohere returned empty response - using fallback`);
        }
      } catch (error) {
        botStatus.logs.push(`${new Date().toISOString()}: ❌ Cohere analysis failed: ${error.message}`);
        botStatus.logs.push(`${new Date().toISOString()}: 🔄 Switching to fallback strategy (hardcoded selectors)`);
      }
    } else {
      botStatus.logs.push(`${new Date().toISOString()}: ⚠️ No Cohere client available - using fallback strategy`);
    }

    // Try to find and click login button
    botStatus.currentStep = 'Looking for login button...';
    botStatus.logs.push(`${new Date().toISOString()}: 🔍 Searching for login button...`);
    botStatus.actionDetails = {
      type: 'clicking',
      icon: '🖱️',
      title: 'Clicking',
      details: 'Searching for login button...',
      url: null,
      coordinates: null
    };
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

    botStatus.logs.push(`${new Date().toISOString()}: 📋 Testing ${loginSelectors.length} login selectors...`);
    let loginClicked = false;
    for (let i = 0; i < loginSelectors.length; i++) {
      const selector = loginSelectors[i];
      try {
        botStatus.logs.push(`${new Date().toISOString()}: ⏳ Testing selector ${i + 1}/${loginSelectors.length}: "${selector}"`);
        await page.waitForSelector(selector, { timeout: 3000 });
        botStatus.logs.push(`${new Date().toISOString()}: ✅ Found login element with selector: "${selector}"`);
        await page.click(selector);
        loginClicked = true;
        botStatus.logs.push(`${new Date().toISOString()}: 🖱️ Successfully clicked login button!`);
        break;
      } catch (e) {
        botStatus.logs.push(`${new Date().toISOString()}: ❌ Selector "${selector}" not found: ${e.message}`);
        continue;
      }
    }

    if (!loginClicked) {
      // Try direct navigation to login page
      botStatus.logs.push(`${new Date().toISOString()}: No login button found, trying direct navigation`);
      try {
        await page.goto('https://app.polaroo.com/login', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });
        botStatus.logs.push(`${new Date().toISOString()}: Successfully navigated to login page`);
      } catch (error) {
        botStatus.logs.push(`${new Date().toISOString()}: Failed to navigate to login page: ${error.message}`);
        // Try alternative login URL
        try {
          await page.goto('https://polaroo.com/login', { 
            waitUntil: 'domcontentloaded',
            timeout: 30000 
          });
          botStatus.logs.push(`${new Date().toISOString()}: Successfully navigated to alternative login page`);
        } catch (error2) {
          botStatus.logs.push(`${new Date().toISOString()}: All login page attempts failed: ${error2.message}`);
          throw new Error('Unable to access login page');
        }
      }
    }

    botStatus.currentStep = 'Filling login credentials...';
    botStatus.logs.push(`${new Date().toISOString()}: Filling login credentials`);
    botStatus.actionDetails = {
      type: 'form_input',
      icon: '📝',
      title: 'Form Input',
      details: 'Filling login credentials...',
      url: null,
      coordinates: null
    };
    io.emit('bot-update', botStatus);

    // Wait for login form and analyze with Cohere
    botStatus.currentStep = 'Analyzing login form with Cohere...';
    botStatus.logs.push(`${new Date().toISOString()}: Analyzing login form`);
    io.emit('bot-update', botStatus);

    // Wait for form to load with multiple attempts
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Waiting for login form to load...`);
    try {
      await page.waitForSelector('input[type="email"], input[name="email"], input[id="email"], input[type="text"], input[placeholder*="email"], input[placeholder*="Email"]', { timeout: 15000 });
      botStatus.logs.push(`${new Date().toISOString()}: ✅ Login form detected with email field`);
    } catch (error) {
      botStatus.logs.push(`${new Date().toISOString()}: ❌ Email field not found: ${error.message}`);
      botStatus.logs.push(`${new Date().toISOString()}: 🔍 Trying to find any input field...`);
      try {
        await page.waitForSelector('input', { timeout: 10000 });
        botStatus.logs.push(`${new Date().toISOString()}: ✅ Found input fields on page`);
        
        // Analyze the actual form structure
        botStatus.logs.push(`${new Date().toISOString()}: 🔍 Analyzing form structure...`);
        const formAnalysis = await page.evaluate(() => {
          const inputs = document.querySelectorAll('input');
          const forms = document.querySelectorAll('form');
          return {
            inputCount: inputs.length,
            formCount: forms.length,
            inputTypes: Array.from(inputs).map(input => ({
              type: input.type,
              name: input.name,
              id: input.id,
              placeholder: input.placeholder,
              className: input.className
            })),
            formHTML: Array.from(forms).map(form => form.outerHTML)
          };
        });
        
        botStatus.logs.push(`${new Date().toISOString()}: 📊 Form analysis: ${formAnalysis.inputCount} inputs, ${formAnalysis.formCount} forms`);
        botStatus.logs.push(`${new Date().toISOString()}: 📋 Input details: ${JSON.stringify(formAnalysis.inputTypes, null, 2)}`);
        
      } catch (error2) {
        botStatus.logs.push(`${new Date().toISOString()}: ❌ No input fields found: ${error2.message}`);
        throw new Error('Login form not found');
      }
    }
    
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
    botStatus.logs.push(`${new Date().toISOString()}: 📧 Filling email field with selector: "${emailSelector}"`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Typing email: ${process.env.POLAROO_EMAIL}`);
    await page.type(emailSelector, process.env.POLAROO_EMAIL, { delay: 100 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Email field filled successfully`);
    
    // Fill password  
    botStatus.logs.push(`${new Date().toISOString()}: 🔒 Filling password field with selector: "${passwordSelector}"`);
    botStatus.logs.push(`${new Date().toISOString()}: ⏳ Typing password...`);
    await page.type(passwordSelector, process.env.POLAROO_PASSWORD, { delay: 100 });
    botStatus.logs.push(`${new Date().toISOString()}: ✅ Password field filled successfully`);

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
