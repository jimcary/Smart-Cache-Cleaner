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

    // Also copy README.md to root README.md
    if (filename === 'README.md') {
      fs.writeFileSync(path.resolve(process.cwd(), 'README.md'), content, 'utf-8');
    }
  });

  // Copy valid PNG and JPG icons to output directory
  const rootIconJpg = path.resolve(process.cwd(), 'assets/icon.jpg');
  if (fs.existsSync(rootIconJpg)) {
    fs.copyFileSync(rootIconJpg, path.join(outDir, 'assets/icon.jpg'));
    fs.copyFileSync(rootIconJpg, path.join(outDir, 'assets/icons/icon.jpg'));
  }

  const sizes = [16, 32, 48, 128];
  sizes.forEach((size) => {
    const srcPng = path.resolve(process.cwd(), `src/assets/icons/icon${size}.png`);
    const rootPng = path.resolve(process.cwd(), `assets/icons/icon${size}.png`);
    const targetPath = path.join(outDir, `assets/icons/icon${size}.png`);
    
    if (fs.existsSync(srcPng)) {
      fs.copyFileSync(srcPng, targetPath);
      // Sync to root assets/icons as well
      fs.copyFileSync(srcPng, rootPng);
    } else if (fs.existsSync(rootPng)) {
      fs.copyFileSync(rootPng, targetPath);
    }
  });

  const srcRootPng = path.resolve(process.cwd(), 'src/assets/icons/icon.png');
  const rootIconPng = path.resolve(process.cwd(), 'assets/icon.png');
  if (fs.existsSync(srcRootPng)) {
    fs.copyFileSync(srcRootPng, path.join(outDir, 'assets/icon.png'));
    fs.copyFileSync(srcRootPng, rootIconPng);
  } else if (fs.existsSync(rootIconPng)) {
    fs.copyFileSync(rootIconPng, path.join(outDir, 'assets/icon.png'));
  }

  // Copy demo images to output directory
  const demoDir = path.resolve(process.cwd(), 'assets/demo');
  if (fs.existsSync(demoDir)) {
    const demoFiles = fs.readdirSync(demoDir);
    demoFiles.forEach((file) => {
      fs.copyFileSync(path.join(demoDir, file), path.join(outDir, 'assets/demo', file));
    });
  }

  console.log('  ✓ 成功复制全尺寸 Chrome 原生 PNG 图标 (16/32/48/128) 与交互演示图');

  console.log('\n✅ 编译成功！插件目录已生成在: ./dist-extension');
  console.log('💡 使用说明：');
  console.log('  1. 打开 Chrome / Edge 浏览器，访问 chrome://extensions');
  console.log('  2. 开启右上角的 "开发者模式"');
  console.log('  3. 点击 "加载已解压的扩展程序"，选择目录: ./dist-extension');
}

buildExtension();
