const pinHttp1 = process.env.PIN_HTTP1 === '1';

module.exports = ({ config }) => ({
  ...config,
  name: pinHttp1 ? 'Edge Repro (h1)' : 'Edge Repro (h2)',
  slug: 'edge-h2-repro',
  android: {
    ...config.android,
    package: pinHttp1 ? 'com.colaquecez.edgerepro.h1' : 'com.colaquecez.edgerepro.h2',
  },
  ios: {
    ...config.ios,
    bundleIdentifier: pinHttp1 ? 'com.colaquecez.edgerepro.h1' : 'com.colaquecez.edgerepro.h2',
  },
  plugins: [...(config.plugins ?? []), ...(pinHttp1 ? ['./plugins/withHttp1Pin'] : [])],
});
