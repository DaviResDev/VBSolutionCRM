#!/bin/bash

# Baileys WhatsApp Server Startup Script
# This script ensures the Baileys server is always running

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/baileys-server.log"
PID_FILE="$SCRIPT_DIR/baileys-server.pid"
MONITOR_SCRIPT="$SCRIPT_DIR/baileys-monitor.js"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Check if server is already running
check_running() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Start the server
start_server() {
    log "🚀 Starting Baileys WhatsApp Server..."
    
    # Check if already running
    if check_running; then
        warning "Server is already running (PID: $(cat "$PID_FILE"))"
        return 0
    fi

    # Start the monitor script
    cd "$SCRIPT_DIR"
    nohup node "$MONITOR_SCRIPT" > "$LOG_FILE" 2>&1 &
    local monitor_pid=$!
    
    # Save monitor PID
    echo "$monitor_pid" > "$PID_FILE"
    
    # Wait a moment and check if it started successfully
    sleep 3
    if check_running; then
        success "Baileys server started successfully (Monitor PID: $monitor_pid)"
        log "Server logs: $LOG_FILE"
        log "Health check: curl http://localhost:3000/api/baileys-simple/connections"
    else
        error "Failed to start Baileys server"
        return 1
    fi
}

# Stop the server
stop_server() {
    log "🛑 Stopping Baileys WhatsApp Server..."
    
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid"
            sleep 2
            if ps -p "$pid" > /dev/null 2>&1; then
                warning "Graceful shutdown failed, forcing kill..."
                kill -KILL "$pid"
            fi
            success "Server stopped"
        else
            warning "Server was not running"
        fi
        rm -f "$PID_FILE"
    else
        warning "No PID file found"
    fi
}

# Restart the server
restart_server() {
    log "🔄 Restarting Baileys WhatsApp Server..."
    stop_server
    sleep 2
    start_server
}

# Show server status
show_status() {
    if check_running; then
        local pid=$(cat "$PID_FILE")
        success "Baileys server is running (PID: $pid)"
        
        # Test health
        if curl -s http://localhost:3000/api/baileys-simple/connections > /dev/null 2>&1; then
            success "Server is responding to health checks"
        else
            warning "Server is running but not responding to health checks"
        fi
    else
        error "Baileys server is not running"
    fi
}

# Show logs
show_logs() {
    if [ -f "$LOG_FILE" ]; then
        tail -f "$LOG_FILE"
    else
        error "Log file not found: $LOG_FILE"
    fi
}

# Main script logic
case "$1" in
    start)
        start_server
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart_server
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the Baileys server"
        echo "  stop    - Stop the Baileys server"
        echo "  restart - Restart the Baileys server"
        echo "  status  - Show server status"
        echo "  logs    - Show server logs (follow mode)"
        exit 1
        ;;
esac
