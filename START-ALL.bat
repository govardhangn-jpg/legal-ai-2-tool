@echo off
echo Starting Legal AI Backend...
start cmd /k "cd backend && npm start"

timeout /t 3

echo Starting Legal AI Frontend...
start cmd /k "python -m http.server 8000"

timeout /t 2

echo Opening browser...
start http://localhost:8000

echo.
echo ========================================
echo Both servers started!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:8000
echo ========================================
pause