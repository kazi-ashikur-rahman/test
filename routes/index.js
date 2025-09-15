const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.send(`
        <html>
        <head><title>Security Demo Application</title></head>
        <body>
            <h1>Security Demo</h1>

            
            <h2>Navigation</h2>
            <ul>
                <li><a href="/login">Login</a></li>
                <li><a href="/reset-password">Password Reset</a></li>
                <li><a href="/admin">Admin Panel</a></li>
                <li><a href="/fetch-url">URL Fetcher</a></li>
            </ul>
        
            
        </body>
        </html>
    `);
});

module.exports = router;