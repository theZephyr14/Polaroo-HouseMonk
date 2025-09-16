const express = require('express');
const path = require('path');
const axios = require('axios');
const XLSX = require('xlsx');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static('.'));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple test endpoint (no Puppeteer)
app.post('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Server is working!',
        timestamp: new Date().toISOString()
    });
});

// Test if we can reach Polaroo at all
app.get('/api/test-polaroo', async (req, res) => {
    try {
        console.log('🔍 Testing connection to Polaroo...');
        const response = await axios.get('https://app.polaroo.com', {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        res.json({
            success: true,
            message: 'Can reach Polaroo!',
            status: response.status,
            contentLength: response.data.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Cannot reach Polaroo:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            code: error.code,
            timestamp: new Date().toISOString()
        });
    }
});

// Bot API endpoint - NO PUPPETEER!
app.post('/api/calculate', async (req, res) => {
    try {
        console.log('🤖 Starting Polaroo bot (HTTP version)...');
        console.log('🔍 DEBUG: Bot started at', new Date().toISOString());
        
        // Step 1: Get login page to get CSRF token or session
        console.log('🌐 Step 1: Getting login page...');
        console.log('🔍 DEBUG: Attempting to reach https://app.polaroo.com/login');
        
        const loginPageResponse = await axios.get('https://app.polaroo.com/login', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });
        console.log('✅ Login page loaded - Status:', loginPageResponse.status);
        console.log('🔍 DEBUG: Response headers:', Object.keys(loginPageResponse.headers));
        
        // Step 2: Try to login with POST request
        console.log('📝 Step 2: Attempting login...');
        console.log('🔍 DEBUG: Sending login request to https://app.polaroo.com/login');
        
        const loginResponse = await axios.post('https://app.polaroo.com/login', {
            email: 'francisco@node-living.com',
            password: 'Aribau126!'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            maxRedirects: 0,
            timeout: 10000,
            validateStatus: function (status) {
                console.log('🔍 DEBUG: Login response status:', status);
                return status >= 200 && status < 400; // Accept redirects
            }
        });
        console.log('✅ Login request sent - Status:', loginResponse.status);
        console.log('🔍 DEBUG: Login response headers:', Object.keys(loginResponse.headers));
        
        // Step 3: Try to access accounting dashboard
        console.log('🌐 Step 3: Accessing accounting dashboard...');
        console.log('🔍 DEBUG: Attempting to reach https://app.polaroo.com/dashboard/accounting');
        
        const dashboardResponse = await axios.get('https://app.polaroo.com/dashboard/accounting', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': loginResponse.headers['set-cookie']?.join('; ') || ''
            },
            timeout: 10000
        });
        console.log('✅ Accounting dashboard accessed - Status:', dashboardResponse.status);
        console.log('🔍 DEBUG: Dashboard response length:', dashboardResponse.data.length);

        console.log('🎉 Bot completed successfully!');
        console.log('🔍 DEBUG: Bot completed at', new Date().toISOString());
        
        res.json({ 
            success: true, 
            message: 'Bot completed successfully! (HTTP version)',
            debug: {
                loginPageStatus: loginPageResponse.status,
                loginStatus: loginResponse.status,
                dashboardStatus: dashboardResponse.status,
                dashboardLength: dashboardResponse.data.length,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Bot error:', error.message);
        console.error('🔍 DEBUG: Full error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message,
            debug: {
                errorType: error.name,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            }
        });
    }
});

app.listen(PORT, () => {
    console.log(`Calculator app running on port ${PORT}`);
});
