@echo off
REM ========================================
REM  舆情洞察家 - Windows安装脚本
REM ========================================

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   舆情洞察家 - 自动安装程序
echo ========================================
echo.

REM 检查管理员权限
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：需要管理员权限运行此脚本
    echo 请右键点击此脚本，选择"以管理员身份运行"
    pause
    exit /b 1
)

REM 检查Node.js
echo [1/5] 检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未检测到Node.js
    echo 请先安装Node.js: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js已安装

REM 检查Python
echo [2/5] 检查Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未检测到Python
    echo 请先安装Python: https://www.python.org/
    pause
    exit /b 1
)
echo ✓ Python已安装

REM 检查MySQL
echo [3/5] 检查MySQL...
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 警告：未检测到MySQL
    echo 请先安装MySQL: https://dev.mysql.com/downloads/mysql/
    echo.
    set /p continue="是否继续? (Y/N): "
    if /i not "!continue!"=="Y" exit /b 1
)
echo ✓ MySQL已安装

REM 进入源代码目录
echo [4/5] 安装Node.js依赖...
cd /d "%~dp0源代码"
if %errorlevel% neq 0 (
    echo 错误：无法进入源代码目录
    pause
    exit /b 1
)

REM 安装pnpm
npm install -g pnpm >nul 2>&1

REM 安装项目依赖
pnpm install
if %errorlevel% neq 0 (
    echo 错误：Node.js依赖安装失败
    pause
    exit /b 1
)
echo ✓ Node.js依赖已安装

REM 安装Python依赖
echo [5/5] 安装Python依赖...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo 警告：Python依赖安装可能失败
    echo 请手动运行: pip install -r requirements.txt
)
echo ✓ Python依赖已安装

echo.
echo ========================================
echo   安装完成！
echo ========================================
echo.
echo 下一步：
echo 1. 配置数据库（见操作说明.md）
echo 2. 创建.env文件（见操作说明.md）
echo 3. 启动应用：
echo    - 启动NLP服务: python nlp_service.py
echo    - 启动Web应用: set PORT=3001 && pnpm start
echo.
pause
