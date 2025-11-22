#!/bin/bash

# ========================================
#  舆情洞察家 - Linux/Mac安装脚本
# ========================================

set -e

echo ""
echo "========================================"
echo "  舆情洞察家 - 自动安装程序"
echo "========================================"
echo ""

# 检查操作系统
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
else
    echo "错误：不支持的操作系统"
    exit 1
fi

echo "检测到操作系统: $OS"
echo ""

# 检查Node.js
echo "[1/5] 检查Node.js..."
if ! command -v node &> /dev/null; then
    echo "错误：未检测到Node.js"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi
node_version=$(node --version)
echo "✓ Node.js已安装 ($node_version)"

# 检查Python
echo "[2/5] 检查Python..."
if ! command -v python3 &> /dev/null; then
    echo "错误：未检测到Python3"
    echo "请先安装Python3"
    if [[ "$OS" == "linux" ]]; then
        echo "Ubuntu/Debian: sudo apt-get install python3"
        echo "CentOS/RHEL: sudo yum install python3"
    elif [[ "$OS" == "macos" ]]; then
        echo "macOS: brew install python3"
    fi
    exit 1
fi
python_version=$(python3 --version)
echo "✓ Python已安装 ($python_version)"

# 检查MySQL
echo "[3/5] 检查MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "警告：未检测到MySQL"
    echo "请先安装MySQL: https://dev.mysql.com/downloads/mysql/"
    read -p "是否继续? (Y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    mysql_version=$(mysql --version)
    echo "✓ MySQL已安装 ($mysql_version)"
fi

# 进入源代码目录
echo "[4/5] 安装Node.js依赖..."
cd "$(dirname "$0")/源代码"

# 安装pnpm
npm install -g pnpm 2>/dev/null || true

# 安装项目依赖
pnpm install
if [ $? -ne 0 ]; then
    echo "错误：Node.js依赖安装失败"
    exit 1
fi
echo "✓ Node.js依赖已安装"

# 安装Python依赖
echo "[5/5] 安装Python依赖..."
pip3 install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "警告：Python依赖安装可能失败"
    echo "请手动运行: pip3 install -r requirements.txt"
fi
echo "✓ Python依赖已安装"

echo ""
echo "========================================"
echo "   安装完成！"
echo "========================================"
echo ""
echo "下一步："
echo "1. 配置数据库（见操作说明.md）"
echo "2. 创建.env文件（见操作说明.md）"
echo "3. 启动应用："
echo "   - 启动NLP服务: python3 nlp_service.py"
echo "   - 启动Web应用: PORT=3001 pnpm start"
echo ""
