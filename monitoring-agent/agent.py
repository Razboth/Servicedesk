#!/usr/bin/env python3
"""
Network Monitoring Agent for Bank SulutGo ServiceDesk
Pings branches and ATMs and sends results to Helpdesk API
"""

import json
import time
import logging
import os
import sys
import subprocess
import platform
import re
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import List, Dict, Any, Optional
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('monitoring-agent.log')
    ]
)
logger = logging.getLogger(__name__)


class Config:
    """Configuration management"""
    def __init__(self, config_path: str = 'config.json'):
        self.config_path = config_path
        self.data = self._load_config()

    def _load_config(self) -> Dict:
        if not os.path.exists(self.config_path):
            logger.error(f"Config file not found: {self.config_path}")
            logger.info("Creating default config.json - please edit with your API key")
            self._create_default_config()
            sys.exit(1)

        with open(self.config_path, 'r') as f:
            return json.load(f)

    def _create_default_config(self):
        default = {
            "helpdesk_url": "https://helpdesk.banksulutgo.co.id",
            "api_key": "YOUR_API_KEY_HERE",
            "agent_id": "main-branch-monitor",
            "ping_interval_seconds": 60,
            "ping_timeout_ms": 3000,
            "ping_count": 3,
            "max_concurrent_pings": 20,
            "entity_refresh_interval_seconds": 3600,
            "retry_on_failure": True,
            "retry_delay_seconds": 30,
            "verify_ssl": True
        }
        with open(self.config_path, 'w') as f:
            json.dump(default, f, indent=2)

    @property
    def helpdesk_url(self) -> str:
        return self.data.get('helpdesk_url', '').rstrip('/')

    @property
    def api_key(self) -> str:
        return self.data.get('api_key', '')

    @property
    def agent_id(self) -> str:
        return self.data.get('agent_id', 'monitoring-agent')

    @property
    def ping_interval(self) -> int:
        return self.data.get('ping_interval_seconds', 60)

    @property
    def ping_timeout(self) -> int:
        return self.data.get('ping_timeout_ms', 3000)

    @property
    def ping_count(self) -> int:
        return self.data.get('ping_count', 3)

    @property
    def max_concurrent(self) -> int:
        return self.data.get('max_concurrent_pings', 20)

    @property
    def entity_refresh_interval(self) -> int:
        return self.data.get('entity_refresh_interval_seconds', 3600)

    @property
    def retry_on_failure(self) -> bool:
        return self.data.get('retry_on_failure', True)

    @property
    def retry_delay(self) -> int:
        return self.data.get('retry_delay_seconds', 30)

    @property
    def verify_ssl(self) -> bool:
        return self.data.get('verify_ssl', True)


class PingResult:
    """Ping result data class"""
    def __init__(self, ip_address: str):
        self.ip_address = ip_address
        self.success = False
        self.status = 'ERROR'
        self.response_time_ms: Optional[float] = None
        self.packet_loss: float = 100.0
        self.min_rtt: Optional[float] = None
        self.max_rtt: Optional[float] = None
        self.avg_rtt: Optional[float] = None
        self.error_message: Optional[str] = None


def ping_host(ip_address: str, count: int = 3, timeout_ms: int = 3000) -> PingResult:
    """
    Ping a host and return detailed results
    Works on Windows, Linux, and macOS
    """
    result = PingResult(ip_address)
    system = platform.system().lower()

    try:
        timeout_sec = timeout_ms / 1000

        if system == 'windows':
            cmd = ['ping', '-n', str(count), '-w', str(timeout_ms), ip_address]
        else:  # Linux/macOS
            cmd = ['ping', '-c', str(count), '-W', str(int(timeout_sec)), ip_address]

        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout_sec * count + 5
        )

        output = process.stdout + process.stderr

        # Parse packet loss
        if system == 'windows':
            loss_match = re.search(r'\((\d+)% loss\)', output)
        else:
            loss_match = re.search(r'(\d+(?:\.\d+)?)\s*%\s*packet\s*loss', output, re.IGNORECASE)

        if loss_match:
            result.packet_loss = float(loss_match.group(1))

        # Parse RTT statistics
        if system == 'windows':
            rtt_match = re.search(r'Minimum = (\d+)ms.*Maximum = (\d+)ms.*Average = (\d+)ms', output)
            if rtt_match:
                result.min_rtt = float(rtt_match.group(1))
                result.max_rtt = float(rtt_match.group(2))
                result.avg_rtt = float(rtt_match.group(3))
                result.response_time_ms = result.avg_rtt
        else:
            rtt_match = re.search(r'([\d.]+)/([\d.]+)/([\d.]+)', output)
            if rtt_match:
                result.min_rtt = float(rtt_match.group(1))
                result.avg_rtt = float(rtt_match.group(2))
                result.max_rtt = float(rtt_match.group(3))
                result.response_time_ms = result.avg_rtt

        # Determine status
        if result.packet_loss == 0 and result.response_time_ms:
            result.success = True
            if result.response_time_ms > 1000:
                result.status = 'SLOW'
            else:
                result.status = 'ONLINE'
        elif result.packet_loss < 100:
            result.success = True
            result.status = 'SLOW'
        else:
            result.success = False
            result.status = 'OFFLINE'

    except subprocess.TimeoutExpired:
        result.status = 'TIMEOUT'
        result.error_message = 'Ping timed out'
    except Exception as e:
        result.status = 'ERROR'
        result.error_message = str(e)

    return result


