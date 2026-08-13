import fs from 'fs';
import path from 'path';
import { generateExtensionFiles } from '../src/utils/extensionCodeGenerator';

function buildExtension() {
  console.log('🚀 正在编译 Manifest V3 Chrome 插件...');

  const outDir = path.resolve(process.cwd(), 'dist-extension');

  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'assets/icons'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'assets/demo'), { recursive: true });

  const files = generateExtensionFiles();

  Object.entries(files).forEach(([filename, content]) => {
    const filePath = path.join(outDir, filename);
    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✓ 生成文件: ${filename}`);

    // Also copy README.md to root README.md and read.md
    if (filename === 'README.md') {
      fs.writeFileSync(path.resolve(process.cwd(), 'README.md'), content, 'utf-8');
      fs.writeFileSync(path.resolve(process.cwd(), 'read.md'), content, 'utf-8');
    }
  });

  // Copy icon.jpg to output directory
  const rootIconPath = path.resolve(process.cwd(), 'assets/icon.jpg');
  if (fs.existsSync(rootIconPath)) {
    fs.copyFileSync(rootIconPath, path.join(outDir, 'assets/icon.jpg'));
    fs.copyFileSync(rootIconPath, path.join(outDir, 'assets/icons/icon.jpg'));
    fs.copyFileSync(rootIconPath, path.join(outDir, 'assets/icons/icon128.png'));
    console.log('  ✓ 复制图标文件: assets/icon.jpg');
  }

  console.log('\n✅ 编译成功！插件目录已生成在: ./dist-extension');
  console.log('💡 使用说明：');
  console.log('  1. 打开 Chrome / Edge 浏览器，访问 chrome://extensions');
  console.log('  2. 开启右上角的 "开发者模式"');
  console.log('  3. 点击 "加载已解压的扩展程序"，选择目录: ./dist-extension');
}

buildExtension();
