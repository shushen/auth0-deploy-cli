import { constants } from 'auth0-source-control-extension-tools';

import dirHandler from '../../../src/context/directory/handlers/clients';
import yamlHandler from '../../../src/context/yaml/handlers/clients';
import { getStandardTests } from '../../utils';


const testSpec = {
  formats: [
    {
      name: 'directory',
      handler: dirHandler,
      subDir: constants.CLIENTS_DIRECTORY
    },
    {
      name: 'yaml',
      handler: yamlHandler
    }
  ],
  handlerType: 'clients',
  env: { AUTH0_KEYWORD_REPLACE_MAPPINGS: { appType: 'spa' } },
  import: {
    directory: {
      files: {
        'someClient.json': '{ "app_type": @@appType@@, "name": "someClient" }',
        'someClient2.json': '{ "app_type": @@appType@@, "name": "someClient2" }',
        'customLoginClient.json': '{ "app_type": @@appType@@, "name": "customLoginClient", "custom_login_page": "./customLoginClient_custom_login_page.html" }',
        'customLoginClient_custom_login_page.html': 'html code'
      }
    },
    yaml: {
      files: {
        'clients.yaml': `
      clients:
        -
          name: "someClient"
          app_type: @@appType@@
        -
          name: "someClient2"
          app_type: "##appType##"
        -
          name: "customLoginClient"
          app_type: "##appType##"
          custom_login_page: "./customLoginClient_custom_login_page.html"
      `
      }
    },
    expected: [
      { app_type: 'spa', name: 'customLoginClient', custom_login_page: 'html code' },
      { app_type: 'spa', name: 'someClient' },
      { app_type: 'spa', name: 'someClient2' }
    ]
  },
  export: {
    json: [
      { app_type: 'spa', name: 'someClient' },
      { app_type: 'spa', name: 'someClient2' },
      { app_type: 'spa', name: 'someClient-test' },
      { app_type: 'spa', name: 'someClient2/aa' },
      { app_type: 'spa', name: 'customLoginClient', custom_login_page: 'html code' }
    ],
    expected: {
      directory: {
        files: [
          {
            fileName: 'someClient.json',
            contentType: 'json',
            content: { app_type: 'spa', name: 'someClient' }
          },
          {
            fileName: 'someClient2.json',
            contentType: 'json',
            content: { app_type: 'spa', name: 'someClient2' }
          },
          {
            fileName: 'someClient-test.json',
            contentType: 'json',
            content: { app_type: 'spa', name: 'someClient-test' }
          },
          {
            fileName: 'someClient2-aa.json',
            contentType: 'json',
            content: { app_type: 'spa', name: 'someClient2/aa' }
          },
          {
            fileName: 'customLoginClient.json',
            contentType: 'json',
            content: { app_type: 'spa', name: 'customLoginClient', custom_login_page: './customLoginClient_custom_login_page.html' }
          },
          {
            fileName: 'customLoginClient_custom_login_page.html',
            contentType: 'html',
            content: 'html code'
          }
        ]
      },
      yaml: {
        json: [
          { app_type: 'spa', name: 'someClient' },
          { app_type: 'spa', name: 'someClient2' },
          { app_type: 'spa', name: 'someClient-test' },
          { app_type: 'spa', name: 'someClient2/aa' },
          { app_type: 'spa', name: 'customLoginClient', custom_login_page: './customLoginClient_custom_login_page.html' }
        ],
        files: [
          {
            fileName: 'customLoginClient_custom_login_page.html',
            contentType: 'html',
            content: 'html code'
          }
        ]
      }
    }
  }
};

describe.only('#resource clients', () => {
  testSpec.formats.forEach((format) => {
    getStandardTests(format).forEach((test) => {
      it(test.name, async () => {
        await test.func(format, testSpec);
      });
    });
  });
});
