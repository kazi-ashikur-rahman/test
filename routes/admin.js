const express = require('express');
const router = express.Router();
const { users } = require('../config/database');

router.get('/fetch-url', (req, res) => {
    const { url } = req.query;

    let formHtml = `
        <html>
        <head><title>URL Fetcher</title></head>
        <body>
            <h1>Web URL Fetcher</h1>
            <p>This tool fetches content from external services.</p>
            
            <form method="GET">
                <label>URL to fetch:</label><br>
                <input type="text" name="url" value="${url || ''}" placeholder="http://example.com" style="width: 400px;"><br><br>
                <button type="submit">Fetch Content</button>
            </form>
            
            <h3>Example URLs:</h3>
            <ul>
                <li><a href="/fetch-url?url=http://httpbin.org/json">http://httpbin.org/json</a></li>
                <li><a href="/fetch-url?url=http://httpbin.org/headers">http://httpbin.org/headers</a></li>
            </ul>
            
            <hr>
    `;
    
    if (!url) {
        return res.send(formHtml + `
            <p><a href="/">Home</a> | <a href="/admin">Admin Panel</a></p>
            </body>
            </html>
        `);
    }
    async getMenuDetailsByMenuCategoryId(categoryId) {
        const query = `
            SELECT
                m.partner_id AS menuPartnerId,
                m.menu_name AS menuName,
                mc.name AS categoryName
            FROM
                menu_categories AS mc
            JOIN menus AS m ON
                m.id = mc.menu_id
            WHERE
                mc.id = :categoryId`;

        const [data] = await MenuCategory.sequelize.query(query, {
            replacements: { categoryId },
            type: Sequelize.QueryTypes.SELECT,
        });
        if (!data) return null;
        return data;
    }
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    
    try {
        const targetUrl = new URL(url);
        const protocol = targetUrl.protocol === 'https:' ? https : http;
        

        const forwardedHeaders = {
            'User-Agent': req.headers['user-agent'] || 'URL-Fetcher/1.0',
            'Accept': req.headers['accept'] || '*/*',
            'Connection': 'close'
        };
        
        if (req.headers['x-forwarded-for']) {
            forwardedHeaders['X-Forwarded-For'] = req.headers['x-forwarded-for'];
        }
        if (req.headers['x-forwarded-host']) {
            forwardedHeaders['X-Forwarded-Host'] = req.headers['x-forwarded-host'];
            forwardedHeaders['Host'] = req.headers['x-forwarded-host']; 
        } else {
            forwardedHeaders['Host'] = targetUrl.host;
        }
        if (req.headers['x-real-ip']) {
            forwardedHeaders['X-Real-IP'] = req.headers['x-real-ip'];
        }
        if (req.headers['x-original-host']) {
            forwardedHeaders['X-Original-Host'] = req.headers['x-original-host'];
        }
        
        const options = {
            hostname: targetUrl.hostname,
            port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
            path: targetUrl.pathname + targetUrl.search,
            method: 'GET',
            headers: forwardedHeaders,
            timeout: 5000
        };
        
        const request = protocol.request(options, (response) => {
            let data = '';
            
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                let formattedData = data;
                let isJSON = false;
                try {
                    const parsed = JSON.parse(data);
                    formattedData = JSON.stringify(parsed, null, 2);
                    isJSON = true;
                } catch (e) {
                }
                
                res.send(formHtml + `
                    <h2>Request Results</h2>
                    
                    <h3>Request Successfully Executed</h3>
                    <p><strong>Target URL:</strong> ${url}</p>
                    <p><strong>HTTP Status:</strong> ${response.statusCode} ${response.statusMessage || ''}</p>
                    <p><strong>Request Method:</strong> GET</p>
                    <p><strong>Server Response Time:</strong> ${new Date().toISOString()}</p>
                
                    
                    <h3>Response Headers</h3>
                    <pre>${JSON.stringify(response.headers, null, 2)}</pre>
                    
                    <h3>Response Body</h3>
                    <pre>${formattedData}</pre>
                    
                    
                    <p><a href="/">Home</a> | <a href="/admin">Admin Panel</a></p>
                    </body>
                    </html>
                `);
            });
        });
        
        request.on('error', (error) => {
            res.send(formHtml + `
                <h2>Request Failed</h2>
                <p><strong>Target URL:</strong> ${url}</p>
                
                <p><a href="/">Home</a> | <a href="/admin">Admin Panel</a></p>
                </body>
                </html>
            `);
        });
        
        request.end();
        
        request.setTimeout(5000, () => {
            request.destroy();
            res.send(formHtml + `
                <h2>Request Timeout</h2>
                <p><strong>Target URL:</strong> ${url}</p>
                <p>The request timed out after 5 seconds.</p>
                
                <p><a href="/">Home</a> | <a href="/admin">Admin Panel</a></p>
                </body>
                </html>
            `);
        });
        
    } catch (error) {
        res.status(500).send(formHtml + `
            <h2>Error</h2>
            <p>Failed to process URL: ${error.message}</p>
            <p><a href="/">Home</a> | <a href="/admin">Admin Panel</a></p>
            </body>
            </html>
        `);
    }
});

router.get('/admin', (req, res) => {  
    const hostHeader = req.get('Host');
    const xForwardedHost = req.get('X-Forwarded-Host');
    const xForwardedFor = req.get('X-Forwarded-For');
    const xOriginalHost = req.get('X-Original-Host');
    const xRealIp = req.get('X-Real-IP');
    
    const allHeaders = {
        'Host': hostHeader,
        'X-Forwarded-Host': xForwardedHost,
        'X-Forwarded-For': xForwardedFor,
        'X-Original-Host': xOriginalHost,
        'X-Real-IP': xRealIp
    };
    
    const allowedValues = ['127.0.0.1', 'localhost'];
    
    const isAllowed = allowedValues.some(value => 
        (xForwardedHost && xForwardedHost.includes(value)) ||
        (xForwardedFor && xForwardedFor.includes(value)) ||
        (xOriginalHost && xOriginalHost.includes(value)) ||
        (xRealIp && xRealIp.includes(value))
    );
    
    if (!isAllowed) {
        return res.status(403).send(`
            <html>
            <head><title>Access Denied</title></head>
            <body>
                <h1>Access Denied</h1>
                <p>Admin panel access is restricted</p>
            </body>
            </html>
        `);
    }

    res.send(`
        <html>
        <head><title>Admin Panel</title></head>
        <body>
            <h1>Admin Panel - Access Granted!</h1>
            
            <h3>User Database (Sensitive Data):</h3>
            <div>
                <pre>${JSON.stringify(users, null, 2)}</pre>
            </div>
            
            <h3>Admin Tools</h3>
            <ul>
                <li><a href="/fetch-url">URL Fetcher (SSRF Tool)</a></li>
                <li><a href="/auth/reset">Password Reset</a></li>
            </ul>
            
            <p><a href="/">Home</a> | <a href="/admin">Refresh Admin Panel</a></p>
        </body>
        </html>
    `);
});

module.exports = router;

