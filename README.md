# Ambient Weather Web Interface

A lightweight, mobile-optimized web interface for Ambient Weather personal weather stations. Designed to run on a Raspberry Pi with real-time WebSocket connections and automatic dark mode support. Why did I do this? I wanted to see the current data from my weather station via Ambient's realtime API. I already have something that works from the CLI via ncurses (see bottom of this file for a link), and I wanted something similar that I could access with my phone. The first version just re-created the look of the terminal app, which was functionally ok but sort of ugly. This was the result of a few iterations with Claude and I think it turned out pretty good. Lightweight, current data. 

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Features

- **Real-time data** via WebSocket connection to Ambient Weather API
- **Mobile-first design** optimized for iOS devices
- **Automatic dark mode** that follows system preferences
- **Barometric pressure trend analysis** with visual indicators
- **Color-coded status displays** for UV index, battery, and weather conditions
- **Compact, information-dense layout** - all data visible without scrolling
- **Lightweight and efficient** - perfect for Raspberry Pi deployment

## Screenshots

### Light Mode
Clean, modern interface with excellent readability

![alt text](https://github.com/jquinby/Ambient-Weather-Realtime/blob/main/light_mode_screenshot.jpg?raw=true)

### Dark Mode
Automatically switches based on device settings

## Prerequisites

- **Node.js 16+** (LTS recommended)
- **Ambient Weather API credentials** - Get these from your [Ambient Weather Dashboard](https://ambientweather.net/)
- **Raspberry Pi** (any model) or similar Linux server
- **(Optional) Tailscale** for secure remote access

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ambient-weather-web.git
cd ambient-weather-web
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure API Keys

Set your Ambient Weather API keys as environment variables:

```bash
export AMBIENT_API_KEY="your_api_key_here"
export AMBIENT_APP_KEY="your_application_key_here"
```

Or create a `.env` file:

```bash
AMBIENT_API_KEY=your_api_key_here
AMBIENT_APP_KEY=your_application_key_here
```

### 4. Run the Application

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

### 5. Access the Interface

Open your browser and navigate to:
- Local: `http://localhost:3000`
- Network: `http://your-pi-ip:3000`
- Tailscale: `http://your-tailscale-hostname:3000`

## Production Deployment

### Using PM2 (Recommended)

PM2 provides automatic restarts, log management, and easy deployment:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Create logs directory
mkdir logs

# Start the application
npm run pm2:start

# Check status
pm2 status

# View logs
pm2 logs ambient-weather

# Restart
pm2 restart ambient-weather

# Stop
pm2 stop ambient-weather

# Enable startup on boot
pm2 startup
pm2 save
```

### Using Systemd

Create `/etc/systemd/system/ambient-weather.service`:

```ini
[Unit]
Description=Ambient Weather Web Interface
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ambient-weather-web
Environment=NODE_ENV=production
Environment=AMBIENT_API_KEY=your_api_key_here
Environment=AMBIENT_APP_KEY=your_app_key_here
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable ambient-weather
sudo systemctl start ambient-weather
sudo systemctl status ambient-weather
```

## Project Structure

```
ambient-weather-web/
├── server.js              # Node.js WebSocket server
├── package.json           # Dependencies and scripts
├── ecosystem.config.js    # PM2 configuration
├── public/
│   └── index.html        # Web interface
├── logs/                 # PM2 logs (auto-created)
└── README.md
```

## Key Features Explained

### Barometric Pressure Trends

The interface analyzes pressure changes over a 3-hour window:
- **↑** Rising pressure (weather improving)
- **↓** Falling pressure (weather deteriorating)
- **→** Steady pressure
- **↑↑ / ↓↓** Rapid changes (>0.06 inHg/hr)

Displays hourly change rate for detailed tracking.

### Automatic Dark Mode

The interface automatically switches between light and dark themes based on your device's system preferences. No manual toggle required - it just works!

### UV Index Color Coding

- **Green**: Low (0-2)
- **Yellow**: Moderate (3-5)
- **Orange**: High (6-7)
- **Red**: Very High (8-10)
- **Purple**: Extreme (11+)

### Mobile Optimization

- Responsive design that fits perfectly on iPhone screens
- Touch-friendly interface
- No scrolling required - all data visible at once
- Fast load times and minimal data usage

## Configuration Options

### Changing the Port

Edit `server.js` or set an environment variable:

```bash
PORT=8080 npm start
```

### Adjusting Pressure Trend Window

In `server.js`, modify the `PressureTrendAnalyzer` constructor:

```javascript
// Default: 3 hours, 6 minimum samples
new PressureTrendAnalyzer(3, 6)

// Example: 6 hour window, 12 minimum samples
new PressureTrendAnalyzer(6, 12)
```

## Troubleshooting

### Cannot Connect to Ambient Weather

- Verify your API keys are correct
- Check that your weather station is online in the Ambient Weather dashboard
- Ensure your network allows outbound WebSocket connections
- Check the console logs: `pm2 logs ambient-weather`

### High CPU Usage

The application is designed to be lightweight. If experiencing high CPU:
- Ensure you're running Node.js 16 or newer
- Check for other processes competing for resources
- Consider increasing the update interval

### Cannot Access from iPhone

- Verify the Raspberry Pi and iPhone are on the same network
- Check firewall settings: `sudo ufw allow 3000`
- For remote access, ensure Tailscale is running on both devices

## Remote Access with Tailscale

[Tailscale](https://tailscale.com/) provides secure, encrypted access to your weather station from anywhere:

1. Install Tailscale on your Raspberry Pi:
   ```bash
   curl -fsSL https://tailscale.com/install.sh | sh
   ```

2. Authenticate:
   ```bash
   sudo tailscale up
   ```

3. Install Tailscale on your iPhone

4. Access via: `http://your-pi-tailscale-name:3000`

## Getting Ambient Weather API Keys

1. Log in to [ambientweather.net](https://ambientweather.net/)
2. Go to **Account** → **API Keys**
3. Create a new API key if you don't have one
4. Copy both the **API Key** and **Application Key**

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Acknowledgments

- Built for Ambient Weather personal weather stations
- Inspired by terminal-based weather displays
- Optimized for Raspberry Pi and mobile devices

## Support

For issues or questions:
- Open an issue on GitHub
- Check the Ambient Weather API documentation
- Verify your weather station is functioning properly in the official Ambient Weather app

## Related Projects

- [ambient_weather_curses](https://github.com/jquinby/ambient_weather_curses) - Terminal-based weather display (Python/curses)
