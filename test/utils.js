import fs from 'fs-extra';
import rmdirSync from 'rmdir-sync';
import path from 'path';
import mkdirp from 'mkdirp';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import log from '../src/logger';
import dirContext from '../src/context/directory';
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

async function caseValidateImport(spec) {
  const files = { [spec.handlerDir]: spec.import.files };
  const repoDir = fs.mkdtempSync(path.join(testDataDir, 'directory-'));
  createDir(repoDir, files);

  const config = { AUTH0_INPUT_FILE: repoDir, ...spec.env };
  const context = new dirContext(config, mockMgmtClient());
  await context.load();
  rmdirSync(repoDir);

  expect(context.assets[spec.handlerType]).to.deep.equal(spec.import.expected);
}

async function caseValidateImportIgnoreUnknown(spec) {
  const extraFileContents = {
    'README.md': 'something'
  };
  await caseValidateImport({
    ...spec,
    ...{
      import: { ...spec.import, files: { ...spec.import.files, ...extraFileContents } }
    }
  });
}

async function caseValidateImportIgnoreNonDirectoryInput(spec) {
  const repoDir = fs.mkdtempSync(path.join(testDataDir, 'directory-'));
  cleanThenMkdir(repoDir);
  const dir = path.join(repoDir, spec.handlerDir);
  fs.writeFileSync(dir, 'junk');

  const config = { AUTH0_INPUT_FILE: repoDir, ...spec.env };
  const context = new dirContext(config, mockMgmtClient());
  const errorMessage = `Expected ${dir} to be a folder but got a file?`;
  await expect(context.load())
    .to.be.eventually.rejectedWith(Error)
    .and.have.property('message', errorMessage);

  rmdirSync(repoDir);
}

async function caseValidateExport(spec) {
  const dir = fs.mkdtempSync(path.join(testDataDir, 'directory-'));
  const context = new dirContext({ AUTH0_INPUT_FILE: dir }, mockMgmtClient());
  const typeFolder = path.join(dir, spec.handlerDir);
  context.assets[spec.handlerType] = spec.export.json;
  await spec.handler.dump(context);

  spec.export.expected.forEach((f) => {
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

async function caseValidateExportUndefined(spec) {
  await caseValidateExport({
    ...spec,
    ...{
      export: { expected: [ { fileName: null } ] }
    }
  });
}

export const standardTests = {
  'should process import': caseValidateImport,
  'should ignore unknown file': caseValidateImportIgnoreUnknown,
  'should ingore non-directory input': caseValidateImportIgnoreNonDirectoryInput,
  'should export with snaitized file name': caseValidateExport,
  'should skip undefined assets': caseValidateExportUndefined
};
