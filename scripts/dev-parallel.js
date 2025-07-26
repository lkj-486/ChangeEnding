#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { colorLog, colors } = require('./utils');

// 颜色输出工具已从utils.js导入

// 服务配置
const services = [
  {
    name: 'Database',
    command: 'docker-compose',
    args: ['up', '-d'],
    cwd: process.cwd(),
    color: 'blue',
    healthCheck: () => checkDockerService('storyweaver-postgres'),
    required: true,
  },
  {
    name: 'API',
    command: 'pnpm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'packages', 'api'),
    color: 'green',
    healthCheck: () => checkHttpService('http://localhost:3001/health'),
    required: true,
    dependsOn: ['Database'],
  },
  {
    name: 'Web',
    command: 'pnpm',
    args: ['run', 'dev'],
    cwd: path.join(process.cwd(), 'packages', 'web'),
    color: 'cyan',
    healthCheck: () => checkHttpService('http://localhost:3000'),
    required: false,
    dependsOn: [],
  },
];

// 服务状态
const serviceStatus = new Map();
const serviceProcesses = new Map();

// 健康检查函数
async function checkDockerService(containerName) {
  return new Promise((resolve) => {
    const docker = spawn('docker', ['ps', '--filter', `name=${containerName}`, '--format', '{{.Status}}']);
    let output = '';
    
    docker.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    docker.on('close', (code) => {
      resolve(output.includes('Up') && !output.includes('unhealthy'));
    });
    
    docker.on('error', () => resolve(false));
  });
}

async function checkHttpService(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

// 等待依赖服务
async function waitForDependencies(service) {
  if (!service.dependsOn || service.dependsOn.length === 0) {
    return true;
  }

  colorLog('yellow', service.name, `等待依赖服务: ${service.dependsOn.join(', ')}`);
  
  for (const depName of service.dependsOn) {
    while (serviceStatus.get(depName) !== 'healthy') {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return true;
}

// 启动服务
async function startService(service) {
  try {
    colorLog('yellow', service.name, '正在启动...');
    serviceStatus.set(service.name, 'starting');

    // 等待依赖
    await waitForDependencies(service);

    // 检查工作目录
    if (!fs.existsSync(service.cwd)) {
      throw new Error(`工作目录不存在: ${service.cwd}`);
    }

    // 启动进程
    const process = spawn(service.command, service.args, {
      cwd: service.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });

    serviceProcesses.set(service.name, process);

    // 处理输出
    process.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        colorLog(service.color, service.name, line);
      });
    });

    process.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => {
        colorLog('red', service.name, `ERROR: ${line}`);
      });
    });

    process.on('close', (code) => {
      if (code !== 0) {
        colorLog('red', service.name, `进程退出，代码: ${code}`);
        serviceStatus.set(service.name, 'failed');
        if (service.required) {
          handleServiceFailure(service, `进程退出，代码: ${code}`);
        }
      }
    });

    process.on('error', (error) => {
      colorLog('red', service.name, `启动失败: ${error.message}`);
      serviceStatus.set(service.name, 'failed');
      if (service.required) {
        handleServiceFailure(service, error.message);
      }
    });

    // 等待服务健康
    await waitForServiceHealth(service);

  } catch (error) {
    colorLog('red', service.name, `启动失败: ${error.message}`);
    serviceStatus.set(service.name, 'failed');
    if (service.required) {
      handleServiceFailure(service, error.message);
    }
  }
}

// 等待服务健康
async function waitForServiceHealth(service) {
  const maxAttempts = 30; // 最多等待30次，每次2秒
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const isHealthy = await service.healthCheck();
      if (isHealthy) {
        colorLog('green', service.name, '✅ 服务健康检查通过');
        serviceStatus.set(service.name, 'healthy');
        return;
      }
    } catch (error) {
      colorLog('yellow', service.name, `健康检查失败: ${error.message}`);
    }

    attempts++;
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (attempts % 5 === 0) {
      colorLog('yellow', service.name, `健康检查中... (${attempts}/${maxAttempts})`);
    }
  }

  throw new Error('健康检查超时');
}

