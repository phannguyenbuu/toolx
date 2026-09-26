process.env.NODE_ENV = 'production';

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const { ModuleFederationPlugin } = webpack.container;
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const packageJson = require('../package.json');

const targetModule = (process.argv[2] || 'render').toLowerCase();

const MODULE_REGISTRY = {
  render: {
    name: 'remote_render',
    title: 'Toolx Render Prepress & Color Studio',
    exposes: {
      './RenderPdfPage': path.resolve(__dirname, '../src/components/RenderPdfPage.tsx'),
    },
  },
  calc: {
    name: 'remote_calc',
    title: 'Toolx Price Calculator (Offset & Digital)',
    exposes: {
      './PriceCalculatorOffset': path.resolve(__dirname, '../src/components/PriceCalculatorOffset.tsx'),
      './PriceCalculatorDigital': path.resolve(__dirname, '../src/components/PriceCalculatorDigital.tsx'),
      './PaperPriceManager': path.resolve(__dirname, '../src/components/PaperPriceManager.tsx'),
    },
  },
  crm: {
    name: 'remote_crm',
    title: 'Toolx Business & CRM Suite',
    exposes: {
      './CustomersPage': path.resolve(__dirname, '../src/components/business/CustomersPage.tsx'),
      './QuotesPage': path.resolve(__dirname, '../src/components/business/QuotesPage.tsx'),
      './InvoicesPage': path.resolve(__dirname, '../src/components/business/InvoicesPage.tsx'),
      './OrdersPage': path.resolve(__dirname, '../src/components/business/OrdersPage.tsx'),
    },
  },
  imposition: {
    name: 'remote_imposition',
    title: 'Toolx Imposition & Packaging (Bình trang & Khuôn hộp)',
    exposes: {
      './ImpositionPage': path.resolve(__dirname, '../src/components/ImpositionPage.tsx'),
      './ImpositionAdvancedPage': path.resolve(__dirname, '../src/components/ImpositionAdvancedPage.tsx'),
      './DieCuttingPage': path.resolve(__dirname, '../src/components/DieCuttingPage.tsx'),
    },
  },
  designer: {
    name: 'remote_designer',
    title: 'Toolx Label & VDP Designer',
    exposes: {
      './LabelDesignerPage': path.resolve(__dirname, '../src/components/LabelDesignerPage.tsx'),
    },
  },
  admin: {
    name: 'remote_admin',
    title: 'Toolx Admin & Agent Jobs',
    exposes: {
      './AdminPage': path.resolve(__dirname, '../src/components/AdminPage.tsx'),
    },
  },
  ai: {
    name: 'remote_ai',
    title: 'Toolx AI Image Suite',
    exposes: {
      './AIImageProcessor': path.resolve(__dirname, '../src/components/ai/AIImageProcessor.tsx'),
    },
  },
};

const moduleConfig = MODULE_REGISTRY[targetModule];

if (!moduleConfig) {
  console.error(`\x1b[31m[ERROR] Module "${targetModule}" không tồn tại. Danh sách hỗ trợ: ${Object.keys(MODULE_REGISTRY).join(', ')}\x1b[0m`);
  process.exit(1);
}

console.log(`\n\x1b[36m🚀 [Module Federation] Bắt đầu build độc lập phân hệ: ${moduleConfig.title} (${moduleConfig.name})\x1b[0m`);

// Đảm bảo file shim entry tồn tại
const shimEntryPath = path.resolve(__dirname, '.remote-shim-entry.js');
if (!fs.existsSync(shimEntryPath)) {
  fs.writeFileSync(shimEntryPath, '// Micro-Frontend remote shim entry\nexport default {};\n');
}

const outputPath = path.resolve(__dirname, `../build/modules/${targetModule}`);
const publicPath = 'auto'; // Tự động nhận diện URL tại runtime

