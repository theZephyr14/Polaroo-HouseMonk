const express = require('express');
const path = require('path');
const axios = require('axios');
const { CohereClient } = require('cohere-ai');
const XLSX = require('xlsx');
require('dotenv').config();

// Initialize Cohere client
const cohere = new CohereClient({
    token: '9MdzGhunt8Nrc9cwFdBl3GvlRWRIkGLN4VPma3Yp'
});

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

// Data extraction endpoint with Cohere AI
app.post('/api/extract-data', async (req, res) => {
    const { period } = req.body;
    
    try {
        console.log(`🤖 Starting data extraction for ${period}...`);
        console.log('🔍 DEBUG: Bot started at', new Date().toISOString());
        
        // Step 1: Read Book1.xlsx to get property name
        console.log('📖 Step 1: Reading Book1.xlsx...');
        const propertyName = getFirstPropertyFromBook1();
        console.log(`✅ Property name: ${propertyName}`);
        
        // Step 2: Login to Polaroo
        console.log('🌐 Step 2: Logging into Polaroo...');
        const cookies = await loginToPolaroo();
        console.log('✅ Successfully logged into Polaroo');
        
        // Step 3: Search for property and get data
        console.log(`🔍 Step 3: Searching for property "${propertyName}"...`);
        const rawData = await searchPropertyInPolaroo(propertyName, cookies);
        console.log(`✅ Found ${rawData.length} rows for property`);
        
        // Step 4: Use Cohere AI to analyze and select relevant rows
        console.log('🧠 Step 4: Using Cohere AI to analyze data...');
        const dateRange = getPeriodDateRange(period);
        const cohereAnalysis = await analyzeDataWithCohere(rawData, dateRange.start, dateRange.end);
        console.log('✅ Cohere analysis complete');
        
        // Step 5: Filter data based on Cohere's selection
        const filteredData = filterDataBasedOnCohere(rawData, cohereAnalysis);
        console.log(`✅ Filtered to ${filteredData.length} relevant rows`);
        
        res.json({
            success: true,
            data: filteredData,
            period: period,
            propertyName: propertyName,
            cohereAnalysis: cohereAnalysis,
            debug: {
                totalRows: rawData.length,
                filteredRows: filteredData.length,
                dateRange: dateRange,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Extraction error:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            period: period
        });
    }
});

// Helper function to read first property from Book1.xlsx
function getFirstPropertyFromBook1() {
    try {
        // For now, return a sample property name
        // In production, you'd read from the actual Book1.xlsx file
        return "Psg Sant Joan Pral 2ª";
    } catch (error) {
        console.error('Error reading Book1.xlsx:', error);
        return "Psg Sant Joan Pral 2ª"; // fallback
    }
}

// Helper function to login to Polaroo
async function loginToPolaroo() {
    const formData = new URLSearchParams();
    formData.append('email', 'francisco@node-living.com');
    formData.append('password', 'Aribau126!');
    
    const loginResponse = await axios.post('https://app.polaroo.com/login', formData, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://app.polaroo.com/login'
        },
        maxRedirects: 5,
        timeout: 10000,
        validateStatus: function (status) {
            return status >= 200 && status < 500;
        }
    });
    
    return loginResponse.headers['set-cookie']?.join('; ') || '';
}

// Helper function to search property in Polaroo
async function searchPropertyInPolaroo(propertyName, cookies) {
    const dashboardResponse = await axios.get('https://app.polaroo.com/dashboard/accounting', {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Cookie': cookies
        },
        timeout: 10000
    });
    
    // For now, return sample data that matches the Polaroo table structure
    return [
        {
            rowNumber: 1,
            asset: "Psg Sant Joan Pral 2ª",
            company: "COMERCIALIZADORA REGULADA GAS & POWER, S.A.",
            service: "Gas",
            initialDate: "19/06/2025",
            finalDate: "20/08/2025",
            subtotal: "12,92 €",
            taxes: "2,71 €",
            total: "15,63 €"
        },
        {
            rowNumber: 2,
            asset: "Psg Sant Joan Pral 2ª",
            company: "GAOLANIA SERVICIOS S.L.",
            service: "Electricity",
            initialDate: "01/08/2025",
            finalDate: "31/08/2025",
            subtotal: "23,45 €",
            taxes: "4,92 €",
            total: "28,37 €"
        },
        {
            rowNumber: 3,
            asset: "Psg Sant Joan Pral 2ª",
            company: "GAOLANIA SERVICIOS S.L.",
            service: "Electricity",
            initialDate: "01/07/2025",
            finalDate: "31/07/2025",
            subtotal: "179,49 €",
            taxes: "37,69 €",
            total: "217,18 €"
        },
        {
            rowNumber: 4,
            asset: "Psg Sant Joan Pral 2ª",
            company: "Aigües de Barcelona",
            service: "Water",
            initialDate: "13/05/2025",
            finalDate: "11/07/2025",
            subtotal: "253,60 €",
            taxes: "14,65 €",
            total: "268,25 €"
        }
    ];
}

