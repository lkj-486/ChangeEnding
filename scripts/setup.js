#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const {
  colorLog,
  execCommand,
  checkFile,
  copyFile,
  checkPnpm,
  installPnpm,
  cleanNpmArtifacts,
  verifyPnpmWorkspace,
  verifyStoryWeaverStructure,
  printSeparator,
  createDirectory
} = require('./utils');

// 工具函数已从utils.js导入

async function main() {
  const { colors } = require('./utils');
  console.log(`${colors.magenta}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                      🔧 StoryWeaver 环境设置脚本                              ║');
  console.log('║                     自动配置开发环境和依赖项                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  const steps = [
    {
      name: '检查包管理器',
      action: checkPackageManager,
    },
    {
      name: '清理npm痕迹',
      action: cleanNpmArtifacts,
    },
    {
      name: '安装根目录依赖',
      action: installRootDependencies,
    },
    {
      name: '构建核心包',
      action: buildCorePackage,
    },
    {
      name: '安装所有依赖',
      action: installAllDependencies,
    },
    {
      name: '设置环境配置',
      action: setupEnvironment,
    },
    {
      name: '验证pnpm workspace',
      action: verifyPnpmWorkspace,
    },
    {
      name: '验证项目结构',
      action: verifyStoryWeaverStructure,
    },
    {
      name: '初始化数据库',
      action: initializeDatabase,
    },
  ];

  let completedSteps = 0;
  
  for (const step of steps) {
    try {
      colorLog('cyan', `\n📋 步骤 ${completedSteps + 1}/${steps.length}: ${step.name}`);
      colorLog('yellow', '━'.repeat(60));
      
      const success = await step.action();
      
      if (success) {
        colorLog('green', `✅ ${step.name} 完成`);
        completedSteps++;
      } else {
        colorLog('red', `❌ ${step.name} 失败`);
        break;
      }
    } catch (error) {
      colorLog('red', `❌ ${step.name} 执行出错: ${error.message}`);
      break;
    }
  }

  // 显示最终结果
  console.log('\n' + '='.repeat(80));
  if (completedSteps === steps.length) {
    colorLog('green', '🎉 环境设置完成！');
    colorLog('cyan', '\n📋 下一步操作:');
    console.log('   1. 启动开发环境: npm run dev:parallel');
    console.log('   2. 或分别启动服务:');
    console.log('      - 数据库: docker-compose up -d');
    console.log('      - 后端: cd packages/api && npm run dev');
    console.log('      - 前端: cd packages/web && npm run dev');
  } else {
    colorLog('red', `❌ 环境设置失败 (${completedSteps}/${steps.length} 步骤完成)`);
    colorLog('yellow', '请检查上述错误信息并手动解决问题');
  }
  console.log('='.repeat(80));
}

// 检查包管理器
function checkPackageManager() {
  colorLog('blue', '检查 pnpm 是否已安装...');

  if (checkPnpm()) {
    colorLog('green', '✅ pnpm 已安装');
    return true;
  }

  return installPnpm();
}

// cleanNpmArtifacts 已从utils.js导入，无需重复定义

// 安装根目录依赖
function installRootDependencies() {
  colorLog('blue', '安装根目录依赖...');
  return execCommand('pnpm install --frozen-lockfile=false');
}

// 构建核心包
function buildCorePackage() {
  colorLog('blue', '构建核心包...');
  return execCommand('pnpm run build', path.join(process.cwd(), 'packages', 'core'));
}

// 安装所有依赖
function installAllDependencies() {
  colorLog('blue', '安装所有工作空间依赖...');
  return execCommand('pnpm install --frozen-lockfile=false');
}

// 设置环境配置
function setupEnvironment() {
  colorLog('blue', '设置环境配置文件...');

  // 复制环境配置文件
  if (!checkFile('.env')) {
    if (checkFile('.env.development')) {
      copyFile('.env.development', '.env');
    } else if (checkFile('.env.example')) {
      copyFile('.env.example', '.env');
    } else {
      colorLog('yellow', '⚠️  未找到环境配置模板');
    }
  } else {
    colorLog('green', '✅ .env 文件已存在');
  }

  // 检查必要的目录
  const requiredDirs = [
    'packages/core/dist',
    'packages/core/data',
    'packages/core/data/scenes',
    'packages/core/data/characters',
  ];

  requiredDirs.forEach(dir => {
    createDirectory(dir);
  });

  return true;
}

// 初始化数据库
function initializeDatabase() {
  colorLog('blue', '初始化数据库...');

  // 检查Docker是否运行
  try {
    execSync('docker --version', { stdio: 'pipe' });
  } catch {
    colorLog('red', '❌ Docker未安装或未运行，请先安装Docker');
    return false;
  }

  // 启动数据库容器
  colorLog('blue', '启动数据库容器...');
  if (!execCommand('docker-compose up -d postgres')) {
    return false;
  }

  // 等待数据库启动
  colorLog('blue', '等待数据库启动...');
  let attempts = 0;
  const maxAttempts = 30;

  while (attempts < maxAttempts) {
    try {
      execSync('docker exec storyweaver-postgres pg_isready -U storyweaver -d storyweaver_demo', { stdio: 'pipe' });
      colorLog('green', '✅ 数据库已就绪');
      break;
    } catch {
      attempts++;
      if (attempts % 5 === 0) {
        colorLog('yellow', `等待数据库启动... (${attempts}/${maxAttempts})`);
      }
      // 等待2秒
      execSync('sleep 2', { stdio: 'pipe' });
    }
  }

  if (attempts >= maxAttempts) {
    colorLog('red', '❌ 数据库启动超时');
    return false;
  }

  // 运行数据库迁移
  colorLog('blue', '运行数据库迁移...');
  if (!execCommand('pnpm run db:migrate', path.join(process.cwd(), 'packages', 'api'))) {
    colorLog('yellow', '⚠️  数据库迁移失败，尝试推送schema...');
    if (!execCommand('pnpm run db:push', path.join(process.cwd(), 'packages', 'api'))) {
      return false;
    }
  }

  // 运行种子数据
  colorLog('blue', '填充种子数据...');
  if (!execCommand('pnpm run db:seed', path.join(process.cwd(), 'packages', 'api'))) {
    colorLog('yellow', '⚠️  种子数据填充失败，但数据库已初始化');
  }

  colorLog('green', '✅ 数据库初始化完成');
  return true;
}

// 验证函数已移至utils.js

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    colorLog('red', `设置脚本执行失败: ${error.message}`);
    process.exit(1);
  });
}
