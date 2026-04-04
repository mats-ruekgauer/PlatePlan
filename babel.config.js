module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // NativeWind v4 requires jsxImportSource instead of the nativewind/babel plugin
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      // Reanimated must be last
      'react-native-reanimated/plugin',
    ],
  };
};
