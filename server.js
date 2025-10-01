const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const socketIoClient = require('socket.io-client');
const path = require('path');

class PressureTrendAnalyzer {
    constructor(windowHours = 3, minSamples = 6) {
        this.windowHours = windowHours;
        this.minSamples = minSamples;
        this.pressureHistory = [];
        this.maxHistory = 500;
    }

    addReading(pressure) {
        const now = new Date();
        this.pressureHistory.push({ time: now, pressure: pressure });
        
        // Keep only recent data
        if (this.pressureHistory.length > this.maxHistory) {
            this.pressureHistory.shift();
        }
    }

    getTrend() {
        const cutoffTime = new Date(Date.now() - (this.windowHours * 60 * 60 * 1000));
        
        // Remove old data
        this.pressureHistory = this.pressureHistory.filter(reading => reading.time >= cutoffTime);
        
        if (this.pressureHistory.length < this.minSamples) {
            return { trend: "INSUFFICIENT_DATA", changeRate: 0 };
        }

        // Simple linear regression
        const n = this.pressureHistory.length;
        const times = this.pressureHistory.map(r => (r.time - cutoffTime) / (1000 * 60 * 60)); // hours
        const pressures = this.pressureHistory.map(r => r.pressure);
        
        const sumX = times.reduce((a, b) => a + b, 0);
        const sumY = pressures.reduce((a, b) => a + b, 0);
        const sumXY = times.reduce((sum, x, i) => sum + x * pressures[i], 0);
        const sumXX = times.reduce((sum, x) => sum + x * x, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        
        let trend;
        if (Math.abs(slope) < 0.02) {
            trend = "STEADY";
        } else if (slope > 0) {
            trend = "RISING";
        } else {
            trend = "FALLING";
        }
        
        return { trend, changeRate: slope };
    }
}

class WeatherStation {
    constructor(apiKey, appKey) {
        this.apiKey = apiKey;
        this.appKey = appKey;
        this.currentData = null;
        this.connected = false;
        this.pressureAnalyzer = new PressureTrendAnalyzer(3, 6);
        this.clientSocket = null;
        this.webClients = new Set();
    }

    async connect() {
        try {
            this.clientSocket = socketIoClient(
                `https://rt2.ambientweather.net/?api=1&applicationKey=${this.appKey}`,
                { transports: ['websocket'] }
            );

            this.clientSocket.on('connect', () => {
                console.log('Connected to Ambient Weather');
                this.connected = true;
                this.clientSocket.emit('subscribe', { apiKeys: [this.apiKey] });
                this.broadcastStatus();
            });

            this.clientSocket.on('disconnect', () => {
                console.log('Disconnected from Ambient Weather');
                this.connected = false;
                this.broadcastStatus();
            });

            this.clientSocket.on('data', (data) => {
                this.currentData = { lastData: data, timestamp: new Date() };
                
                if (data.baromrelin) {
                    this.pressureAnalyzer.addReading(data.baromrelin);
                }
                
                this.broadcastData();
            });

        } catch (error) {
            console.error('Connection error:', error);
        }
    }

    addWebClient(socket) {
        this.webClients.add(socket);
        
        // Send current data immediately
        if (this.currentData) {
            socket.emit('weatherData', this.getEnhancedData());
        }
        
        socket.emit('connectionStatus', { connected: this.connected });
        
        socket.on('disconnect', () => {
            this.webClients.delete(socket);
        });
    }

    broadcastData() {
        const enhancedData = this.getEnhancedData();
        this.webClients.forEach(client => {
            client.emit('weatherData', enhancedData);
        });
    }

    broadcastStatus() {
        this.webClients.forEach(client => {
            client.emit('connectionStatus', { connected: this.connected });
        });
    }

    getEnhancedData() {
        if (!this.currentData) return null;
        
        const data = this.currentData.lastData;
        const pressureTrend = this.pressureAnalyzer.getTrend();
        
        return {
            ...data,
            timestamp: this.currentData.timestamp,
            pressureTrend: pressureTrend,
            windDirection: this.getWindDirection(data.winddir),
            windDirectionAvg: data.winddir_avg10m ? this.getWindDirection(data.winddir_avg10m) : null
        };
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                           'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.floor((degrees + 11.25) / 22.5);
        return directions[index % 16];
    }
}

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Configuration - Replace with your actual keys
const API_KEY = process.env.AMBIENT_API_KEY || '';
const APP_KEY = process.env.AMBIENT_APP_KEY || '';

if (!API_KEY || !APP_KEY) {
    console.error('Please set AMBIENT_API_KEY and AMBIENT_APP_KEY environment variables');
    process.exit(1);
}

// Initialize weather station
const weatherStation = new WeatherStation(API_KEY, APP_KEY);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle web client connections
io.on('connection', (socket) => {
    console.log('Web client connected');
    weatherStation.addWebClient(socket);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Weather station server running on port ${PORT}`);
    weatherStation.connect();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    if (weatherStation.clientSocket) {
        weatherStation.clientSocket.disconnect();
    }
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});