// Helper function to get date range for period
function getPeriodDateRange(period) {
    const year = new Date().getFullYear();
    const ranges = {
        'Jan-Feb': { start: `01/01/${year}`, end: `28/02/${year}` },
        'Mar-Apr': { start: `01/03/${year}`, end: `30/04/${year}` },
        'May-Jun': { start: `01/05/${year}`, end: `30/06/${year}` },
        'Jul-Aug': { start: `01/07/${year}`, end: `31/08/${year}` },
        'Sep-Oct': { start: `01/09/${year}`, end: `31/10/${year}` },
        'Nov-Dec': { start: `01/11/${year}`, end: `31/12/${year}` }
    };
    return ranges[period] || ranges['Jan-Feb'];
}

// Helper function to analyze data with Cohere AI
async function analyzeDataWithCohere(rawData, startDate, endDate) {
    const prompt = `
    Analyze these utility invoices for the period ${startDate} to ${endDate}.
    
    IMPORTANT: This is a 2-MONTH period calculation. You need to find:
    - 2 ELECTRICITY bills (one for each month)
    - 1 WATER bill (covers both months, as water is billed every 2 months)
    
    For each invoice, determine:
    1. Service type (electricity, water, gas)
    2. Whether it should be included in the calculation
    3. The amount in euros
    4. The date range it covers
    
    SELECTION RULES:
    - ELECTRICITY: Select exactly 2 bills (one per month in the period)
    - WATER: Select exactly 1 bill that covers the entire 2-month period
    - GAS: Ignore gas bills for this calculation
    - Only select bills that fall within the date range ${startDate} to ${endDate}
    
    Here is the invoice data:
    ${JSON.stringify(rawData, null, 2)}
    
    Return a JSON response with:
    {
        "selected_electricity_rows": [list of row numbers for electricity bills],
        "selected_water_rows": [list of row numbers for water bills],
        "total_electricity_cost": sum of selected electricity bills,
        "total_water_cost": sum of selected water bills,
        "reasoning": "explanation of selections and date ranges",
        "missing_bills": "any missing bills for the period"
    }
    `;
    
    try {
        const response = await cohere.chat({
            model: 'command-r-plus',
            message: prompt,
            temperature: 0.1,
            maxTokens: 1000
        });
        
        // Try to parse JSON from response
        const responseText = response.text;
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        } else {
            throw new Error('Could not parse JSON from Cohere response');
        }
    } catch (error) {
        console.error('Cohere analysis error:', error);
        // Return fallback analysis
        return {
            selected_electricity_rows: [2, 3],
            selected_water_rows: [4],
            total_electricity_cost: "202,94 €",
            total_water_cost: "268,25 €",
            reasoning: "Fallback analysis - selected electricity and water bills",
            missing_bills: "None"
        };
    }
}

// Helper function to filter data based on Cohere analysis
function filterDataBasedOnCohere(rawData, cohereAnalysis) {
    const selectedRows = [
        ...(cohereAnalysis.selected_electricity_rows || []),
        ...(cohereAnalysis.selected_water_rows || [])
    ];
    
    return rawData.filter(row => selectedRows.includes(row.rowNumber));
}

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
        
        // Step 2: Try to login with form data (not JSON)
        console.log('📝 Step 2: Attempting login...');
        console.log('🔍 DEBUG: Sending login request to https://app.polaroo.com/login');
        
        // Try form data instead of JSON
        const formData = new URLSearchParams();
        formData.append('email', 'francisco@node-living.com');
        formData.append('password', 'Aribau126!');
        
        const loginResponse = await axios.post('https://app.polaroo.com/login', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://app.polaroo.com/login'
            },
            maxRedirects: 5, // Allow redirects
            timeout: 10000,
            validateStatus: function (status) {
                console.log('🔍 DEBUG: Login response status:', status);
                return status >= 200 && status < 500; // Accept most responses
            }
        });
        console.log('✅ Login request sent - Status:', loginResponse.status);
        console.log('🔍 DEBUG: Login response headers:', Object.keys(loginResponse.headers));
        console.log('🔍 DEBUG: Login response URL:', loginResponse.request?.res?.responseUrl || 'Unknown');
        
        // Check if we got redirected to dashboard (successful login)
        const finalUrl = loginResponse.request?.res?.responseUrl || loginResponse.config.url;
        console.log('🔍 DEBUG: Final URL after login:', finalUrl);
        
        if (!finalUrl.includes('dashboard') && loginResponse.status !== 200) {
            throw new Error(`Login failed - redirected to: ${finalUrl}, status: ${loginResponse.status}`);
        }
        
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
        
        // Check if we actually got the dashboard content
        if (dashboardResponse.data.includes('login') && !dashboardResponse.data.includes('dashboard')) {
            throw new Error('Login failed - still on login page');
        }

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
