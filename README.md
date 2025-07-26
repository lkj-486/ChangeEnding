# 故事编织者 Demo (Storyweaver Demo)

一个基于AI的互动叙事游戏Demo项目，实现AI自主叙事与玩家关键决策相结合的创新玩法。

## 项目概述

本项目是一个互动小说生成器，其中AI角色自主推动预设场景目标，当主角AI面临关键抉择时，玩家可以介入并代替其做出决定，从而引导故事走向。

### 核心玩法闭环
**AI自主叙事 → 关键节点 → 玩家介入 → 故事分支 → AI继续叙事**

## 技术栈

- **后端**: Node.js + Express.js + TypeScript
- **前端**: React + TypeScript + Vite
- **数据库**: PostgreSQL + Prisma ORM
- **构建工具**: Turborepo + pnpm
- **AI服务**: Google Gemini (主要) + 通义千问 (未来支持)
- **实时通信**: Socket.IO
- **容器化**: Docker + Docker Compose

## 项目结构

```
storyweaver-demo/
├── packages/
│   ├── core/          # 核心游戏引擎
│   ├── api/           # 后端API服务
│   └── web/           # 前端React应用
├── package.json       # Monorepo根配置
├── turbo.json         # Turborepo配置
└── docker-compose.yml # 本地开发环境
```

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker & Docker Compose

### 安装依赖
```bash
# 安装所有依赖
pnpm install
```

### 环境配置
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑 .env 文件，填入必要的配置
# - Google API Key
# - 数据库连接信息
```

### 启动开发环境
```bash
# 启动数据库服务
docker-compose up -d

# 启动所有开发服务
pnpm dev
```

### 构建项目
```bash
# 构建所有包
pnpm build
```

### 代码检查
```bash
# 运行ESLint
pnpm lint

# 运行类型检查
pnpm type-check

# 格式化代码
pnpm format
```

## 开发阶段

### 当前阶段: 项目奠基 ✅
- [x] Monorepo基础架构
- [x] TypeScript配置
- [x] ESLint & Prettier配置
- [x] Docker开发环境

### 下一阶段: 核心引擎开发
- [ ] ECS世界状态系统
- [ ] 事件总线
- [ ] 导演模块
- [ ] AI代理系统
- [ ] LLM服务集成

## 贡献指南

请遵循项目的代码规范和开发流程：

1. 使用TypeScript进行开发
2. 遵循ESLint和Prettier配置
3. 编写单元测试
4. 提交前运行类型检查

## 许可证

MIT License
