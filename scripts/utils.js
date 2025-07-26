#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出工具
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * 彩色日志输出
 */
function colorLog(color, prefix, message) {
  if (message === undefined) {
    // 两参数模式：colorLog('red', 'message')
    message = prefix;
    prefix = '';
  }
  
  const prefixStr = prefix ? `[${prefix}] ` : '';
  console.log(`${colors[color]}${colors.bright}${prefixStr}${colors.reset}${message}`);
}

/**
 * 执行命令
 */
function execCommand(command, cwd = process.cwd()) {
  try {
    colorLog('blue', `执行: ${command}`);
    execSync(command, { cwd, stdio: 'inherit' });
    return true;
  } catch (error) {
    colorLog('red', `命令执行失败: ${command}`);
    colorLog('red', error.message);
    return false;
  }
}

/**
 * 检查文件是否存在
 */
function checkFile(filePath) {
  return fs.existsSync(filePath);
}

/**
 * 复制文件
 */
function copyFile(src, dest) {
  try {
    fs.copyFileSync(src, dest);
    colorLog('green', `✅ 复制文件: ${dest}`);
    return true;
  } catch (error) {
    colorLog('red', `❌ 复制文件失败: ${dest}`);
    return false;
  }
}

/**
 * 删除文件或目录
 */
function removeFileOrDir(targetPath) {
  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
        colorLog('yellow', `删除目录: ${targetPath}`);
      } else {
        fs.unlinkSync(targetPath);
        colorLog('yellow', `删除文件: ${targetPath}`);
      }
      return true;
    }
    return true; // 文件不存在也算成功
  } catch (error) {
    colorLog('red', `删除失败: ${targetPath} - ${error.message}`);
    return false;
  }
}

/**
 * 创建目录
 */
function createDirectory(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      colorLog('green', `创建目录: ${dirPath}`);
    }
    return true;
  } catch (error) {
    colorLog('red', `创建目录失败: ${dirPath} - ${error.message}`);
    return false;
  }
}

/**
 * 检查pnpm是否安装
 */
function checkPnpm() {
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 安装pnpm
 */
function installPnpm() {
  colorLog('yellow', '⚠️  pnpm 未安装，尝试安装...');
  
  try {
    execSync('npm install -g pnpm', { stdio: 'inherit' });
    colorLog('green', '✅ pnpm 安装成功');
    return true;
  } catch {
    colorLog('red', '❌ pnpm 安装失败，请手动安装: npm install -g pnpm');
    return false;
  }
}

/**
 * 清理npm痕迹
 */
function cleanNpmArtifacts() {
  colorLog('blue', '清理npm痕迹...');
  
  const artifactsToClean = [
    // 根目录
    'node_modules',
    'package-lock.json',
    'yarn.lock',
    
    // 子包目录
    'packages/core/node_modules',
    'packages/core/package-lock.json',
    'packages/api/node_modules', 
    'packages/api/package-lock.json',
    'packages/web/node_modules',
    'packages/web/package-lock.json',
    
    // 隐藏的npm文件
    'node_modules/.package-lock.json',
  ];

  let cleanedCount = 0;
  artifactsToClean.forEach(artifact => {
    if (removeFileOrDir(artifact)) {
      cleanedCount++;
    }
  });

  colorLog('green', `✅ 清理完成，处理了 ${cleanedCount} 个npm相关文件/目录`);
  return true;
}

/**
 * 验证pnpm workspace状态
 */
function verifyPnpmWorkspace() {
  colorLog('blue', '验证pnpm workspace状态...');
  
  const checks = [
    {
      name: 'pnpm-lock.yaml存在',
      path: 'pnpm-lock.yaml',
      required: true,
    },
    {
      name: '核心包构建产物',
      path: 'packages/core/dist/index.js',
      required: true,
    },
    {
      name: '核心包类型定义',
      path: 'packages/core/dist/index.d.ts',
      required: true,
    },
    {
      name: 'API包node_modules',
      path: 'packages/api/node_modules',
      required: false, // 可能通过workspace链接
    },
    {
      name: 'Web包node_modules',
      path: 'packages/web/node_modules', 
      required: false, // 可能通过workspace链接
    },
  ];

  let passedChecks = 0;
  let requiredChecks = 0;

  checks.forEach(check => {
    if (check.required) requiredChecks++;
    
    if (checkFile(check.path)) {
      colorLog('green', `✅ ${check.name}`);
      passedChecks++;
    } else {
      const level = check.required ? 'red' : 'yellow';
      const icon = check.required ? '❌' : '⚠️ ';
      colorLog(level, `${icon} ${check.name} (${check.path})`);
    }
  });

  const allRequiredPassed = passedChecks >= requiredChecks;
  
  if (allRequiredPassed) {
    colorLog('green', '🎉 pnpm workspace验证通过！');
  } else {
    colorLog('yellow', `⚠️  ${passedChecks}/${checks.length} 检查通过，${requiredChecks - passedChecks} 个必需项失败`);
  }

  return allRequiredPassed;
}

/**
 * 项目特定检查：StoryWeaver项目结构验证
 */
function verifyStoryWeaverStructure() {
  colorLog('blue', '验证StoryWeaver项目结构...');
  
  const requiredStructure = [
    'packages/core/src/index.ts',
    'packages/api/src/index.ts', 
    'packages/web/src/main.tsx',
    'docker-compose.yml',
    '.env.development',
    'turbo.json',
  ];

  let allExists = true;
  
  requiredStructure.forEach(filePath => {
    if (checkFile(filePath)) {
      colorLog('green', `✅ ${filePath}`);
    } else {
      colorLog('red', `❌ ${filePath}`);
      allExists = false;
    }
  });

  return allExists;
}

/**
 * 打印分隔线
 */
function printSeparator(title = '') {
  const line = '━'.repeat(80);
  if (title) {
    console.log(`\n${colors.cyan}${colors.bright}${title}${colors.reset}`);
  }
  console.log(`${colors.cyan}${line}${colors.reset}`);
}

module.exports = {
  colors,
  colorLog,
  execCommand,
  checkFile,
  copyFile,
  removeFileOrDir,
  createDirectory,
  checkPnpm,
  installPnpm,
  cleanNpmArtifacts,
  verifyPnpmWorkspace,
  verifyStoryWeaverStructure,
  printSeparator,
};
