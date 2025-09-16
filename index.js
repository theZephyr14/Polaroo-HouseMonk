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

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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

// Data extraction endpoint - SIMPLIFIED AND ROBUST
app.post('/api/extract-data', async (req, res) => {
    const { period } = req.body;
    
    // Set short timeout for Render
    const timeout = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                success: false,
                error: 'Request timeout - operation took too long',
                period: period
            });
        }
    }, 25000); // 25 seconds max
    
    try {
        console.log(`🤖 Starting FAST extraction for ${period}...`);
        
        // Step 1: Read Book1.xlsx (this is fast and reliable)
        console.log('📖 Reading Book1.xlsx...');
        const { propertyName, totalProperties } = getFirstPropertyFromBook1();
        console.log(`✅ Property: ${propertyName} (${totalProperties} total properties)`);
        
        // Step 2: Generate mock data for now (to avoid Polaroo/Cohere timeouts)
        console.log('🔄 Generating sample data for demonstration...');
        const dateRange = getPeriodDateRange(period);
        const sampleData = generateSampleDataForPeriod(period, propertyName, dateRange);
        
        clearTimeout(timeout);
        
        res.json({
            success: true,
            data: sampleData,
            period: period,
            propertyName: propertyName,
            message: `Sample data for ${propertyName} - ${period}`,
            debug: {
                totalRows: sampleData.length,
                dateRange: dateRange,
                timestamp: new Date().toISOString(),
                note: "Using sample data to avoid 502 errors - real integration coming next"
            }
        });

    } catch (error) {
        clearTimeout(timeout);
        console.error('❌ Extraction error:', error.message);
        
        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                error: error.message,
                period: period,
                timestamp: new Date().toISOString()
            });
        }
    }
});

// Generate sample data for the period to avoid 502 errors
function generateSampleDataForPeriod(period, propertyName, dateRange) {
    const baseData = [
        {
            rowNumber: 1,
            asset: propertyName,
            company: "COMERCIALIZADORA REGULADA GAS & POWER, S.A.",
            service: "Gas",
            initialDate: dateRange.start,
            finalDate: dateRange.end,
            subtotal: "12,92 €",
            taxes: "2,71 €",
            total: "15,63 €"
        },
        {
            rowNumber: 2,
            asset: propertyName,
            company: "GAOLANIA SERVICIOS S.L.",
            service: "Electricity",
            initialDate: dateRange.start,
            finalDate: getMiddleDate(dateRange.start, dateRange.end),
            subtotal: "123,45 €",
            taxes: "25,92 €",
            total: "149,37 €"
        },
        {
            rowNumber: 3,
            asset: propertyName,
            company: "GAOLANIA SERVICIOS S.L.",
            service: "Electricity",
            initialDate: getMiddleDate(dateRange.start, dateRange.end),
            finalDate: dateRange.end,
            subtotal: "98,76 €",
            taxes: "20,74 €",
            total: "119,50 €"
        },
        {
            rowNumber: 4,
            asset: propertyName,
            company: "Aigües de Barcelona",
            service: "Water",
            initialDate: dateRange.start,
            finalDate: dateRange.end,
            subtotal: "187,23 €",
            taxes: "39,32 €",
            total: "226,55 €"
        }
    ];
    
    return baseData;
}

// Helper to get middle date of a period
function getMiddleDate(startDate, endDate) {
    const [startDay, startMonth, startYear] = startDate.split('/');
    const [endDay, endMonth, endYear] = endDate.split('/');
    
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    
    const middle = new Date((start.getTime() + end.getTime()) / 2);
    
    const day = String(middle.getDate()).padStart(2, '0');
    const month = String(middle.getMonth() + 1).padStart(2, '0');
    const year = middle.getFullYear();
    
    return `${day}/${month}/${year}`;
}

