const express = require('express');
const router = express.Router();
const { users, resetTokens } = require('../config/database');

router.get('/login', (req, res) => {
    res.send(`
        <html>
        <head><title>Login</title></head>
        <body>
            <h1>User Login</h1>
            <form method="POST" action="/login">
                <label>Email:</label><br>
                <input type="email" name="email" required><br><br>
                <label>Password:</label><br>
                <input type="password" name="password" required><br><br>
                <button type="submit">Login</button>
            </form>
            
            <h3>Demo Accounts:</h3>
            <ul>
                <li>Admin: admin@example.com / admin123</li>
                <li>User: user1@example.com / user123</li>
            </ul>
            
            <p><a href="/">Home</a> | <a href="/reset-password">Forgot Password?</a></p>
        </body>
        </html>
    `);
});
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
router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = Object.values(users).find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(401).send(`
            <html>
            <head><title>Login Failed</title></head>
            <body>
                <h1>Login Failed</h1>
                <p>Invalid email or password.</p>
                <p><a href="/login">Try Again</a> | <a href="/reset-password">Reset Password</a></p>
            </body>
            </html>
        `);
    }
    
    res.send(`
        <html>
        <head><title>Login Success</title></head>
        <body>
            <h1>Welcome ${user.email}!</h1>
            <p>Role: ${user.role}</p>
            <p>Login Time: ${new Date().toISOString()}</p>
        </body>
        </html>
    `);
});

router.get('/reset-password', (req, res) => {
    res.send(`
        <html>
        <head><title>Password Reset</title></head>
        <body>
            <h1>Password Reset</h1>
            <form method="POST" action="/reset-password">
                <label>Email:</label><br>
                <input type="email" name="email" required><br><br>
                <button type="submit">Send Reset Link</button>
            </form>
            <p><a href="/">Home</a></p>
        </body>
        </html>
    `);
});

router.post('/reset-password', (req, res) => {
    const { email } = req.body;

    const user = Object.values(users).find(u => u.email === email);
    if (!user) {
        return res.status(404).send(`
            <html>
            <head><title>User Not Found</title></head>
            <body>
                <h1>User Not Found</h1>
                <p>Email not found: ${email}</p>
                <p><a href="/reset-password">Try Again</a></p>
            </body>
            </html>
        `);
    }
    
    const token = Math.random().toString(36).substring(2, 15);
    resetTokens[token] = { email, expires: Date.now() + 3600000 };
    
    const hostHeader = req.get('Host') || 'localhost:3000';
    const resetUrl = `http://${hostHeader}/reset?token=${token}`;
    
    const emailContent = `
    Dear ${user.email},
    
    You have requested a password reset. Click the link below to reset your password:
    ${resetUrl}
    
    This link will expire in 1 hour.
    
    If you did not request this, please ignore this email.
    
    Best regards,
    Security Demo Team
    `;
    
    res.send(`
        <html>
        <head><title>Reset Link Sent</title></head>
        <body>
            <h1>Password Reset Email Sent</h1>
            <p>Email sent to: ${email}</p>
            
            <h3>Email Preview (Demo):</h3>
            <div style="border: 2px solid #ccc; padding: 20px; margin: 20px 0; background: #f9f9f9; font-family: Arial, sans-serif;">
                <div style="border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">
                    <strong>From:</strong> noreply@securitydemo.com<br>
                    <strong>To:</strong> ${email}<br>
                    <strong>Subject:</strong> Password Reset Request
                </div>
                
                <div style="line-height: 1.6;">
                    <p>Dear ${user.email},</p>
                    
                    <p>You have requested a password reset for your account. Click the link below to reset your password:</p>
                    
                    <p style="background: #e3f2fd; padding: 10px; border-left: 4px solid #2196f3;">
                        <a href="${resetUrl}" style="color: #1976d2; text-decoration: none; font-weight: bold;">${resetUrl}</a>
                    </p>
                    
                    <p><strong>This link will expire in 1 hour.</strong></p>
                    
                    <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
                    
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
                    
                    <p style="color: #666; font-size: 12px;">
                        Best regards,<br>
                        Security Demo Team<br>
                        This is an automated message - please do not reply.
                    </p>
                </div>
            </div>
            
            <p><a href="/">Home</a> | <a href="/reset-password">Reset Another</a></p>
        </body>
        </html>
    `);
});

