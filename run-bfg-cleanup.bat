@echo off
chcp 65001 >nul
echo ========================================
echo BFG Repo-Cleaner Git History Cleanup
echo ========================================
echo.

set BFG_JAR=E:\bfg-1.14.0.jar
set BARE_REPO=..\AIGC-jubianage-agent-clean.git

echo Checking BFG JAR...
if not exist "%BFG_JAR%" (
    echo Error: BFG JAR not found: %BFG_JAR%
    pause
    exit /b 1
)
echo Found BFG: %BFG_JAR%
echo.

echo Checking Java...
java --version >nul 2>&1
if errorlevel 1 (
    echo Error: Java not found. Please install Java or add it to PATH.
    pause
    exit /b 1
)
echo Java is installed
echo.

echo Creating bare repository...
if exist "%BARE_REPO%" (
    echo Removing old bare repository...
    rmdir /s /q "%BARE_REPO%"
)

echo Cloning from remote...
git clone --mirror git@github.com:ZhehuanUnique/AIGC-jubianage-agent.git "%BARE_REPO%"
if errorlevel 1 (
    echo Error: Clone failed
    pause
    exit /b 1
)
echo Done
echo.

echo Using BFG to clean large files and directories...
echo This may take a few minutes, please wait...
echo.

cd /d "%BARE_REPO%"

echo Removing: USB Files/
java -jar "%BFG_JAR%" --delete-folders "USB Files" .

echo Removing: Chiefavefan/
java -jar "%BFG_JAR%" --delete-folders "Chiefavefan" .

echo Removing: milvus/volumes/
java -jar "%BFG_JAR%" --delete-folders "milvus/volumes" .

echo Removing: Models/*.safetensors
java -jar "%BFG_JAR%" --delete-files "*.safetensors" .

echo.
echo Cleaning up Git references...
git reflog expire --expire=now --all
git gc --prune=now --aggressive

cd /d "%~dp0"

echo.
echo ========================================
echo Cleanup completed!
echo ========================================
echo.
echo Cleaned repository location: %BARE_REPO%
echo.
echo Next steps:
echo 1. cd "%BARE_REPO%"
echo 2. git remote set-url origin https://github.com/ZhehuanUnique/AIGC-jubianage-agent.git
echo 3. git push --force
echo.
pause


