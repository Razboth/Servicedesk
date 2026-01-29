# Network Monitoring Agent

A standalone Python agent that monitors network connectivity for branches and ATMs, sending results to the Bank SulutGo ServiceDesk.

## Requirements

- Python 3.8 or higher
- Network access to all branches and ATMs (ICMP ping)
- HTTPS access to the Helpdesk server

## Installation

### Windows

1. Install Python 3.8+ from https://www.python.org/downloads/
2. Copy this folder to the monitoring PC
3. Run `install.bat`
4. Edit `config.json` with your API key

### Linux/macOS

```bash
# Install dependencies
pip3 install -r requirements.txt

# Copy example config
cp config.example.json config.json

# Edit config with your API key
nano config.json
```

## Configuration

Edit `config.json`:

```json
{
  "helpdesk_url": "https://helpdesk.banksulutgo.co.id",
  "api_key": "sk_live_xxxxx",
  "agent_id": "main-branch-monitor",
  "ping_interval_seconds": 60,
  "ping_timeout_ms": 3000,
  "ping_count": 3,
  "max_concurrent_pings": 20,
  "entity_refresh_interval_seconds": 3600,
  "retry_on_failure": true,
  "retry_delay_seconds": 30,
  "verify_ssl": true
}
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `helpdesk_url` | Helpdesk server URL | Required |
| `api_key` | API key with `monitoring:read` and `monitoring:write` permissions | Required |
| `agent_id` | Unique identifier for this agent | `main-branch-monitor` |
| `ping_interval_seconds` | Time between monitoring cycles | `60` |
| `ping_timeout_ms` | Timeout for each ping | `3000` |
| `ping_count` | Number of ping packets to send | `3` |
| `max_concurrent_pings` | Maximum parallel pings | `20` |
| `entity_refresh_interval_seconds` | How often to refresh entity list | `3600` |
| `retry_on_failure` | Retry sending results if failed | `true` |
| `retry_delay_seconds` | Delay before retry | `30` |
| `verify_ssl` | Verify SSL certificates | `true` |

## Getting an API Key

1. Go to Helpdesk → Admin → API Keys
2. Click "Create API Key"
3. Name: "Network Monitoring Agent"
4. Select permissions:
   - `monitoring:read` - Fetch entity list
   - `monitoring:write` - Submit ping results
5. Copy the generated key to `config.json`

## Running the Agent

### Manual Start

```bash
python agent.py
```

### Run as Windows Service (using NSSM)

1. Download NSSM from https://nssm.cc/
2. Run:
   ```cmd
   nssm install MonitoringAgent "C:\Python39\python.exe" "C:\monitoring-agent\agent.py"
   nssm set MonitoringAgent AppDirectory "C:\monitoring-agent"
   nssm start MonitoringAgent
   ```

### Run as Linux Service (systemd)

Create `/etc/systemd/system/monitoring-agent.service`:

```ini
[Unit]
Description=Network Monitoring Agent
After=network.target

[Service]
Type=simple
User=monitoring
WorkingDirectory=/opt/monitoring-agent
ExecStart=/usr/bin/python3 /opt/monitoring-agent/agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable monitoring-agent
sudo systemctl start monitoring-agent
```

## Logs

Logs are written to:
- Console (stdout)
- `monitoring-agent.log` in the current directory

## Troubleshooting

### "Failed to fetch entities"
- Check API key is correct
- Check `helpdesk_url` is correct and accessible
- Check API key has `monitoring:read` permission

### "Failed to send results"
- Check API key has `monitoring:write` permission
- Check network connectivity to Helpdesk server

### SSL Certificate Error
- If using self-signed certificate, set `verify_ssl: false` in config
- Or add the certificate to your system's trusted certificates

### High Memory Usage
- Reduce `max_concurrent_pings` to lower parallel connections
- Increase `ping_interval_seconds` to reduce frequency

## How It Works

1. **Startup**: Agent fetches list of entities (branches/ATMs) from Helpdesk API
2. **Ping Cycle**: Every `ping_interval_seconds`, agent pings all entities concurrently
3. **Status Detection**:
   - `ONLINE`: 0% packet loss, response time < 1000ms
   - `SLOW`: Some packet loss or response time > 1000ms
   - `OFFLINE`: 100% packet loss
   - `TIMEOUT`: Ping timed out
4. **Submit Results**: Results are sent to Helpdesk API
5. **State Machine**: Helpdesk processes results through hysteresis (alerts only after consecutive failures)
6. **Entity Refresh**: Entity list is refreshed every `entity_refresh_interval_seconds`
