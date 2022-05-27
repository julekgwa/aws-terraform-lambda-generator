import * as init from '../../src/project/init';
import * as utils from '../../src/helpers/utils.js';
import {jest} from '@jest/globals';
import fs from 'fs';
import mock from 'mock-fs';
// import {execa} from 'execa';

jest.mock('execa');

describe('Given init.js', () => {
  beforeEach(() => {
    // ((execa as unknown) as jest.Mock).mockClear();
    // (execa.sync as jest.Mock).mockClear();
    mock({
      directory: {
        'text.txt': 'Hi!'
      },
      orders: {
        'package.json': '{"scripts": "{}"}',
        'src': {},
        'lab': {
          'package.json': '{"scripts": "{}"}'
        },
        'test': {}
      },
      terraform: {
        'aws_sfn_state_machine.tf':
          utils.config.terraform.aws_sfn_state_machine.replace(
              ':lambda_name',
              'lab'
          )
      },
      proj: {
        terraform: {
          'archive.tf': utils.config.terraform.archive.replace(
              ':lambda_name',
              'lab'
          )
        }
      },
      lab: {
        terraform: {
          'archive.tf': utils.config.terraform.archive.replace(
              ':lambda_name',
              'lab'
          ),
          'aws_lambda_function.tf':
            utils.config.terraform.aws_lambda_function.replace(
                ':lambda_name',
                'lab3'
            )
        }
      },
      test: {
        'note.md': 'hello world!',
        'lab': {
          'package.json': 'test'
        }
      }
    });
  });
  describe('And install function  is called', () => {
    it('should execute execa', async () => {
      const result = await init.createPackageJson({
        path: 'lab',
        lambda: 'lab',
        projectName: '',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      });

      expect(result.failed).toBe(false);
    });
  });

  describe('And createLambdaPackageJson is called', () => {
    it('should create lambda package json file', async () => {
      await init.createLambdaPackageJson({
        path: 'lab',
        lambda: 'lab',
        projectName: 'orders',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      }, 'lab', utils.config);

      expect(await fs.existsSync('lab/package.json')).toBe(true);
    });
  });

  describe('And addScriptToPackageJson is called', () => {
    it('should add script to package json file', async () => {
      await init.addScriptToPackageJson({
        path: 'lab',
        lambda: 'lab',
        projectName: 'orders',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      });

      const s = (await fs.promises.readFile('orders/package.json')).toString();

      expect(s).toContain('build');
    });
  });

  describe('And createLambdaFromTemplate is called', () => {
    it('should create a lambda from a template', async () => {
      await init.createLambdaFromTemplate({
        path: 'lab',
        lambda: 'lab',
        projectName: 'orders',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      }, 'orders', utils.config);

      expect(await fs.existsSync('orders/src/handlers.js')).toBe(true);
    });
  });

  describe('And createLambdaTestFromTemplate is called', () => {
    it('should create a lambda from a template', async () => {
      await init.createLambdaTestFromTemplate({
        path: 'lab',
        lambda: 'lab',
        projectName: 'orders',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      }, 'orders', utils.config);

      expect(await fs.existsSync('orders/test/handlers.test.js')).toBe(true);
    });
  });

  describe('And createBabelConfig is called', () => {
    it('should create babel rc file', async () => {
      await init.createBabelConfig('orders', utils.config);

      expect(await fs.existsSync('orders/.babelrc')).toBe(true);
    });
  });

  describe('And createGitIgnore is called', () => {
    it('should create babel rc file', async () => {
      await init.createGitIgnore({
        path: 'lab',
        lambda: 'lab',
        projectName: 'orders',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      }, utils.config);

      expect(await fs.existsSync('orders/.gitignore')).toBe(true);
    });

    describe('And project name is undefined', () => {
      it('should return undefined', async () => {
        const r = await init.createGitIgnore({
          path: 'lab',
          lambda: 'lab',
          projectName: '',
          region: 'af',
          sfnList: [
            {name: 'test', next: 'Next'},
            {name: 'failed', next: 'Next'}
          ]
        }, utils.config);

        expect(r).toBe(undefined);
      });
    });
  });

  describe('And createLernaFile is called', () => {
    it('should create lerna file', async () => {
      await init.createLernaFile({
        path: 'lab',
        lambda: 'lab',
        projectName: 'orders',
        region: 'af',
        sfnList: [
          {name: 'test', next: 'Next'},
          {name: 'failed', next: 'Next'}
        ]
      }, utils.config);

      expect(await fs.existsSync('orders/lerna.json')).toBe(true);
    });
  });

  describe('And modifyPackageFile is called', () => {
    it('should modify package.json file', async () => {
      await init.modifyPackageFile('orders', 'orders', 'lab');

      expect(await fs.existsSync('orders/lab/package.json')).toBe(true);
    });
  });

  afterEach(() => {
    mock.restore();
    jest.clearAllMocks();
  });
});
