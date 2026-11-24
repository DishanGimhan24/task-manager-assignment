@echo off
cd /d "%~dp0"

echo ===================================================
echo 1. Checking validation and Prisma packages...
echo ===================================================
if not exist "node_modules\@prisma\client" (
    echo Installing packages...
    call npm install class-validator class-transformer @prisma/client@6
    call npm install -D prisma@6
) else (
    echo Packages already installed. Skipping...
)

echo ===================================================
echo 2. Checking .env and Prisma SQLite schema...
echo ===================================================
if not exist "prisma" mkdir prisma

if not exist ".env" (
    echo Creating .env...
    (
    echo PORT=3001
    echo DATABASE_URL="file:./dev.db"
    ) > .env
) else (
    echo .env already exists. Skipping...
)

if not exist "prisma\schema.prisma" (
    echo Creating schema.prisma...
    (
    echo generator client {
    echo   provider = "prisma-client-js"
    echo }
    echo.
    echo datasource db {
    echo   provider = "sqlite"
    echo   url      = env^("DATABASE_URL"^)
    echo }
    echo.
    echo model Task {
    echo   id          String   @id @default^(uuid^(^)^)
    echo   title       String
    echo   description String?
    echo   status      String   @default^("TODO"^)
    echo   dueDate     String?
    echo   createdAt   DateTime @default^(now^(^)^)
    echo }
    ) > prisma\schema.prisma
) else (
    echo schema.prisma already exists. Skipping...
)

echo ===================================================
echo 3. Checking SQLite Database and Prisma Client...
echo ===================================================
if not exist "prisma\dev.db" (
    echo Creating SQLite database...
    call npx prisma generate
    call npx prisma migrate dev --name init
) else (
    echo Database dev.db already exists. Skipping migration...
)

echo ===================================================
echo 4. Starting NestJS Backend Server on port 3001...
echo ===================================================
call npm run start:dev
pause