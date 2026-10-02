const { withMainApplication } = require('@expo/config-plugins');
const {
  mergeContents,
} = require('@expo/config-plugins/build/utils/generateCode');

const IMPORTS_ANCHOR = /^import expo\.modules\.ExpoReactHostFactory$/m;
const ON_CREATE_ANCHOR = /^\s*loadReactNative\(this\)$/m;

const IMPORTS_SRC = [
  'import com.facebook.react.modules.network.OkHttpClientProvider',
  'import okhttp3.Protocol',
].join('\n');

const FACTORY_SRC = [
  '    OkHttpClientProvider.setOkHttpClientFactory {',
  '      OkHttpClientProvider.createClientBuilder(this)',
  '        .protocols(listOf(Protocol.HTTP_1_1))',
  '        .build()',
  '    }',
].join('\n');

const withHttp1Pin = (config) =>
  withMainApplication(config, (mainApplicationConfig) => {
    let contents = mainApplicationConfig.modResults.contents;

    contents = mergeContents({
      src: contents,
      newSrc: IMPORTS_SRC,
      anchor: IMPORTS_ANCHOR,
      offset: 1,
      tag: 'http1-pin-imports',
      comment: '//',
    }).contents;

    contents = mergeContents({
      src: contents,
      newSrc: FACTORY_SRC,
      anchor: ON_CREATE_ANCHOR,
      offset: 0,
      tag: 'http1-pin-factory',
      comment: '//',
    }).contents;

    mainApplicationConfig.modResults.contents = contents;
    return mainApplicationConfig;
  });

module.exports = withHttp1Pin;