// Helper function to read first property from Book1.xlsx
function getFirstPropertyFromBook1() {
    try {
        // Read the actual Book1.xlsx file
        const workbook = XLSX.readFile('Book1.xlsx');
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        if (data.length === 0) {
            throw new Error('Book1.xlsx is empty');
        }
        
        // Get the first property name from the 'name' column
        const firstRow = data[0];
        const propertyName = firstRow.name;
        
        if (!propertyName) {
            throw new Error('No property name found in Book1.xlsx');
        }
        
        return {
            propertyName: propertyName.toString().trim(),
            totalProperties: data.length
        };
    } catch (error) {
        console.error('Error reading Book1.xlsx:', error);
        throw new Error(`Failed to read Book1.xlsx: ${error.message}`);
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
    try {
        // Step 1: Go to accounting dashboard
        console.log('🌐 Accessing accounting dashboard...');
        const dashboardResponse = await axios.get('https://app.polaroo.com/dashboard/accounting', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookies
            },
            timeout: 15000
        });
        
        if (dashboardResponse.status !== 200) {
            throw new Error(`Failed to access dashboard: ${dashboardResponse.status}`);
        }
        
        console.log('✅ Dashboard accessed successfully');
        
        // Step 2: Search for the property in the search bar
        console.log(`🔍 Searching for property: "${propertyName}"`);
        
        // Try to make a search request (this might be a POST or GET depending on Polaroo's implementation)
        const searchResponse = await axios.post('https://app.polaroo.com/dashboard/accounting/search', {
            query: propertyName,
            filter: 'all'
        }, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': cookies,
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: 15000
        });
        
        console.log('✅ Search completed');
        
        // Step 3: Parse the actual HTML/JSON response to extract table data
        const extractedData = parseTableDataFromResponse(searchResponse.data, propertyName);
        
        if (extractedData.length === 0) {
            throw new Error(`No data found for property: ${propertyName}`);
        }
        
        console.log(`✅ Found ${extractedData.length} rows for property "${propertyName}"`);
        return extractedData;
        
    } catch (error) {
        console.error('❌ Error searching property in Polaroo:', error.message);
        throw new Error(`Failed to search property in Polaroo: ${error.message}`);
    }
}

// Helper function to parse table data from Polaroo response
function parseTableDataFromResponse(responseData, propertyName) {
    try {
        // This function needs to parse the actual HTML/JSON from Polaroo
        // For now, we'll throw an error to force proper implementation
        
        if (typeof responseData === 'string' && responseData.includes('login')) {
            throw new Error('Not logged in - redirected to login page');
        }
        
        // TODO: Implement actual HTML parsing here
        // This would use something like cheerio to parse the HTML table
        // and extract the real data from Polaroo
        
        throw new Error('HTML parsing not yet implemented - need to parse actual Polaroo table data');
        
      } catch (error) {
        throw new Error(`Failed to parse Polaroo data: ${error.message}`);
    }
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
    console.log('🧠 Starting Cohere AI analysis...');
    
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
    
    Return ONLY a valid JSON object with this exact structure:
    {
        "selected_electricity_rows": [array of row numbers],
        "selected_water_rows": [array of row numbers],
        "total_electricity_cost": "amount in euros",
        "total_water_cost": "amount in euros",
        "reasoning": "explanation of selections",
        "missing_bills": "any missing bills"
    }
    `;
    
    try {
        const response = await cohere.chat({
            model: 'command-r-plus',
            message: prompt,
            temperature: 0.1,
            maxTokens: 1000
        });
        
        console.log('🧠 Cohere raw response:', response.text);
        
        // Extract JSON from response
        const responseText = response.text.trim();
        let jsonMatch = responseText.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('No JSON found in Cohere response');
        }
        
        const parsedResult = JSON.parse(jsonMatch[0]);
        console.log('✅ Cohere analysis successful:', parsedResult);
        
        return parsedResult;

  } catch (error) {
        console.error('❌ Cohere analysis failed:', error.message);
        throw new Error(`Cohere AI analysis failed: ${error.message}`);
    }
}

// Helper function to check if a date is in range
function isDateInRange(dateStr, startDate, endDate) {
    try {
        // Convert DD/MM/YYYY to Date objects
        const [day, month, year] = dateStr.split('/');
        const date = new Date(year, month - 1, day);
        
        const [startDay, startMonth, startYear] = startDate.split('/');
        const start = new Date(startYear, startMonth - 1, startDay);
        
        const [endDay, endMonth, endYear] = endDate.split('/');
        const end = new Date(endYear, endMonth - 1, endDay);
        
        return date >= start && date <= end;
  } catch (error) {
        console.error('Date parsing error:', error);
        return false;
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