// 处理服务失败
function handleServiceFailure(service, error) {
  colorLog('red', 'SYSTEM', `❌ 关键服务 ${service.name} 启动失败: ${error}`);
  colorLog('red', 'SYSTEM', '正在停止所有服务...');
  
  // 停止所有服务
  stopAllServices();
  
  // 显示详细错误信息
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.red}${colors.bright}服务启动失败详情${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`服务名称: ${service.name}`);
  console.log(`命令: ${service.command} ${service.args.join(' ')}`);
  console.log(`工作目录: ${service.cwd}`);
  console.log(`错误信息: ${error}`);
  console.log('='.repeat(80));
  
  process.exit(1);
}

// 停止所有服务
function stopAllServices() {
  colorLog('yellow', 'SYSTEM', '正在停止所有服务...');
  
  for (const [name, process] of serviceProcesses) {
    try {
      colorLog('yellow', name, '正在停止...');
      process.kill('SIGTERM');
      serviceStatus.set(name, 'stopped');
    } catch (error) {
      colorLog('red', name, `停止失败: ${error.message}`);
    }
  }
}

// 显示启动状态
function printStartupStatus() {
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.green}${colors.bright}🚀 StoryWeaver 开发环境启动状态${colors.reset}`);
  console.log('='.repeat(80));
  
  services.forEach(service => {
    const status = serviceStatus.get(service.name) || 'pending';
    const statusIcon = {
      'pending': '⏳',
      'starting': '🔄',
      'healthy': '✅',
      'failed': '❌',
      'stopped': '⏹️'
    }[status] || '❓';
    
    console.log(`${statusIcon} ${service.name.padEnd(12)} ${status.toUpperCase()}`);
  });
  
  console.log('='.repeat(80));
  
  const healthyServices = Array.from(serviceStatus.values()).filter(s => s === 'healthy').length;
  const totalServices = services.length;
  
  if (healthyServices === totalServices) {
    console.log(`${colors.green}${colors.bright}🎉 所有服务启动成功！${colors.reset}`);
    console.log(`${colors.cyan}📱 前端应用: http://localhost:3000${colors.reset}`);
    console.log(`${colors.green}🔌 后端API: http://localhost:3001${colors.reset}`);
    console.log(`${colors.blue}💾 数据库: localhost:5432${colors.reset}`);
    console.log('\n按 Ctrl+C 停止所有服务');
  } else {
    console.log(`${colors.yellow}⚠️  ${healthyServices}/${totalServices} 服务正常运行${colors.reset}`);
  }
  
  console.log('='.repeat(80) + '\n');
}

// 主函数
async function main() {
  console.log(`${colors.magenta}${colors.bright}`);
  console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          🎭 StoryWeaver 开发环境                              ║');
  console.log('║                        AI驱动的互动叙事游戏平台                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // 处理退出信号
  process.on('SIGINT', () => {
    colorLog('yellow', 'SYSTEM', '收到退出信号，正在停止所有服务...');
    stopAllServices();
    setTimeout(() => process.exit(0), 2000);
  });

  process.on('SIGTERM', () => {
    colorLog('yellow', 'SYSTEM', '收到终止信号，正在停止所有服务...');
    stopAllServices();
    setTimeout(() => process.exit(0), 2000);
  });

  try {
    // 并行启动所有服务
    const startPromises = services.map(service => startService(service));
    
    // 等待所有服务启动完成
    await Promise.allSettled(startPromises);
    
    // 显示最终状态
    printStartupStatus();
    
    // 保持进程运行
    await new Promise(() => {}); // 永远等待
    
  } catch (error) {
    colorLog('red', 'SYSTEM', `启动失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('启动脚本执行失败:', error);
    process.exit(1);
  });
}
