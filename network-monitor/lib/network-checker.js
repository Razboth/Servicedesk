const ping = require('ping');
const dns = require('dns').promises;
const config = require('../config');

class NetworkChecker {
  constructor(logger) {
    this.logger = logger;
    this.config = config.ping;
    this.thresholds = config.thresholds;
  }

  /**
   * Ping a host and return detailed results
   * @param {string} host - IP address or hostname to ping
   * @param {Object} options - Override ping options
   * @returns {Promise<Object>} Ping results
   */
  async pingHost(host, options = {}) {
    const pingConfig = {
      timeout: options.timeout || this.config.timeout / 1000, // ping library uses seconds
      min_reply: options.count || this.config.count,
      extra: ['-i', (options.interval || this.config.interval) / 1000] // Convert to seconds
    };

    try {
      this.logger.debug(`Pinging ${host} with config:`, pingConfig);
      
      const result = await ping.promise.probe(host, pingConfig);
      
      // Calculate status based on response
      let status = 'ONLINE';
      let responseTime = null;
      let packetLoss = 0;

      if (result.alive) {
        responseTime = Math.round(parseFloat(result.time));
        packetLoss = result.packetLoss || 0;

        // Determine status based on response time and packet loss
        if (packetLoss >= this.thresholds.packetLoss.critical) {
          status = 'ERROR';
        } else if (packetLoss >= this.thresholds.packetLoss.warning) {
          status = 'SLOW';
        } else if (responseTime > this.thresholds.responseTime.slow) {
          status = 'SLOW';
        } else if (responseTime > this.thresholds.responseTime.warning) {
          status = 'SLOW';
        } else {
          status = 'ONLINE';
        }
      } else {
        status = 'OFFLINE';
        responseTime = null;
        packetLoss = 100;
      }

      return {
        host,
        alive: result.alive,
        status,
        responseTime,
        packetLoss,
        timestamp: new Date(),
        rawResult: result
      };

    } catch (error) {
      this.logger.error(`Error pinging ${host}:`, error.message);
      
      return {
        host,
        alive: false,
        status: 'ERROR',
        responseTime: null,
        packetLoss: 100,
        errorMessage: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Perform multiple ping tests and return average results
   * @param {string} host - Host to ping
   * @param {number} count - Number of ping tests
   * @returns {Promise<Object>} Aggregated ping results
   */
  async pingMultiple(host, count = 3) {
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const result = await this.pingHost(host);
      results.push(result);
      
      // Wait between pings (except for the last one)
      if (i < count - 1) {
        await this.sleep(1000);
      }
    }

    // Calculate aggregated results
    const aliveResults = results.filter(r => r.alive);
    const responseTimes = aliveResults.map(r => r.responseTime).filter(t => t !== null);
    
    let avgResponseTime = null;
    let avgPacketLoss = 100;
    let status = 'OFFLINE';

    if (aliveResults.length > 0) {
      avgResponseTime = Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length);
      avgPacketLoss = Math.round(((count - aliveResults.length) / count) * 100);
      
      // Determine overall status
      if (avgPacketLoss >= this.thresholds.packetLoss.critical) {
        status = 'ERROR';
      } else if (avgPacketLoss >= this.thresholds.packetLoss.warning || avgResponseTime > this.thresholds.responseTime.slow) {
        status = 'SLOW';
      } else {
        status = 'ONLINE';
      }
    }

    return {
      host,
      status,
      responseTime: avgResponseTime,
      packetLoss: avgPacketLoss,
      testsPerformed: count,
      successfulTests: aliveResults.length,
      timestamp: new Date(),
      individualResults: results
    };
  }

  /**
   * Test DNS resolution for a hostname
   * @param {string} hostname - Hostname to resolve
   * @returns {Promise<Object>} DNS resolution result
   */
  async testDNS(hostname) {
    try {
      const startTime = Date.now();
      const addresses = await dns.lookup(hostname, { all: true });
      const resolveTime = Date.now() - startTime;

      return {
        hostname,
        resolved: true,
        addresses: addresses.map(addr => addr.address),
        resolveTime,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        hostname,
        resolved: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Comprehensive network test including ping and DNS
   * @param {string} host - Host to test (can be IP or hostname)
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Comprehensive test results
   */
  async comprehensiveTest(host, options = {}) {
    const isIPAddress = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(host);
    
    const results = {
      host,
      isIPAddress,
      timestamp: new Date()
    };

    // Always perform ping test
    results.ping = await this.pingMultiple(host, options.pingCount || 3);
    
    // Perform DNS test only for hostnames
    if (!isIPAddress) {
      results.dns = await this.testDNS(host);
      
      // If DNS fails, update overall status
      if (!results.dns.resolved && results.ping.status === 'ONLINE') {
        results.ping.status = 'ERROR';
        results.ping.errorMessage = 'DNS resolution failed';
      }
    }

    return results;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a host status change is significant enough to trigger an incident
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - Current status
   * @returns {boolean} Whether the change is significant
   */
  isSignificantStatusChange(oldStatus, newStatus) {
    // No change
    if (oldStatus === newStatus) return false;

    // Any change from/to OFFLINE is significant
    if (oldStatus === 'OFFLINE' || newStatus === 'OFFLINE') return true;
    
    // Change from ONLINE to SLOW or ERROR is significant
    if (oldStatus === 'ONLINE' && ['SLOW', 'ERROR'].includes(newStatus)) return true;
    
    // Change from SLOW/ERROR back to ONLINE is significant (recovery)
    if (['SLOW', 'ERROR'].includes(oldStatus) && newStatus === 'ONLINE') return true;
    
    return false;
  }
}

module.exports = NetworkChecker;