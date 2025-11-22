#!/bin/bash

# 舆情洞察家 - 一键启动脚本

echo "======================================"
echo "  舆情洞察家 - 启动所有服务"
echo "======================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查并启动MySQL
echo -e "\n${YELLOW}[1/3] 检查MySQL数据库...${NC}"
if sudo service mysql status > /dev/null 2>&1; then
    echo -e "${GREEN}✓ MySQL已运行${NC}"
else
    echo -e "${YELLOW}启动MySQL...${NC}"
    sudo service mysql start
    sleep 2
    if sudo service mysql status > /dev/null 2>&1; then
        echo -e "${GREEN}✓ MySQL启动成功${NC}"
    else
        echo -e "${RED}✗ MySQL启动失败${NC}"
        exit 1
    fi
fi

# 启动NLP服务
echo -e "\n${YELLOW}[2/3] 启动NLP服务...${NC}"
if pgrep -f "nlp_service.py" > /dev/null; then
    echo -e "${GREEN}✓ NLP服务已运行${NC}"
else
    cd /home/ubuntu/yuqing_dongchajia
    nohup python3 nlp_service.py > nlp_service.log 2>&1 &
    sleep 3
    
    # 检查服务是否启动成功
    if curl -s http://localhost:8000/health > /dev/null; then
        echo -e "${GREEN}✓ NLP服务启动成功 (http://localhost:8000)${NC}"
    else
        echo -e "${RED}✗ NLP服务启动失败，请查看 nlp_service.log${NC}"
    fi
fi

# 启动Web应用
echo -e "\n${YELLOW}[3/3] 启动Web应用...${NC}"
cd /home/ubuntu/yuqing_dongchajia

# 加载环境变量
export $(cat .env | grep -v '^#' | xargs)

echo -e "${YELLOW}正在启动开发服务器...${NC}"
echo -e "${YELLOW}提示：按 Ctrl+C 停止服务${NC}"
echo ""

# 启动开发服务器
pnpm dev

echo -e "\n${GREEN}======================================"
echo -e "  所有服务已启动"
echo -e "======================================${NC}"
echo ""
echo -e "访问地址："
echo -e "  Web应用: ${GREEN}http://localhost:3001${NC}"
echo -e "  NLP服务: ${GREEN}http://localhost:8000${NC}"
echo ""
echo -e "日志文件："
echo -e "  NLP服务: ${YELLOW}nlp_service.log${NC}"
echo ""
