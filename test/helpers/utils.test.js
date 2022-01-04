import * as utils from '../../src/helpers/utils.js'
import fs from 'fs'
import mock from 'mock-fs'

// console.log(typeof fn['execa'])

describe('Given utils', () => {
  beforeEach(() => {
    mock({
      directory: {
        'text.txt': 'Hi!'
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
        lab: {
          'package.json': 'test'
        }
      }
    })
  })

  describe('and camelToUnderscore is called', () => {
    describe('and key parameter is missing', () => {
      it('should return undefined', () => {
        expect(utils.camelToUnderscore()).toEqual(undefined)
      })
    })

    describe('and key is provided', () => {
      it('should return underscore string', () => {
        expect(utils.camelToUnderscore('testWithJest')).toEqual(
          'test_with_jest'
        )
      })
    })
  })

  describe('and createProjectDir is called', () => {
    describe('and directory already exists', () => {
      it('should not create a directory if one already exists', async () => {
        expect(await utils.createProjectDir('directory')).toEqual(undefined)
      })
    })

    describe("and directory doesn't exists", () => {
      it('should create the directory', async () => {
        await utils.createProjectDir('direct')
        expect(await fs.existsSync('direct')).toBe(true)
      })
    })
  })

  describe('and isInProjectRoot is called', () => {
    describe('and we are not in the project directory', () => {
      it('should return false', async () => {
        expect(await utils.isInProjectRoot()).toBe(false)
      })
    })
  })

  describe('and getDirectories is called', () => {
    it('should list all dirs', async () => {
      const dir = await utils.getDirectories('test')

      expect(dir.length).toBeTruthy()
    })
  })

  describe('and getLambdaDirectories is called', () => {
    it('should list all dirs', async () => {
      const dir = await utils.getLambdaDirectories('test')

      expect(dir.length).toEqual(1)
    })
  })

  describe('and validateInput is called', () => {
    describe('and input value is invalid', () => {
      it('should return validation message', () => {
        expect(utils.validateInput(' ')).toBe(
          'Project name may only include letters, numbers, underscores and hashes.'
        )
      })
    })

    describe('and provided input is valid', () => {
      it('should return true', () => {
        expect(utils.validateInput('test')).toBe(true)
      })
    })
  })

  describe('and createStateMachineJSON is call', () => {
    it('should return json object', () => {
      const json = utils.createStateMachineJSON([
        { name: 'lab', next: 'Next' },
        { name: 'test', next: 'Next' }
      ])

      expect(json.StartAt).toEqual('Lab')
    })
  })

  describe('and writeTerraformScript is called', () => {
    describe('and valid params are passed', () => {
      it('should write terraform script', async () => {
        await utils.writeTerraformScript(
          {
            path: 'lab',
            lambda: 'lab'
          },
          'provider',
          utils.config
        )

        expect(fs.existsSync('./lab/terraform/provider.tf')).toBe(true)
      })
    })

    describe('and script has already been written', () => {
      it('should not write the script', async () => {
        expect(
          await utils.writeTerraformScript(
            {
              lambda: 'lab',
              projectName: 'proj',
              currentProjectDir: true
            },
            'archive',
            utils.config
          )
        ).toBe(undefined)
      })
    })

    describe('and the file contents are empty', () => {
      it('should not write the file', async () => {
        expect(
          await utils.writeTerraformScript(
            {
              path: 'lab',
              lambda: 'lab'
            },
            'invalid',
            utils.config
          )
        ).toBe(undefined)
      })
    })

    describe('and the file exists already', () => {
      it('should append data to the file', async () => {
        expect(
          await utils.writeTerraformScript(
            {
              path: 'lab',
              lambda: 'lab'
            },
            'aws_lambda_function',
            utils.config
          )
        ).toBe(undefined)
      })
    })

    describe('and something goes wrong', () => {
      it('should throw an error', async () => {
        try {
          await utils.writeTerraformScript(
            {
              path: 'lab',
              lambda: undefined
            },
            'aws_lambda_function',
            utils.config
          )
        } catch (e) {
          expect(e).toBeInstanceOf(Error)
        }
      })
    })
  })

  describe('and moveTerraScript is called', () => {
    it('should move the script', async () => {
      expect(
        await utils.moveTerraScript('test/note.md', 'hello', 'hi')
      ).toEqual(undefined)
    })
  })

  describe('and createTerraformSfn is called', () => {
    it('should create a state machine', async () => {
      expect(
        await utils.createTerraformSfn(
          {
            lambda: 'lab',
            projectName: 'proj',
            currentProjectDir: false,
            sfnList: [
              { name: 'test', next: 'Next' },
              { name: 'failed', next: 'Next' }
            ]
          },
          'aws_sfn_state_machine',
          utils.config
        )
      ).toEqual(undefined)
    })

    describe('and script has already been written', () => {
      it('should not write the script', async () => {
        expect(
          await utils.createTerraformSfn(
            {
              lambda: 'lab',
              projectName: 'proj',
              currentProjectDir: true,
              sfnList: [
                { name: 'test', next: 'Next' },
                { name: 'failed', next: 'Next' }
              ]
            },
            'aws_sfn_state_machine',
            utils.config
          )
        ).toBe(undefined)
      })
    })
  })

  afterEach(async () => {
    mock.restore()
  })
})
