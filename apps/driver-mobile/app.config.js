module.exports = ({ config }) => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const plugins = Array.isArray(config.plugins) ? [...config.plugins] : [];
  const withoutMapsPlugin = plugins.filter((plugin) => (
    typeof plugin === 'string'
      ? plugin !== 'react-native-maps'
      : plugin?.[0] !== 'react-native-maps'
  ));

  if (apiKey) {
    withoutMapsPlugin.push([
      'react-native-maps',
      { androidGoogleMapsApiKey: apiKey },
    ]);
  }

  return {
    ...config,
    plugins: withoutMapsPlugin,
  };
};
