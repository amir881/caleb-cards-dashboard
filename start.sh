#!/bin/bash

# Caleb Williams Card Dashboard Startup Script
# Run from: ~/Projects/caleb-cards-dashboard

echo "Starting Caleb Williams Rookie Card Dashboard..."

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Kill any existing servers on ports 8000 and 5173
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
echo ""
echo "Starting backend API server..."
cd "$DIR/backend/api"
source ../venv/bin/activate
python main.py &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Verify backend is running
if curl -s http://localhost:8000/health > /dev/null; then
    echo "  Backend is healthy!"
else
    echo "  Warning: Backend may not be ready yet"
fi

# Start frontend
echo ""
echo "Starting frontend dev server..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "=========================================="
echo "Dashboard is starting!"
echo ""
echo "  Frontend:  http://localhost:5173"
echo "  Backend:   http://localhost:8000"
echo "  API Docs:  http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "=========================================="

# Trap Ctrl+C
cleanup() {
    echo ""
    echo "Shutting down..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}
trap cleanup INT TERM

wait