const webpackConfig = {
  mode: 'production',
  bail: true,
  devtool: false,
  target: 'web',
  entry: {
    main: shimEntryPath,
  },
  output: {
    path: outputPath,
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    publicPath: publicPath,
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        include: path.resolve(__dirname, '../src'),
        loader: require.resolve('swc-loader'),
        options: {
          jsc: {
            parser: {
              syntax: 'typescript',
              tsx: true,
              decorators: true,
            },
            transform: {
              react: {
                runtime: 'automatic',
                refresh: false,
              },
            },
            target: 'es2017',
          },
          module: {
            type: 'es6',
          },
          minify: false, // để Terser xử lý minify riêng
        },
      },
      {
        test: /\.css$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: require.resolve('css-loader'),
            options: {
              importLoaders: 1,
              sourceMap: false,
            },
          },
        ],
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/, /\.svg$/, /\.webp$/],
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 10000,
          },
        },
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: moduleConfig.name,
      filename: 'remoteEntry.js',
      exposes: moduleConfig.exposes,
      shared: {
        react: {
          singleton: true,
          requiredVersion: packageJson.dependencies.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: packageJson.dependencies['react-dom'],
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: packageJson.dependencies['react-router-dom'],
        },
        'lucide-react': {
          singleton: true,
        },
        'react-hot-toast': {
          singleton: true,
        },
        three: {
          singleton: true,
          requiredVersion: packageJson.dependencies.three,
        },
        '@react-three/fiber': {
          singleton: true,
          requiredVersion: packageJson.dependencies['@react-three/fiber'],
        },
        '@react-three/drei': {
          singleton: true,
          requiredVersion: packageJson.dependencies['@react-three/drei'],
        },
        zustand: {
          singleton: true,
          requiredVersion: packageJson.dependencies.zustand,
        },
      },
    }),
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash:8].css',
      chunkFilename: '[name].[contenthash:8].chunk.css',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
      'process.env.REACT_APP_API_URL': JSON.stringify(process.env.REACT_APP_API_URL || ''),
    }),
    new webpack.BannerPlugin({
      banner: 'if (typeof window !== "undefined" && !window.process) { window.process = { env: { NODE_ENV: "production" } }; }',
      raw: true,
      entryOnly: false,
    }),
  ],
  optimization: {
    minimize: true,
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  },
  performance: false,
};

const startTime = Date.now();

webpack(webpackConfig, (err, stats) => {
  if (err) {
    console.error('\x1b[31m[ERROR] Lỗi biên dịch Webpack:\x1b[0m', err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    process.exit(1);
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
    console.error('\x1b[31m[ERROR] Biên dịch thất bại với các lỗi sau:\x1b[0m');
    info.errors.forEach((e) => console.error(e.message || e));
    process.exit(1);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\x1b[32m✔ [Thành công] Đã build xong phân hệ "${moduleConfig.name}" trong ${duration}s!\x1b[0m`);
  console.log(`\x1b[34m📁 Output: ${outputPath}\x1b[0m`);

  // Liệt kê các file vừa sinh ra
  try {
    const files = fs.readdirSync(outputPath);
    console.log('\x1b[33mTệp artifact tạo ra:\x1b[0m');
    files.forEach((file) => {
      const size = (fs.statSync(path.join(outputPath, file)).size / 1024).toFixed(1);
      console.log(`  - ${file} (${size} KB)`);
    });

    // Đồng bộ sang public/modules để dev server có thể phục vụ ngay lập tức
    const publicDir = path.resolve(__dirname, `../public/modules/${targetModule}`);
    fs.mkdirSync(publicDir, { recursive: true });
    files.forEach((file) => {
      fs.copyFileSync(path.join(outputPath, file), path.join(publicDir, file));
    });
    console.log(`\x1b[35m✔ Đã đồng bộ ${files.length} tệp sang public/modules/${targetModule} (cho dev server)\x1b[0m`);
  } catch (syncErr) {
    console.warn('Lưu ý đồng bộ public:', syncErr.message);
  }
});
