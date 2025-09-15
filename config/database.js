// Mock database for demo purposes
const users = {
    1: {
        id: 1,
        email: 'admin@example.com',
        password: 'admin123',
        role: 'admin'
    },
    2: {
        id: 2,
        email: 'user1@example.com',
        password: 'user123',
        role: 'user'
    }
};

// Storage for password reset tokens
const resetTokens = {};

module.exports = { users, resetTokens };