class MonitoringAgent:
    """Main monitoring agent class"""

    def __init__(self, config: Config):
        self.config = config
        self.entities: List[Dict] = []
        self.last_entity_refresh = 0
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {config.api_key}',
            'Content-Type': 'application/json',
            'User-Agent': f'MonitoringAgent/{config.agent_id}'
        })
        self.session.verify = config.verify_ssl

    def fetch_entities(self) -> bool:
        """Fetch list of entities to monitor from Helpdesk API"""
        try:
            url = f"{self.config.helpdesk_url}/api/monitoring/agent/entities"
            logger.info(f"Fetching entities from: {url}")
            response = self.session.get(url, timeout=30)

            if response.status_code == 200:
                data = response.json()
                self.entities = data.get('entities', [])
                self.last_entity_refresh = time.time()
                logger.info(f"Fetched {len(self.entities)} entities to monitor")

                # Log entity details
                branches = [e for e in self.entities if e.get('type') == 'BRANCH']
                atms = [e for e in self.entities if e.get('type') == 'ATM']
                logger.info(f"  - Branches: {len(branches)}")
                logger.info(f"  - ATMs: {len(atms)}")

                # Show all entities with their IPs
                for entity in self.entities:
                    logger.info(f"  [{entity.get('type')}] {entity.get('name', 'Unknown')} - IP: {entity.get('ip_address', 'N/A')}")

                return True
            else:
                logger.error(f"Failed to fetch entities: {response.status_code} - {response.text}")
                return False

        except requests.RequestException as e:
            logger.error(f"Error fetching entities: {e}")
            return False

    def ping_entity(self, entity: Dict) -> Dict:
        """Ping a single entity and return result"""
        ip_address = entity.get('ip_address')
        if not ip_address:
            return None

        result = ping_host(
            ip_address,
            count=self.config.ping_count,
            timeout_ms=self.config.ping_timeout
        )

        return {
            'entity_type': entity.get('type'),
            'entity_id': entity.get('id'),
            'ip_address': ip_address,
            'status': result.status,
            'response_time_ms': result.response_time_ms,
            'packet_loss': result.packet_loss,
            'min_rtt': result.min_rtt,
            'max_rtt': result.max_rtt,
            'avg_rtt': result.avg_rtt,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

    def ping_all_entities(self) -> List[Dict]:
        """Ping all entities concurrently"""
        results = []

        with ThreadPoolExecutor(max_workers=self.config.max_concurrent) as executor:
            future_to_entity = {
                executor.submit(self.ping_entity, entity): entity
                for entity in self.entities
            }

            for future in as_completed(future_to_entity):
                entity = future_to_entity[future]
                try:
                    result = future.result()
                    if result:
                        results.append(result)
                        status_icon = '✓' if result['status'] in ['ONLINE', 'SLOW'] else '✗'
                        rtt = result.get('response_time_ms')
                        rtt_str = f"{rtt:.1f}ms" if rtt else "N/A"
                        loss = result.get('packet_loss', 100)
                        logger.info(f"  {status_icon} [{result['entity_type']}] {entity.get('name', entity.get('id'))} ({result['ip_address']}): {result['status']} - RTT: {rtt_str}, Loss: {loss}%")
                except Exception as e:
                    logger.error(f"Error pinging {entity.get('name', entity.get('id'))}: {e}")

        return results

    def send_results(self, results: List[Dict]) -> bool:
        """Send ping results to Helpdesk API"""
        if not results:
            logger.warning("No results to send")
            return True

        try:
            url = f"{self.config.helpdesk_url}/api/monitoring/agent/results"
            payload = {
                'agent_id': self.config.agent_id,
                'results': results
            }

            logger.info(f"Sending {len(results)} results to: {url}")
            logger.info(f"Payload preview (first 3 results):")
            for r in results[:3]:
                logger.info(f"  - {r['entity_type']} {r['entity_id']}: {r['status']} ({r.get('response_time_ms', 'N/A')}ms)")
            if len(results) > 3:
                logger.info(f"  ... and {len(results) - 3} more")

            response = self.session.post(url, json=payload, timeout=60)

            logger.info(f"API Response: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                processed = data.get('processed', 0)
                errors = data.get('errors', 0)
                logger.info(f"Results accepted: {processed} processed, {errors} errors")
                if data.get('error_details'):
                    for err in data['error_details'][:5]:
                        logger.warning(f"  Error: {err}")
                return True
            else:
                logger.error(f"Failed to send results: {response.status_code}")
                logger.error(f"Response body: {response.text[:500]}")
                return False

        except requests.RequestException as e:
            logger.error(f"Error sending results: {e}")
            return False

    def run_once(self):
        """Run a single monitoring cycle"""
        # Refresh entities if needed
        if time.time() - self.last_entity_refresh > self.config.entity_refresh_interval:
            self.fetch_entities()

        if not self.entities:
            logger.warning("No entities to monitor")
            return

        # Ping all entities
        logger.info(f"Starting ping cycle for {len(self.entities)} entities...")
        start_time = time.time()
        results = self.ping_all_entities()
        ping_duration = time.time() - start_time

        # Count statuses
        online = sum(1 for r in results if r['status'] == 'ONLINE')
        slow = sum(1 for r in results if r['status'] == 'SLOW')
        offline = sum(1 for r in results if r['status'] in ['OFFLINE', 'TIMEOUT', 'ERROR'])

        logger.info(f"Ping cycle complete in {ping_duration:.1f}s: {online} online, {slow} slow, {offline} offline")

        # Send results to Helpdesk
        success = self.send_results(results)

        if not success and self.config.retry_on_failure:
            logger.info(f"Retrying in {self.config.retry_delay} seconds...")
            time.sleep(self.config.retry_delay)
            self.send_results(results)

    def run(self):
        """Main run loop"""
        logger.info(f"Starting monitoring agent: {self.config.agent_id}")
        logger.info(f"Helpdesk URL: {self.config.helpdesk_url}")
        logger.info(f"Ping interval: {self.config.ping_interval} seconds")

        # Initial entity fetch
        if not self.fetch_entities():
            logger.error("Failed to fetch initial entity list. Check API key and URL.")
            if self.config.retry_on_failure:
                logger.info("Retrying in 30 seconds...")
                time.sleep(30)
                if not self.fetch_entities():
                    logger.error("Failed again. Exiting.")
                    sys.exit(1)
            else:
                sys.exit(1)

        # Main loop
        while True:
            try:
                self.run_once()
                logger.info(f"Sleeping for {self.config.ping_interval} seconds...")
                time.sleep(self.config.ping_interval)
            except KeyboardInterrupt:
                logger.info("Stopping monitoring agent...")
                break
            except Exception as e:
                logger.error(f"Unexpected error: {e}")
                time.sleep(10)


def main():
    """Main entry point"""
    print("=" * 60)
    print("Bank SulutGo Network Monitoring Agent")
    print("=" * 60)

    # Load configuration
    config_path = 'config.json'
    if len(sys.argv) > 1:
        config_path = sys.argv[1]

    config = Config(config_path)

    # Validate API key
    if config.api_key == 'YOUR_API_KEY_HERE' or not config.api_key:
        logger.error("Please set your API key in config.json")
        sys.exit(1)

    # Create and run agent
    agent = MonitoringAgent(config)
    agent.run()


if __name__ == '__main__':
    main()
