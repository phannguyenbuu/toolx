const { createProxyMiddleware } = require('http-proxy-middleware');
const express = require('express');
const path = require('path');

module.exports = function(app) {
  // Phục vụ các phân hệ Module Federation đã build ngay trong môi trường dev
  app.use('/modules', express.static(path.resolve(__dirname, '../build/modules')));

  // Python service routes (port 3005) - use exact path matching with router
  const pythonPaths = [
    '/calculate',
    '/generate-pdf', 
    '/generate-pdf-async',
    '/task',
    '/generate-svg',
    '/render-preview',
    '/validate-file',
    '/inpaint',
    '/inpaint/status',
    '/outpaint',
    '/outpaint-bleed',
    '/remove-bg',
    '/export-pdf',
    '/replace-images',
    '/icc-profiles',  // Add ICC profiles endpoint
    '/python-health',  // Python-specific health check
    '/upload-source',
    '/upload-source-batch',
    '/delete-source',
    '/init-chunked-upload',
    '/upload-chunk',
    '/finalize-upload',
    '/preview',
    '/render-sheet-preview',
    '/nest-svg'
  ];

  // Python path patterns (for dynamic routes like /task/{id})
  const pythonPathPatterns = [
    /^\/task\/[^\/]+$/,           // /task/{id}
    /^\/task\/[^\/]+\/download$/,  // /task/{id}/download
    /^\/delete-source\/[^\/]+$/   // /delete-source/{file_id}
  ];

  // Express server routes (port 3003) - Fixed port from 3002 to 3003
  const expressPaths = [
    '/fonts',
    '/sessions',
    '/sync-session',
    '/print'
  ];

  // Backend NestJS routes (port 3001) - explicitly define backend routes
  const backendPaths = [
    '/health',
    '/auth',
    '/users',
    '/plans',
    '/projects',
    '/wallet',
    '/files',
    '/worker',
    '/activity-log',
    '/business'  // Add business routes
  ];

  // Socket.io proxy with WebSocket support (port 3003)
  app.use('/socket.io', createProxyMiddleware({
    target: 'http://157.66.80.125:3003',
    changeOrigin: true,
    ws: true, // Enable WebSocket proxying
    logLevel: 'debug',
    onProxyReqWs: (proxyReq, req, socket) => {
      console.log('[SOCKET.IO PROXY] WebSocket request:', req.url);
    },
    onError: (err, req, res) => {
      console.error('[SOCKET.IO PROXY] Error:', err.message);
    }
  }));

  // Toolx Render Agent Backend (128GB RAM Vector System on port 8006)
  app.use('/render-agent', createProxyMiddleware({
    target: 'http://157.66.80.125:8006',
    changeOrigin: true,
    pathRewrite: {
      '^/render-agent': ''
    },
    onError: (err, req, res) => {
      console.error('[RENDER-AGENT PROXY] Error:', err.message);
    }
  }));

  // API proxy middleware that routes based on path
  app.use('/api', createProxyMiddleware({
    target: 'http://157.66.80.125:3001', // default target (Backend NestJS)
    changeOrigin: true,
    router: (req) => {
      const path = req.path;
      console.log(`[API PROXY] ${req.method} ${path}`);
      
      // Check Backend routes first (explicit routing)
      if (backendPaths.some(backendPath => path.startsWith(backendPath))) {
        console.log(`[API PROXY] Routing to Backend NestJS: http://157.66.80.125:3001`);
        return 'http://157.66.80.125:3001';
      }
      
      // Check Python routes (exact match)
      if (pythonPaths.includes(path)) {
        console.log(`[API PROXY] Routing to Python: http://157.66.80.125:3005`);
        return 'http://157.66.80.125:3005';
      }
      
      // Check Python path patterns (dynamic routes)
      if (pythonPathPatterns.some(pattern => pattern.test(path))) {
        console.log(`[API PROXY] Routing to Python (pattern): http://157.66.80.125:3005`);
        return 'http://157.66.80.125:3005';
      }
      
      // Check Express routes
      if (expressPaths.includes(path)) {
        console.log(`[API PROXY] Routing to Express: http://157.66.80.125:3003`);
        return 'http://157.66.80.125:3003';
      }
      
      // Default to NestJS (port 3001)
      console.log(`[API PROXY] Routing to NestJS (default): http://157.66.80.125:3001`);
      return 'http://157.66.80.125:3001';
    },
    pathRewrite: (path, req) => {
      // For Python and Express routes, keep /api prefix
      const isPythonPath = pythonPaths.includes(path) || pythonPathPatterns.some(pattern => pattern.test(path));
      const isExpressPath = expressPaths.includes(path);
      
      if (isPythonPath || isExpressPath) {
        return '/api' + path; // restore /api prefix
      }
      
      // For NestJS, KEEP /api prefix (NestJS routes are /api/auth, /api/user, etc.)
      return '/api' + path; // restore /api prefix for NestJS too
    }
  }));
};
