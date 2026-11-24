@echo off
cd /d "%~dp0"

echo ===================================================
echo 1. Installing validation and Prisma packages...
echo ===================================================
call npm install class-validator class-transformer @prisma/client@6
call npm install -D prisma@6

echo ===================================================
echo 2. Creating .env and Prisma SQLite schema...
echo ===================================================
if not exist "prisma" mkdir prisma

(
echo PORT=3001
echo DATABASE_URL="file:./dev.db"
) > .env

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

echo ===================================================
echo 3. Generating Prisma Client and SQLite Database...
echo ===================================================
call npx prisma generate
call npx prisma migrate dev --name init

echo ===================================================
echo DONE! Prisma and SQLite setup completed.
echo ===================================================
pause