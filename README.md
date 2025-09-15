# Security Vulnerability Demonstration Platform

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![License](https://img.shields.io/badge/License-Educational-orange.svg)](#)
[![Security](https://img.shields.io/badge/Security-Deliberately_Vulnerable-red.svg)](#)

> **SECURITY WARNING**: This application contains **intentional security vulnerabilities** for educational and testing purposes only. **NEVER** deploy this application in a production environment.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Vulnerability Demonstrations](#vulnerability-demonstrations)
- [Installation & Setup](#installation--setup)
- [Usage Guide](#usage-guide)
- [Testing Scenarios](#testing-scenarios)
- [Security Analysis](#security-analysis)
- [Educational Objectives](#educational-objectives)
- [Disclaimer](#disclaimer)

## Overview

This is a deliberately vulnerable web application built with Node.js and Express, designed to demonstrate common web application security vulnerabilities in a controlled environment. The platform provides hands-on experience with vulnerability identification, exploitation, and understanding of security weaknesses commonly found in web applications.

### Target Audience

- Security Quality Assurance (SQA) teams
- Penetration testers
- Security researchers
- Web application security trainees
- Educational institutions

### Key Features

- **Multiple vulnerability types** with realistic implementations
- **Interactive web interface** for easy demonstration
- **Comprehensive logging** of attack attempts
- **Professional error handling** and response formatting
- **Modular architecture** for easy extension

## Architecture

### Application Structure

```
security-demo/
├── app.js                 # Main application server
├── internal-admin.js      # Simulated internal service
├── routes/
│   ├── index.js          # Home page and navigation
│   ├── auth.js           # Authentication vulnerabilities
│   └── admin.js          # Admin panel and SSRF vulnerabilities
├── config/
│   └── database.js       # Mock user database
└── package.json          # Dependencies and scripts
```

### Network Architecture

- **Main Application**: `0.0.0.0:65432` (externally accessible)
- **Internal Service**: `127.0.0.1:5001` (localhost-only binding)
- **Multi-service design** simulating real-world microservice environments

## Vulnerability Demonstrations

### 1. Host Header Injection (Password Reset)

**Endpoint**: `/auth/reset`  
**Vulnerability Type**: Host Header Injection leading to Account Takeover  
**CVSS Score**: High (7.5+)

#### Description

The password reset functionality blindly trusts the `Host` header when generating password reset links, allowing attackers to redirect victims to malicious domains.

#### Technical Details

- **Location**: `routes/auth.js`
- **Root Cause**: Unsanitized use of `req.get('Host')` in email generation
- **Impact**: Account takeover, credential theft, phishing attacks

#### Attack Vector

```bash
curl -X POST -H "Host: attacker.com" \
     -d "email=victim@company.com" \
     http://target.com/auth/reset
```

### 2. Server-Side Request Forgery (SSRF)

**Endpoint**: `/fetch-url`  
**Vulnerability Type**: SSRF with Header Injection  
**CVSS Score**: High (8.0+)

#### Description

The URL fetcher allows attackers to make requests to internal services by manipulating forwarded headers, bypassing network-level security controls.

#### Technical Details

- **Location**: `routes/admin.js`
- **Root Cause**: Unvalidated forwarding of client-supplied headers
- **Impact**: Internal network scanning, access to internal services, data exfiltration

#### Attack Vectors

```bash
# Basic SSRF
curl "http://target.com/fetch-url?url=http://internal-service/"

# SSRF with Header Injection
curl -H "X-Forwarded-For: 127.0.0.1" \
     -H "X-Forwarded-Host: localhost" \
     "http://target.com/fetch-url?url=http://127.0.0.1:5001/internal-admin"
```

### 3. Admin Panel Access Control Bypass

**Endpoint**: `/admin`  
**Vulnerability Type**: Authentication Bypass via Header Manipulation  
**CVSS Score**: Medium (6.5+)

#### Description

The admin panel implements flawed access control based on forwarded headers, allowing attackers to bypass authentication by manipulating HTTP headers.

#### Technical Details

- **Location**: `routes/admin.js`
- **Root Cause**: Trust in client-controllable headers for authorization
- **Impact**: Administrative access, sensitive data exposure

#### Attack Vector

```bash
curl -H "X-Forwarded-For: 127.0.0.1" \
     http://target.com/admin
```

## Installation & Setup

### Prerequisites

- Node.js 16.0 or higher
- npm (Node Package Manager)
- Network access for external vulnerability testing

### Installation Steps

1. **Clone or Download the Repository**

   ```bash
   cd /path/to/security-demo
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start the Main Application**

   ```bash
   npm start
   # Application will be available at http://0.0.0.0:65432
   ```

4. **Start the Internal Service** (in a separate terminal)
   ```bash
   node internal-admin.js
   # Internal service will be available at http://127.0.0.1:5001
   ```

### Network Configuration

- **External Access**: The main application binds to `0.0.0.0:65432` for network accessibility
- **Internal Service**: Binds only to `127.0.0.1:5001` to simulate internal network restrictions
- **Firewall**: Ensure port 65432 is accessible for remote testing

## Usage Guide

### Web Interface Navigation

1. **Home Page** (`/`)

   - Overview of available vulnerability demonstrations
   - Navigation to all testing endpoints

2. **Password Reset** (`/auth/reset`)

   - Demonstrates Host Header Injection
   - Interactive email preview functionality

3. **Admin Panel** (`/admin`)

   - Requires header manipulation for access
   - Displays sensitive user database when accessed

4. **URL Fetcher** (`/fetch-url`)
   - SSRF vulnerability testing interface
   - Real-time request/response analysis

### Command Line Testing

#### Host Header Injection Test

```bash
# Test password reset vulnerability
curl -X POST \
     -H "Host: evil.attacker.com" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "email=user1@example.com" \
     http://localhost:65432/auth/reset
```

#### SSRF Testing

```bash
# Test internal service access
curl -H "X-Forwarded-For: 127.0.0.1" \
     "http://localhost:65432/fetch-url?url=http://127.0.0.1:5001/internal-admin"
```

#### Admin Access Bypass

```bash
# Bypass admin authentication
curl -H "X-Real-IP: 127.0.0.1" \
     http://localhost:65432/admin
```

## Testing Scenarios

### Scenario 1: Account Takeover via Host Header Injection

**Objective**: Demonstrate how attackers can hijack password reset functionality

**Steps**:

1. Navigate to `/auth/reset`
2. Use Burp Suite or curl to modify the Host header
3. Observe the malicious reset link in the email preview
4. Document the potential for account takeover

**Expected Outcome**: Password reset links point to attacker-controlled domains

### Scenario 2: Internal Network Discovery via SSRF

**Objective**: Show how SSRF can be used to scan internal networks

**Steps**:

1. Access the URL Fetcher at `/fetch-url`
2. Attempt to access `http://127.0.0.1:5001/` (should fail)
3. Add `X-Forwarded-For: 127.0.0.1` header
4. Successfully access internal admin panel
5. Extract sensitive information from the response

**Expected Outcome**: Access to internal service with sensitive data exposure

### Scenario 3: Privilege Escalation via Header Manipulation

**Objective**: Demonstrate authentication bypass in admin panels

**Steps**:

1. Attempt direct access to `/admin` (should be denied)
2. Add forwarded headers indicating internal origin
3. Gain administrative access
4. View sensitive user database

**Expected Outcome**: Administrative access with full user data visibility

## Security Analysis

### Vulnerability Assessment

| Vulnerability              | Severity | CVSS | Attack Complexity | Impact                  |
| -------------------------- | -------- | ---- | ----------------- | ----------------------- |
| Host Header Injection      | High     | 7.5  | Low               | Account Takeover        |
| SSRF with Header Injection | High     | 8.0  | Medium            | Internal Network Access |
| Admin Access Bypass        | Medium   | 6.5  | Low               | Privilege Escalation    |

### Common Attack Patterns

1. **Header Manipulation**: All vulnerabilities involve manipulation of HTTP headers
2. **Trust Boundary Violation**: Trusting client-supplied data for security decisions
3. **Network Segmentation Bypass**: Using application-layer attacks to bypass network controls

### Defense Mechanisms (Intentionally Absent)

- Input validation and sanitization
- Header whitelisting and validation
- Network-based access controls
- Authentication and session management
- Content Security Policy (CSP)

## Educational Objectives

### Learning Outcomes

By working with this application, users will understand:

1. **HTTP Header Security**: How headers can be manipulated for malicious purposes
2. **Server-Side Request Forgery**: Techniques for exploiting SSRF vulnerabilities
3. **Authentication Bypass**: Methods for circumventing access controls
4. **Network Security**: The relationship between application and network security

### Best Practices Demonstrated (by their absence)

- Proper input validation and sanitization
- Secure header handling and validation
- Network segmentation and access controls
- Principle of least privilege
- Defense in depth strategies

## Logging and Monitoring

### Request Logging

The application provides detailed logging of:

- All HTTP requests with headers
- Vulnerability exploitation attempts
- Internal service access patterns
- Error conditions and responses

### Security Metrics

- Failed authentication attempts
- Suspicious header patterns
- Internal service access frequency
- Geographic distribution of attacks (when deployed externally)

## Customization and Extension

### Adding New Vulnerabilities

The modular architecture allows for easy extension:

1. Create new route files in `/routes/`
2. Implement vulnerability-specific logic
3. Add navigation links to the home page
4. Update this documentation

### Configuration Options

- Port configuration via environment variables
- Database modification in `/config/database.js`
- Service endpoints and responses in individual route files

## Disclaimer

### Important Security Notice

**This application is intentionally vulnerable and should NEVER be deployed in a production environment.**

### Intended Use

- **Educational purposes** only
- **Controlled testing environments**
- **Security training and awareness**
- **Vulnerability research**

### Liability

- Users are responsible for compliance with applicable laws and regulations
- This application should only be used on systems you own or have explicit permission to test
- The authors are not liable for any misuse of this application

### Ethical Guidelines

- Use only in authorized environments
- Respect responsible disclosure practices
- Do not use for malicious purposes
- Follow your organization's security policies

## 📞 Support and Contributing

### Getting Help

- Review this documentation thoroughly
- Check the source code comments for technical details
- Test in a controlled environment first

### Contributing

- Report issues or suggestions through appropriate channels
- Contribute additional vulnerability demonstrations
- Improve documentation and testing scenarios

---

**Remember**: The best way to learn about security is to understand how things can go wrong. This application provides a safe environment to explore these concepts responsibly.
