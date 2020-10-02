import { constants } from 'auth0-source-control-extension-tools';

import handler from '../../../src/context/directory/handlers/clientGrants';
import { standardTests } from '../../utils';

const testSpec = {
  handler: handler,
  handlerType: 'clientGrants',
  handlerDir: constants.CLIENTS_GRANTS_DIRECTORY,
  env: { AUTH0_KEYWORD_REPLACE_MAPPINGS: { var: 'something' } },
  import: {
    files: {
      'test.json': `
    {
      "client_id": "auth0-webhooks",
      "audience": "https://test.auth0.com/api/v2/",
      "scope": [
        "read:logs"
      ],
      "var": @@var@@
    }`
    },
    expected: [
      {
        audience: 'https://test.auth0.com/api/v2/',
        client_id: 'auth0-webhooks',
        scope: [ 'read:logs' ],
        var: 'something'
      }
    ]
  },
  export: {
    json: [
      {
        audience: 'https://test.myapp.com/api/v1',
        client_id: 'My M2M',
        scope: [ 'update:account' ]
      }
    ],
    expected: [
      {
        fileName: 'My M2M (https---test.myapp.com-api-v1).json',
        contentType: 'json',
        content: {
          audience: 'https://test.myapp.com/api/v1',
          client_id: 'My M2M',
          scope: [ 'update:account' ]
        }
      }
    ]
  }
};


describe('#directory context clientGrants', () => {
  Object.keys(standardTests).forEach((test) => {
    it(test, async () => {
      await standardTests[test](testSpec);
    });
  });
});
