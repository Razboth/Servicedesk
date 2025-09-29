// Health check script for Bank SulutGo ServiceDesk
const http = require('http');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Configuration
const PORT = process.env.PORT || 4000;
const HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds

// Health check function
async function checkHealth() {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
            server: false,
            database: false,
            prisma: false,
            memory: false,
            environment: false
        },
        details: {}
    };

    try {
        // Check 1: Server is responding
        await new Promise((resolve, reject) => {
            const req = http.get(`http://localhost:${PORT}/api/health`, (res) => {
                health.checks.server = res.statusCode === 200;
                health.details.server = {
                    statusCode: res.statusCode,
                    headers: res.headers
                };
                resolve();
            });

            req.on('error', (err) => {
                health.details.server = { error: err.message };
                reject(err);
            });

            req.setTimeout(HEALTH_CHECK_TIMEOUT, () => {
                health.details.server = { error: 'Request timeout' };
                req.destroy();
                reject(new Error('Health check timeout'));
            });
        }).catch(() => {
            health.checks.server = false;
        });

        // Check 2: Database connection
        try {
            await prisma.$queryRaw`SELECT 1`;
            health.checks.database = true;
            health.details.database = { connected: true };
        } catch (error) {
            health.checks.database = false;
            health.details.database = {
                connected: false,
                error: error.message
            };
        }

        // Check 3: Prisma client
        try {
            const count = await prisma.user.count();
            health.checks.prisma = true;
            health.details.prisma = {
                operational: true,
                userCount: count
            };
        } catch (error) {
            health.checks.prisma = false;
            health.details.prisma = {
                operational: false,
                error: error.message
            };
        }

        // Check 4: Memory usage
        const memUsage = process.memoryUsage();
        const maxHeap = 1024 * 1024 * 1024; // 1GB threshold
        health.checks.memory = memUsage.heapUsed < maxHeap;
        health.details.memory = {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
            threshold: '1024MB'
        };

        // Check 5: Required environment variables
        const requiredEnvVars = [
            'DATABASE_URL',
            'NEXTAUTH_SECRET',
            'NEXTAUTH_URL'
        ];

        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        health.checks.environment = missingEnvVars.length === 0;
        health.details.environment = {
            required: requiredEnvVars,
            missing: missingEnvVars
        };

        // Determine overall health status
        const allChecks = Object.values(health.checks);
        const failedChecks = allChecks.filter(check => !check).length;

        if (failedChecks === 0) {
            health.status = 'healthy';
        } else if (failedChecks <= 1) {
            health.status = 'degraded';
        } else {
            health.status = 'unhealthy';
        }

    } catch (error) {
        health.status = 'unhealthy';
        health.error = error.message;
    } finally {
        await prisma.$disconnect();
    }

    return health;
}

// Run health check
checkHealth()
    .then(health => {
        if (process.argv.includes('--json')) {
            console.log(JSON.stringify(health, null, 2));
        } else {
            console.log(`Health Status: ${health.status.toUpperCase()}`);
            console.log(`Timestamp: ${health.timestamp}`);
            console.log(`Uptime: ${Math.floor(health.uptime)} seconds`);
            console.log('\nHealth Checks:');
            Object.entries(health.checks).forEach(([check, status]) => {
                const emoji = status ? '✅' : '❌';
                console.log(`  ${emoji} ${check}: ${status ? 'PASS' : 'FAIL'}`);
            });
        }

        // Exit with appropriate code
        if (health.status === 'healthy') {
            process.exit(0);
        } else if (health.status === 'degraded') {
            process.exit(1);
        } else {
            process.exit(2);
        }
    })
    .catch(error => {
        console.error('Health check failed:', error.message);
        process.exit(2);
    });