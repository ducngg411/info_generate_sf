const express = require('express');
const cors = require('cors');
const Mailjs = require("@cemalgnlts/mailjs");
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Mailjs
const mailjs = new Mailjs();

// Load US cities data
const usCitiesData = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'us_cities_by_state.json'), 'utf8'));

// Helper functions
function generateRandomString(length = 10) {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function generateZipCodeByState(state) {
    const zipRanges = {
        'AL': { min: 35000, max: 36999 },
        'AK': { min: 99500, max: 99999 },
        'AZ': { min: 85000, max: 86999 },
        'AR': { min: 71600, max: 72999 },
        'CA': { min: 90000, max: 96699 },
        'CO': { min: 80000, max: 81699 },
        'CT': { min: 6000, max: 6999 },
        'DE': { min: 19700, max: 19999 },
        'DC': { min: 20000, max: 20599 },
        'FL': { min: 32000, max: 34999 },
        'GA': { min: 30000, max: 31999 },
        'HI': { min: 96700, max: 96899 },
        'ID': { min: 83200, max: 83999 },
        'IL': { min: 60000, max: 62999 },
        'IN': { min: 46000, max: 47999 },
        'IA': { min: 50000, max: 52899 },
        'KS': { min: 66000, max: 67999 },
        'KY': { min: 40000, max: 42799 },
        'LA': { min: 70000, max: 71599 },
        'ME': { min: 3900, max: 4999 },
        'MD': { min: 20600, max: 21999 },
        'MA': { min: 1000, max: 2799 },
        'MI': { min: 48000, max: 49999 },
        'MN': { min: 55000, max: 56799 },
        'MS': { min: 38600, max: 39799 },
        'MO': { min: 63000, max: 65899 },
        'MT': { min: 59000, max: 59999 },
        'NE': { min: 68000, max: 69399 },
        'NV': { min: 88900, max: 89999 },
        'NH': { min: 3000, max: 3899 },
        'NJ': { min: 7000, max: 8999 },
        'NM': { min: 87000, max: 88499 },
        'NY': { min: 10000, max: 14999 },
        'NC': { min: 27000, max: 28999 },
        'ND': { min: 58000, max: 58899 },
        'OH': { min: 43000, max: 45999 },
        'OK': { min: 73000, max: 74999 },
        'OR': { min: 97000, max: 97999 },
        'PA': { min: 15000, max: 19699 },
        'RI': { min: 2800, max: 2999 },
        'SC': { min: 29000, max: 29999 },
        'SD': { min: 57000, max: 57799 },
        'TN': { min: 37000, max: 38599 },
        'TX': { min: 75000, max: 79999 },
        'UT': { min: 84000, max: 84999 },
        'VT': { min: 5000, max: 5999 },
        'VA': { min: 22000, max: 24699 },
        'WA': { min: 98000, max: 99499 },
        'WV': { min: 24700, max: 26999 },
        'WI': { min: 53000, max: 54999 },
        'WY': { min: 82000, max: 83199 }
    };
    
    const range = zipRanges[state];
    if (!range) {
        return faker.number.int({ min: 10000, max: 99999 }).toString();
    }
    
    return faker.number.int({ min: range.min, max: range.max }).toString().padStart(5, '0');
}

function generatePassword(firstName, lastName) {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '~!@#$%&*';
    
    // Tạo password với ít nhất 3 loại ký tự
    let password = '';
    const types = [uppercase, lowercase, numbers, special];
    
    // Đảm bảo có ít nhất 3 loại ký tự
    const selectedTypes = types.sort(() => Math.random() - 0.5).slice(0, 3);
    
    // Thêm ít nhất 1 ký tự từ mỗi loại đã chọn
    selectedTypes.forEach(type => {
        password += type[Math.floor(Math.random() * type.length)];
    });
    
    // Thêm các ký tự ngẫu nhiên để đạt độ dài tối thiểu 8
    const allChars = types.join('');
    while (password.length < 8) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Kiểm tra xem password có chứa tên không
    const nameParts = [...firstName.toLowerCase(), ...lastName.toLowerCase()];
    const hasNamePart = nameParts.some(part => password.toLowerCase().includes(part));
    
    // Nếu chứa tên, tạo lại password
    if (hasNamePart) {
        return generatePassword(firstName, lastName);
    }
    
    return password;
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'info_tool.html'));
});

