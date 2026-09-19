module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove absolute paths from build
      webpackConfig.output.devtoolModuleFilenameTemplate = undefined;
      webpackConfig.output.devtoolFallbackModuleFilenameTemplate = undefined;
      
      // Remove source map references
      webpackConfig.devtool = false;
      
      // Remove webpack's default source map plugins
      webpackConfig.plugins = webpackConfig.plugins.filter(plugin => {
        return !plugin.constructor.name.includes('SourceMap');
      });
      
      // Override optimization to remove module names
      webpackConfig.optimization = {
        ...webpackConfig.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
      
      return webpackConfig;
    },
  },
};
