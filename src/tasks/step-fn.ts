import { Listr } from 'listr2'
import { createTerraformSfn, writeTerraformScript } from '../helpers/utils'
import { Config, Options } from '../types/types'

export const createStateMachineTasks = (options: Options, config: Config) => {
  let terraformPath = `${process.cwd()}/${options.projectName}`

  if (options.currentProjectDir) {
    terraformPath = process.cwd()
  }
  return new Listr([
    {
      title: 'Creating aws sfn state machine terraform script',
      task: async () =>
        createTerraformSfn(options, 'aws_sfn_state_machine', config)
    },
    {
      title: 'Creating aws iam policy document terraform script',
      task: async () =>
        writeTerraformScript(
          { ...options, path: terraformPath },
          'aws_iam_policy_document',
          config
        )
    },
    {
      title: 'Creating aws iam policy document terraform script',
      task: async () =>
        writeTerraformScript(
          { ...options, path: terraformPath },
          'aws_iam_policy_document',
          config,
          '_sfn'
        )
    },
    {
      title: 'Creating aws iam policy document terraform script',
      task: async () =>
        writeTerraformScript(
          { ...options, path: terraformPath },
          'aws_iam_policy',
          config,
          '_sfn'
        )
    },
    {
      title: 'Creating aws iam policy document terraform script',
      task: async () =>
        writeTerraformScript(
          { ...options, path: terraformPath },
          'aws_iam_role_policy_attachment',
          config,
          '_sfn'
        )
    },
    {
      title: 'Creating aws iam policy terraform script',
      task: async () =>
        writeTerraformScript(
          { ...options, path: terraformPath },
          'aws_iam_role',
          config,
          '_sfn'
        )
    }
  ])
}