app.post('/api/generate-info', async (req, res) => {
    try {
        const count = req.body.count || 1;
        const results = [];
        const maxRetries = 2;

        // Helper function to create email with delay and retry
        const createEmailWithDelay = async (retryCount = 0) => {
            try {
                const account = await mailjs.createOneAccount();
                if (!account.status) {
                    throw new Error('Failed to create email account: ' + account.message);
                }
                return { success: true, account };
            } catch (error) {
                if (retryCount < maxRetries) {
                    console.log(`Retry ${retryCount + 1}/${maxRetries} after error: ${error.message}`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    return createEmailWithDelay(retryCount + 1);
                }
                return { success: false, error: error.message };
            }
        };

        // Process each account creation sequentially with delay
        for (let i = 0; i < count; i++) {
            try {
                res.write(JSON.stringify({
                    type: 'progress',
                    current: i + 1,
                    total: count,
                    status: 'Creating email account...'
                }) + '\n');

                const { success, account, error } = await createEmailWithDelay();
                
                if (!success) {
                    res.write(JSON.stringify({
                        type: 'error',
                        message: `Failed to create account ${i + 1}: ${error}`,
                        current: i + 1,
                        total: count
                    }) + '\n');
                    continue;
                }

                res.write(JSON.stringify({
                    type: 'progress',
                    current: i + 1,
                    total: count,
                    status: 'Generating user info...'
                }) + '\n');
                
                // Generate random name using Faker
                const firstName = faker.person.firstName();
                const lastName = faker.person.lastName();
                
                // Generate random birth date (18-19 years old)
                const today = new Date();
                const birthYear = today.getFullYear() - Math.floor(Math.random() * 2) - 18;
                const birthMonth = Math.floor(Math.random() * 12) + 1;
                const birthDay = Math.floor(Math.random() * 28) + 1;
                
                // Generate SSN
                const firstGroup = Math.floor(Math.random() * 8) + 1;
                const secondGroup = Math.floor(Math.random() * 99) + 1;
                const thirdGroup = Math.floor(Math.random() * 9999) + 1;
                const ssn = `${firstGroup.toString().padStart(3, '0')}-${secondGroup.toString().padStart(2, '0')}-${thirdGroup.toString().padStart(4, '0')}`;
                
                // Generate state and zip code
                const states = {
                    'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
                    'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
                    'DC': 'District of Columbia', 'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii',
                    'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
                    'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine',
                    'MD': 'Maryland', 'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota',
                    'MS': 'Mississippi', 'MO': 'Missouri'
                };
                
                const stateCodes = Object.keys(states);
                const stateCode = stateCodes[Math.floor(Math.random() * stateCodes.length)];
                const stateName = states[stateCode];
                const zipCode = generateZipCodeByState(stateCode);

                // Generate address
                const address = faker.location.streetAddress();
                const apartment = Math.random() < 0.3 ? faker.string.alpha({ length: { min: 1, max: 3 } }) : '';
                
                // Generate phone number
                const areaCode = faker.number.int({ min: 200, max: 999 }).toString();
                const prefix = faker.number.int({ min: 200, max: 999 }).toString();
                const lineNumber = faker.number.int({ min: 1000, max: 9999 }).toString();
                const phoneNumber = `(${areaCode}) ${prefix}-${lineNumber}`;

                // Generate pronouns
                const pronouns = ['He/Him', 'She/Her', 'They/Them'];
                const pronoun = pronouns[Math.floor(Math.random() * pronouns.length)];

                // Generate suffix
                const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV'];
                const suffix = Math.random() < 0.2 ? suffixes[Math.floor(Math.random() * suffixes.length)] : '';

                // Generate city
                const city = faker.location.city();

                // Generate additional email
                const additionalDomains = ['gmail.com', 'outlook.com'];
                const domain = additionalDomains[Math.floor(Math.random() * additionalDomains.length)];
                const additionalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${faker.number.int({min:100, max:999})}@${domain}`;
                
                const userInfo = {
                    firstName,
                    lastName,
                    email: account.data.username,
                    emailPassword: account.data.password,
                    password: generatePassword(firstName, lastName),
                    birthDate: `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`,
                    ssn,
                    stateCode,
                    stateName,
                    zipCode,
                    address,
                    apartment,
                    city,
                    phone: phoneNumber,
                    pronoun,
                    suffix,
                    mailjs: {
                        token: mailjs.token,
                        id: mailjs.id
                    },
                    additionalInfo: {
                        firstName,
                        lastName,
                        email: additionalEmail
                    }
                };

                results.push(userInfo);

                res.write(JSON.stringify({
                    type: 'progress',
                    current: i + 1,
                    total: count,
                    status: 'Account created successfully',
                    data: userInfo
                }) + '\n');

                if (i < count - 1) {
                    res.write(JSON.stringify({
                        type: 'progress',
                        current: i + 1,
                        total: count,
                        status: 'Waiting 5 seconds before next account...'
                    }) + '\n');
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }

            } catch (error) {
                console.error(`Error creating account ${i + 1}:`, error);
                res.write(JSON.stringify({
                    type: 'error',
                    message: `Error creating account ${i + 1}: ${error.message}`,
                    current: i + 1,
                    total: count
                }) + '\n');
                continue;
            }
        }

        res.write(JSON.stringify({
            type: 'complete',
            success: true,
            data: results
        }) + '\n');
        res.end();

    } catch (error) {
        console.error('Error generating info:', error);
        res.write(JSON.stringify({
            type: 'error',
            message: error.message
        }) + '\n');
        res.end();
    }
});

app.post('/api/get-verification-code', async (req, res) => {
    try {
        const { email, mailjs: mailjsInfo } = req.body;
        
        // Login with token if available
        if (mailjsInfo && mailjsInfo.token) {
            await mailjs.loginWithToken(mailjsInfo.token);
        }
        
        const messages = await mailjs.getMessages();
        if (!messages.status) {
            throw new Error('Failed to get messages: ' + messages.message);
        }
        
        if (messages.data && messages.data.length > 0) {
            const latestMessage = messages.data[0];
            const message = await mailjs.getMessage(latestMessage.id);
            if (!message.status) {
                throw new Error('Failed to get message: ' + message.message);
            }
            
            const content = message.data.text;
            // Extract verification code from email content using multiple patterns
            const patterns = [
                /verification code[:\s]*([A-Z0-9]{4,8})/i,
                /code[:\s]*([A-Z0-9]{4,8})/i,
                /([A-Z0-9]{6})/, // Tìm chuỗi 6 ký tự chữ cái viết hoa và số
                /\b([A-Z0-9]{4,8})\b/, // Tìm các chuỗi 4-8 ký tự gồm chữ và số
                /confirmation code[:\s]*([A-Z0-9]{4,8})/i,
                /verify[:\s]*([A-Z0-9]{4,8})/i,
                /your code[:\s]*([A-Z0-9]{4,8})/i,
                /begin your Santa Fe College Application:[ \t]*(?:\*\*)?(\d{6})(?:\*\*)?/i,
                /code to begin your[^:]*:[ \t]*([0-9]{6})/i,
                /code[^:]*:[ \t]*([0-9]{6})/i,
                /\b(\d{6})\b/, // Tìm chuỗi 6 chữ số
                /verification code is[:\s]*([A-Z0-9]{4,8})/i,
                /your verification code[:\s]*([A-Z0-9]{4,8})/i,
                /use this code[:\s]*([A-Z0-9]{4,8})/i,
                /enter this code[:\s]*([A-Z0-9]{4,8})/i
            ];

            for (const pattern of patterns) {
                const match = content.match(pattern);
                if (match && match[1]) {
                    // Loại bỏ các ký tự không mong muốn và kiểm tra độ dài
                    const code = match[1].trim().replace(/[^A-Z0-9]/g, '');
                    if (code.length >= 4 && code.length <= 8) {
                        console.log('Found verification code:', code);
                        res.json({ success: true, code });
                        return;
                    }
                }
            }
        }
        
        res.json({ success: false, message: 'No verification code found' });
    } catch (error) {
        console.error('Error getting verification code:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/save-account', async (req, res) => {
    try {
        const { sfId, info } = req.body;
        const accountInfo = {
            sfId,
            email: info.email,
            emailPassword: info.emailPassword,
            firstName: info.firstName,
            lastName: info.lastName,
            password: info.password,
            dateCreated: new Date().toISOString()
        };

        // Read existing accounts
        let accounts = [];
        try {
            const data = fs.readFileSync('accounts.json', 'utf8');
            accounts = JSON.parse(data);
        } catch (error) {
            // File doesn't exist or is invalid, start with empty array
        }

        // Add new account
        accounts.push(accountInfo);

        // Save back to file
        fs.writeFileSync('accounts.json', JSON.stringify(accounts, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving account:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
}); 