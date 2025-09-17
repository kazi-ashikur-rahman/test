const express = require('express');
const app = express();
const PORT = process.env.PORT || 65432;

const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));   

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/', adminRouter);


const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`VULNERABLE Security Demo App running on:`);
    console.log(`  - Local:    http://127.0.0.1:${PORT}`);
    console.log(`  - Network:  http://192.168.1.213:${PORT}`);
});
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
server.on('error', (err) => { 
    if (err.code === 'EACCES') {
        console.error(`Permission denied to bind to port ${PORT}`);
        console.log('Try running as administrator or use a different port');
        console.log('You can set a different port: set PORT=8080 && npm start');
    } else if (err.code === 'EADDRINUSE') {
        console.error(` Port ${PORT} is already in use`);
        console.log('Try a different port: set PORT=8080 && npm start');
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

module.exports = app;


