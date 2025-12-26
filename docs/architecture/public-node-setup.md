# Public Kaspa Node Setup Guide

This guide explains how to configure your Kaspa All-in-One installation to run as a public node, allowing other nodes in the Kaspa network to connect to your node.

## 🌐 What is a Public Node?

A public node is a Kaspa node that accepts incoming connections from other nodes in the network. This helps strengthen the Kaspa network by:

- Providing additional connection points for new nodes
- Improving network decentralization
- Supporting network resilience and redundancy
- Contributing to faster block propagation

## ⚙️ Configuration

### Default Settings

By default, the Kaspa All-in-One package is configured to run as a public node:

```bash
# In your .env file
PUBLIC_NODE=true
KASPA_NODE_P2P_PORT=16110
KASPA_NODE_RPC_PORT=16111
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUBLIC_NODE` | `true` | Enable public node functionality |
| `KASPA_NODE_P2P_PORT` | `16110` | Port for peer-to-peer connections |
| `KASPA_NODE_RPC_PORT` | `16111` | Port for RPC API (local only) |
| `LOG_LEVEL` | `info` | Logging verbosity level |

## 🔧 Network Configuration

### 1. Router Port Forwarding

To make your node publicly accessible, you need to configure port forwarding on your router:

#### Step-by-Step Instructions:

1. **Find your router's IP address:**
   ```bash
   # On Linux/macOS
   ip route | grep default
   # or
   netstat -rn | grep default
   ```

2. **Access your router's admin panel:**
   - Open a web browser
   - Navigate to your router's IP (usually `192.168.1.1` or `192.168.0.1`)
   - Log in with admin credentials

