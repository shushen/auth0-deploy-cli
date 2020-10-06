import fs from 'fs-extra';
import _ from 'lodash';
import rmdirSync from 'rmdir-sync';
import path from 'path';
import mkdirp from 'mkdirp';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import log from '../src/logger';
import dirContext from '../src/context/directory';
import yamlContext from '../src/context/yaml';
import { loadJSON } from '../src/utils';

log.transports.console.level = 'debug';

chai.use(chaiAsPromised);

export const localDir = 'local';
export const testDataDir = path.resolve(localDir, 'testData');


export function mockMgmtClient() {
  // Fake Mgmt Client. Bit hacky but good enough for now.
  return {
    rules: { getAll: () => ({ rules: [] }) },
    hooks: { getAll: () => [] },
    databases: { getAll: () => ({ databases: [] }) },
    connections: { getAll: () => ({ connections: [] }) },
    resourceServers: { getAll: () => ({ resourceServers: [] }) },
    rulesConfigs: { getAll: () => ({ rulesConfigs: [] }) },
    emailProvider: {
      get: () => ({
        name: 'smtp',
        enabled: true
      })
    },
    clientGrants: { getAll: () => ({ clientGrants: [] }) },
    guardian: {
      getFactors: () => [],
      getFactorProvider: () => [],
      getFactorTemplates: () => [],
      getPhoneFactorMessageTypes: () => ({ message_types: [ 'sms' ] }),
      getPhoneFactorSelectedProvider: () => ({ provider: 'twilio' }),
      getPolicies: () => []
    },
    emailTemplates: {
      get: template => ({
        template: template.name,
        enabled: true,
        body: 'fake template'
      })
    },
    clients: {
      getAll: (params) => {
        const client = {
          name: 'Global Client', client_id: 'FMfcgxvzLDvPsgpRFKkLVrnKqGgkHhQV', client_secret: 'dummy_client_secret', custom_login_page_on: true, custom_login_page: '<html>page</html>'
        };

        if (params.per_page) {
          return {
            clients: [ client ]
          };
        }

        return [ client ];
      }
    },
    roles: {
      getAll: () => (
        {
          roles: [
            {
              name: 'App Admin',
              id: 'myRoleId',
              description: 'Admin of app'
            }
          ],
          total: 1,
          limit: 50
        }
      ),
      permissions: {
        get: () => [
          {
            permission_name: 'create:data', resource_server_identifier: 'urn:ref'
          }
        ]
      }
    },
    tenant: {
      getSettings: () => ({
        friendly_name: 'Test',
        default_directory: 'users'
      })
    },
    migrations: {
      getMigrations: () => ({
        migration_flag: true
      })
    }
  };
}

export function cleanThenMkdir(dir) {
  try {
    rmdirSync(dir);
  } catch (err) {
    log.error(err);
  }
  mkdirp.sync(dir);
}


export function createDir(repoDir, files) {
  Object.keys(files).forEach((type) => {
    const configDir = path.resolve(repoDir, type);
    cleanThenMkdir(configDir);
    Object.entries(files[type]).forEach(([ name, content ]) => {
      fs.writeFileSync(path.join(configDir, name), content);
    });
  });
}

function createContext(format, config) {
  if (format.name === 'directory') {
    return new dirContext(config, mockMgmtClient());
  } else if (format.name === 'yaml') {
    return new yamlContext(config, mockMgmtClient());
  }
  throw Error('unsupported format');
}

async function caseValidateImport(format, spec) {
  const importSpec = spec.import[format.name];
  const files = { [format.subDir ? format.subDir : '.']: importSpec.files };
  const repoDir = fs.mkdtempSync(path.join(testDataDir, format.name + '-'));
  createDir(repoDir, files);

  const config = { AUTH0_INPUT_FILE: repoDir, ...spec.env };
  const context = createContext(format, config);
  await context.load();
  rmdirSync(repoDir);

  expect(context.assets[spec.handlerType]).to.deep.equal(spec.import.expected);
}

async function caseValidateImportIgnoreUnknown(format, spec) {
  const extraFileContents = {
    'README.md': 'something'
  };
  const updatedSpec = _.cloneDeep(spec);
  updatedSpec.import[format.name].files = {
    ...updatedSpec.import[format.name].files,
    ...extraFileContents
  };

  await caseValidateImport(format, updatedSpec);
}

async function caseValidateImportIgnoreNonDirectoryInput(format, spec) {
  const repoDir = fs.mkdtempSync(path.join(testDataDir, format + '-'));
  cleanThenMkdir(repoDir);
  const dir = path.join(repoDir, format.subDir);
  fs.writeFileSync(dir, 'junk');

  const config = { AUTH0_INPUT_FILE: repoDir, ...spec.env };
  const context = createContext(format, config);
  const errorMessage = `Expected ${dir} to be a folder but got a file?`;
  await expect(context.load())
    .to.be.eventually.rejectedWith(Error)
    .and.have.property('message', errorMessage);

  rmdirSync(repoDir);
}

async function caseValidateExport(format, spec) {
  const dir = fs.mkdtempSync(path.join(testDataDir, format + '-'));
  const context = createContext(format, { AUTH0_INPUT_FILE: dir });
  const typeFolder = path.join(dir, format.subDir);
  context.assets[spec.handlerType] = spec.export.json;
  await format.handler.dump(context);

  spec.export.expected[format.name].files.forEach((f) => {
    if (f.fileName === null) {
      expect(fs.pathExistsSync(typeFolder)).to.be.false;
    } else if (f.contentType === 'json') {
      expect(loadJSON(path.join(typeFolder, f.fileName))).to.deep.equal(f.content);
    } else {
      expect(fs.readFileSync(path.join(typeFolder, f.fileName), 'utf8')).to.deep.equal(f.content);
    }
  });
  rmdirSync(dir);
}

async function caseValidateExportUndefined(format, spec) {
  var updatedSpec = _.cloneDeep(spec);
  delete updatedSpec.export.json;
  updatedSpec.export.expected[format.name].files = [ { fileName: null } ];
  await caseValidateExport(format, updatedSpec);
}

export function getStandardTests(format) {
  const tests = [
    {
      name: 'should process import',
      func: caseValidateImport
    },
    {
      name: 'should ignore unknown file',
      func: caseValidateImportIgnoreUnknown
    },
    {
      name: 'should ignore non-directory input',
      func: caseValidateImportIgnoreNonDirectoryInput
    },
    {
      name: 'should export with snaitized file name',
      func: caseValidateExport
    },
    {
      name: 'should skip undefined assets',
      func: caseValidateExportUndefined
    }
  ];
  return tests.map(test => ({
    name: format.name + ' - ' + test.name,
    func: test.func
  }));
}
