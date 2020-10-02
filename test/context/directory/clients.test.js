import { constants } from 'auth0-source-control-extension-tools';

import handler from '../../../src/context/directory/handlers/clients';
import { standardTests } from '../../utils';

const testSpec = {
  handler: handler,
  handlerType: 'clients',
  handlerDir: constants.CLIENTS_DIRECTORY,
  env: { AUTH0_KEYWORD_REPLACE_MAPPINGS: { appType: 'spa' } },
  import: {
    files: {
      'someClient.json': '{ "app_type": @@appType@@, "name": "someClient" }',
      'someClient2.json': '{ "app_type": @@appType@@, "name": "someClient2" }',
      'customLoginClient.json': '{ "app_type": @@appType@@, "name": "customLoginClient", "custom_login_page": "./customLoginClient_custom_login_page.html" }',
      'customLoginClient_custom_login_page.html': 'html code'
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
    expected: [
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
  }
};

describe('#directory context clients', () => {
  Object.keys(standardTests).forEach((test) => {
    it(test, async () => {
      await standardTests[test](testSpec);
    });
  });
});