3. **Configure port forwarding:**
   - Look for "Port Forwarding", "Virtual Server", or "NAT" settings
   - Add a new rule with these settings:
     - **Service Name:** Kaspa Node
     - **External Port:** 16110
     - **Internal IP:** [Your mini PC's local IP]
     - **Internal Port:** 16110
     - **Protocol:** TCP
     - **Status:** Enabled

4. **Find your mini PC's local IP:**
   ```bash
   # On your mini PC
   hostname -I
   # or
   ip addr show | grep inet
   ```

#### Common Router Interfaces:

**Netgear:**
- Advanced → Dynamic DNS/Port Forwarding → Port Forwarding

**Linksys:**
- Smart Wi-Fi Tools → Port Forwarding

**ASUS:**
- Adaptive QoS → Traditional QoS → Port Forwarding

**TP-Link:**
- Advanced → NAT Forwarding → Port Forwarding

### 2. Firewall Configuration

#### Ubuntu Firewall (UFW):
```bash
# Allow incoming connections on Kaspa P2P port
sudo ufw allow 16110/tcp

# Check firewall status
sudo ufw status
```

#### Advanced Firewall Rules:
```bash
# Allow only Kaspa P2P traffic
sudo ufw allow in 16110/tcp comment 'Kaspa P2P'

# Block RPC port from external access (security)
sudo ufw deny in 16111/tcp comment 'Block external RPC'
```

### 3. Network Security Considerations

#### Recommended Security Settings:

1. **RPC Access Control:**
   - Keep RPC port (16111) internal only
   - Never expose RPC to the internet
   - Use firewall rules to block external RPC access

2. **Monitoring:**
   - Monitor connection logs regularly
   - Watch for unusual traffic patterns
   - Set up alerts for high resource usage

3. **Updates:**
   - Keep the Kaspa node updated
   - Monitor security advisories
   - Update Docker images regularly

## 🧪 Testing Public Accessibility

### 1. Local Testing

First, verify your node is running correctly locally:

```bash
# Run the test script
./test-kaspa-node.sh

# Manual RPC test
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getInfo","params":{}}' \
  http://localhost:16111
```

### 2. External Accessibility Testing

#### Method 1: Online Port Checker
1. Visit [YouGetSignal Port Checker](https://www.yougetsignal.com/tools/open-ports/)
2. Enter your external IP address
3. Enter port `16110`
4. Click "Check"

#### Method 2: Command Line Test
```bash
# Get your external IP
curl ifconfig.me

# Test from another network (mobile hotspot, friend's network, etc.)
nc -zv YOUR_EXTERNAL_IP 16110
```

#### Method 3: Using the Test Script
```bash
# The test script includes public accessibility testing
./test-kaspa-node.sh
```

### 3. Verify Node Connectivity

Check if other nodes are connecting to yours:

```bash
# View node logs
docker logs kaspa-node | grep -i "peer\|connection"

# Check peer count via RPC
curl -X POST -H "Content-Type: application/json" \
  -d '{"method":"getPeerAddresses","params":{}}' \
  http://localhost:16111
```

## 📊 Monitoring Your Public Node

### 1. Connection Monitoring

```bash
# Monitor active connections
./scripts/manage.sh logs kaspa-node | grep -i peer

# Check peer statistics
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"method":"getConnectedPeerInfo","params":{}}' \
  http://localhost:16111 | jq .
```

### 2. Performance Monitoring

```bash
# Check system resources
./scripts/manage.sh status

# Monitor network traffic
sudo netstat -i

# Check disk usage (blockchain data grows over time)
df -h
```

### 3. Health Monitoring

```bash
# Run comprehensive health check
./scripts/health-check.sh -v

# Check sync status
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"method":"getBlockDagInfo","params":{}}' \
  http://localhost:16111 | jq .result.blockCount
```

## 🔍 Troubleshooting

### Common Issues

#### 1. Port Not Accessible Externally

**Symptoms:**
- Local RPC works, but external port check fails
- No incoming peer connections

**Solutions:**
```bash
# Check if port is bound correctly
sudo netstat -tlnp | grep 16110

# Verify Docker port mapping
docker port kaspa-node

# Test local port accessibility
nc -zv localhost 16110
```

#### 2. Router Port Forwarding Not Working

**Symptoms:**
- Port forwarding configured but still not accessible

**Solutions:**
- Restart router after configuration
- Check for double NAT (router behind another router)
- Verify internal IP hasn't changed (use static IP)
- Test with DMZ temporarily (not recommended for production)

#### 3. Firewall Blocking Connections

**Symptoms:**
- Port accessible locally but not externally

**Solutions:**
```bash
# Check firewall rules
sudo ufw status numbered

# Temporarily disable firewall for testing
sudo ufw disable
# Test accessibility
# Re-enable firewall
sudo ufw enable
```

#### 4. ISP Blocking Ports

**Symptoms:**
- Everything configured correctly but still not accessible

**Solutions:**
- Contact ISP to verify port blocking policies
- Try alternative ports (configure in .env file)
- Consider using a VPN or proxy service

### Diagnostic Commands

```bash
# Complete network diagnostic
./test-kaspa-node.sh

# Check Docker networking
docker network inspect kaspa-aio_kaspa-network

# Monitor real-time connections
watch -n 5 'docker logs kaspa-node --tail 10'

# Check system resources
htop
```

## 📈 Performance Optimization

### 1. Hardware Recommendations

For optimal public node performance:

- **CPU:** AMD Ryzen 7 or better
- **RAM:** 32GB (minimum 16GB)
- **Storage:** 1TB NVMe SSD
- **Network:** Gigabit internet connection

### 2. Configuration Tuning

```bash
# Increase connection limits (in docker-compose.yml)
command: [
  "--utxoindex",
  "--rpcbind=0.0.0.0:16111",
  "--rpclisten-borsh=0.0.0.0:17110",
  "--rpclisten-json=0.0.0.0:18110",
  "--maxinpeers=50",        # Increase incoming peer limit
  "--maxoutpeers=10",       # Outgoing peer limit
  "--loglevel=info"
]
```

### 3. Monitoring and Alerts

Set up monitoring for:
- Peer connection count
- Sync status
- Resource usage
- Network bandwidth
- Disk space

## 🎯 Best Practices

### 1. Security
- Never expose RPC port to internet
- Use strong firewall rules
- Monitor logs for suspicious activity
- Keep system updated

### 2. Reliability
- Use UPS for power protection
- Monitor disk space regularly
- Set up automated backups
- Plan for hardware redundancy

### 3. Performance
- Monitor peer connections
- Optimize network settings
- Regular system maintenance
- Monitor resource usage trends

### 4. Community Contribution
- Maintain high uptime
- Keep node updated
- Share performance metrics
- Help other node operators

## 📞 Support

If you encounter issues with public node setup:

1. **Check the troubleshooting section above**
2. **Run the diagnostic script:** `./test-kaspa-node.sh`
3. **Review logs:** `docker logs kaspa-node`
4. **Ask for help:**
   - GitHub Issues: [Project Issues](https://github.com/your-repo/kaspa-aio/issues)
   - Discord: [Kaspa Community](https://discord.gg/kaspa)
   - Reddit: [r/kaspa](https://reddit.com/r/kaspa)

---

**Thank you for contributing to the Kaspa network by running a public node! 🚀**