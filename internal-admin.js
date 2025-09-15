const express = require('express'); 
const app = express();
const PORT = process.env.INTERNAL_PORT || 5001;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/internal-admin', (req, res) => {
    const clientIP = req.connection.remoteAddress || req.socket.remoteAddress || 
                    (req.connection.socket ? req.connection.socket.remoteAddress : null);
    const xForwardedFor = req.get('X-Forwarded-For');
    const xRealIP = req.get('X-Real-IP');
    const xForwardedHost = req.get('X-Forwarded-Host');
    const xOriginalHost = req.get('X-Original-Host');
    const host = req.get('Host');
    const userAgent = req.get('User-Agent');
    const authorization = req.get('Authorization');
    

    const validationChecks = {
        ipCheck: false,
        forwardedHeaderCheck: false
    };
    
    if (clientIP === '127.0.0.1' || clientIP === '::1' || 
        (xForwardedFor && (xForwardedFor.includes('127.0.0.1') || xForwardedFor.includes('localhost'))) ||
        (xRealIP && (xRealIP.includes('127.0.0.1') || xRealIP.includes('localhost')))) {
        validationChecks.ipCheck = true;
    }

    if (xForwardedFor || xRealIP || xForwardedHost || xOriginalHost) {
        validationChecks.forwardedHeaderCheck = true;
    }
    
    if (validationChecks.ipCheck && validationChecks.forwardedHeaderCheck) {
        res.json({
            status: 'SUCCESS',
            message: 'Internal Admin Panel Access Granted',
            access_level: 'ADMINISTRATOR',
            validation_status: {
                ip_check: validationChecks.ipCheck ? 'PASS' : 'FAIL',
                forwarded_header_check: validationChecks.forwardedHeaderCheck ? 'PASS' : 'FAIL'
            },
            server_info: {
                hostname: 'internal-server-01',
                environment: 'production',
                last_backup: '2025-09-05T10:30:00Z',
                database_status: 'online',
                active_sessions: 47,
                internal_url: 'https://admin.internal.company.local'
            },
            sensitive_data: {
                admin_password: 'SuperSecret123!',
                api_keys: {
                    aws: 'AKIA1234567890ABCDEF',
                    stripe: 'sk_live_1234567890abcdef',
                    database: 'mongodb://admin:secret@internal-db:27017',
                    internal_api: 'int_api_key_9876543210'
                },
                user_count: 15000,
                revenue_today: '$45,230.50',
                private_endpoints: [
                    'https://admin.internal.company.local/users',
                    'https://admin.internal.company.local/financials',
                    'https://admin.internal.company.local/system-config'
                ]
            },
            system_commands: [
                'GET /api/users - List all users',
                'POST /api/backup - Create system backup', 
                'DELETE /api/logs - Clear system logs',
                'GET /api/financial - Financial reports',
                'POST /api/deploy - Deploy new version'
            ],
            client_info: {
                ip: clientIP,
                headers: {
                    'X-Forwarded-For': xForwardedFor,
                    'X-Real-IP': xRealIP,
                    'X-Forwarded-Host': xForwardedHost,
                    'X-Original-Host': xOriginalHost,
                }
            },
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(403).json({
            error: 'ACCESS_DENIED',
            message: 'DIRECT_ACCESS_BLOCKED - Internal service requires proxy headers',
            client_ip: clientIP,
            blocked_at: new Date().toISOString()
        });
    }
});

app.get('/', (req, res) => {
    const clientIP = req.connection.remoteAddress || req.socket.remoteAddress;
    
    if (clientIP === '127.0.0.1' || clientIP === '::1') {
        res.json({
            service: 'Internal Administration Service',
            version: '2.1.0',
            status: 'running',
            port: PORT,
            description: 'This is an internal microservice for system administration',
            endpoints: {
                '/internal-admin': 'Internal Admin panel',
                '/': 'Service information',
                '/health': 'Health check'
            },
            security_note: 'Admin panel requires proxy headers for access',
            client_ip: clientIP,
            access_policy: 'Basic info: localhost only | Admin panel: localhost + proxy headers',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(403).json({
            error: 'ACCESS_DENIED',
            message: 'Service only accessible from localhost',
            client_ip: clientIP,
            blocked_at: new Date().toISOString()
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, '127.0.0.1', () => {
    console.log(`🔒 Internal Admin Service running on http://127.0.0.1:${PORT}`);
    console.log('🚨 SECURITY: This service is bound to localhost only');
    console.log('📡 Endpoints:');
    console.log(`   - http://127.0.0.1:${PORT}/internal-admin (Admin Panel)`);
    console.log(`   - http://127.0.0.1:${PORT}/health (Health Check)`);
    console.log('⚠️  This simulates an internal service that should NOT be accessible from external networks');
});

name: Semgrep PR Scan with Comment

on:
  pull_request:
    branches:
      - main
      - stg
      - dev

jobs:
  semgrep:
    runs-on: ubuntu-latest
    environment: SEMGREP  # environment with SEMGREP_APP_TOKEN
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0   # needed for diff against base branch

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.x'

      - name: Install Semgrep
        run: python -m pip install --upgrade pip semgrep

      - name: Run Semgrep on PR diff
        env:
          SEMGREP_APP_TOKEN: ${{ secrets.SEMGREP_APP_TOKEN }}
        run: |
          BASE_BRANCH=${{ github.event.pull_request.base.ref }}
          echo "Diffing against $BASE_BRANCH"
          git fetch origin $BASE_BRANCH
          semgrep --config p/default --json --output semgrep-report.json --diff origin/$BASE_BRANCH

      - name: Build concise PR comment
        run: |
          python - <<'PY'
          import json
          report = json.load(open("semgrep-report.json"))
          results = report.get("results", [])
          if not results:
              md = "✅ **Semgrep:** No new issues detected in this PR."
          else:
              counts = {}
              lines = []
              for r in results:
                  severity = r.get("extra", {}).get("severity") or r.get("severity") or "INFO"
                  counts[severity] = counts.get(severity, 0) + 1
                  rule = r.get("check_id") or r.get("rule_id") or "unknown"
                  path = r.get("path") or (r.get("start") or {}).get("path") or "unknown"
                  line = (r.get("start") or {}).get("line") or ""
                  lines.append(f"- **{severity.upper()}** `{rule}` in `{path}:{line}`")

              header = f"🚨 **Semgrep** found {len(results)} new issue(s) in this PR\n\n"
              header += "Severity counts: " + ", ".join([f"{k}: {v}" for k,v in counts.items()]) + "\n\n"
              md = header + "\n".join(lines)

          with open("semgrep_report.md", "w") as f:
              f.write(md)
          print(md)
          PY

      - name: Post or update PR comment
        uses: peter-evans/create-or-update-comment@v4
        with:
          issue-number: ${{ github.event.pull_request.number }}
          body-path: semgrep_report.md



module.exports = app;