router.get('/reset', (req, res) => {
    const { token } = req.query;
    
    if (!token || !resetTokens[token]) {
        return res.status(400).send(`
            <html>
            <head><title>Invalid Token</title></head>
            <body>
                <h1>Invalid Reset Token</h1>
                <p>The reset token is invalid or has been used.</p>
                <p><a href="/reset-password">Request New Reset</a> | <a href="/">Home</a></p>
            </body>
            </html>
        `);
    }
    
    if (resetTokens[token].expires < Date.now()) {
        delete resetTokens[token];
        return res.status(400).send(`
            <html>
            <head><title>Token Expired</title></head>
            <body>
                <h1>Token Expired</h1>
                <p>The reset token has expired. Please request a new one.</p>
                <p><a href="/reset-password">Request New Reset</a> | <a href="/">Home</a></p>
            </body>
            </html>
        `);
    }
    
    const tokenData = resetTokens[token];
    res.send(`
        <html>
        <head><title>Reset Password</title></head>
        <body>
            <h1>Reset Password</h1>
            <p>Account: ${tokenData.email}</p>
            
            <form method="POST" action="/reset">
                <input type="hidden" name="token" value="${token}">
                <label>New Password:</label><br>
                <input type="password" name="newPassword" required minlength="6"><br><br>
                <label>Confirm Password:</label><br>
                <input type="password" name="confirmPassword" required minlength="6"><br><br>
                <button type="submit">Reset Password</button>
            </form>
            <p><a href="/">Home</a></p>
        </body>
        </html>
    `);
});

router.post('/reset', (req, res) => {
    const { token, newPassword, confirmPassword } = req.body;
    
    if (!token || !resetTokens[token]) {
        return res.status(400).send(`
            <html>
            <head><title>Invalid Token</title></head>
            <body>
                <h1>❌ Invalid Reset Token</h1>
                <p><a href="/reset-password">🔄 Request New Reset</a></p>
            </body>
            </html>
        `);
    }
    
    if (resetTokens[token].expires < Date.now()) {
        delete resetTokens[token];
        return res.status(400).send(`
            <html>
            <head><title>Token Expired</title></head>
            <body>
                <h1>⏰ Token Expired</h1>
                <p><a href="/reset-password">🔄 Request New Reset</a></p>
            </body>
            </html>
        `);
    }
    
    if (newPassword !== confirmPassword) {
        return res.status(400).send(`
            <html>
            <head><title>Password Mismatch</title></head>
            <body>
                <h1>❌ Password Mismatch</h1>
                <p>Passwords do not match. Please try again.</p>
                <p><a href="/reset?token=${token}">🔙 Go Back</a></p>
            </body>
            </html>
        `);
    }
    
    if (newPassword.length < 6) {
        return res.status(400).send(`
            <html>
            <head><title>Password Too Short</title></head>
            <body>
                <h1>❌ Password Too Short</h1>
                <p>Password must be at least 6 characters long.</p>
                <p><a href="/reset?token=${token}">🔙 Go Back</a></p>
            </body>
            </html>
        `);
    }
    
    const tokenData = resetTokens[token];
    const user = Object.values(users).find(u => u.email === tokenData.email);
    
    if (user) {
        const oldPassword = user.password;
        user.password = newPassword;
        
        delete resetTokens[token];
        
        res.send(`
            <html>
            <head><title>Password Reset Success</title></head>
            <body>
                <h1>Password Reset Successful</h1>
                <p>Account: ${user.email}</p>
                <div>
                    <h3>Demo Password Change:</h3>
                    <p>Old Password: ${oldPassword}</p>
                    <p>New Password: ${newPassword}</p>
                    <p>Password successfully updated in demo database!</p>
                </div>
                <p><a href="/">Home</a> | <a href="/reset-password">Reset Another Password</a></p>
            </body>
            </html>
        `);
    } else {
        res.status(500).send(`
            <html>
            <head><title>Error</title></head>
            <body>
                <h1>❌ Error</h1>
                <p>User not found.</p>
                <p><a href="/">🏠 Home</a></p>
            </body>
            </html>
        `);
    }
});

module.exports = router;
