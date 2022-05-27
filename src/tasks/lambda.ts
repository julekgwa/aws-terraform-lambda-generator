import { execa } from 'execa'
import { Listr } from 'listr2'
import { createProjectDir, moveTerraScript, writeTerraformScript } from '../helpers/utils'
import {
  createBabelConfig,
  createLambdaFromTemplate,
  createLambdaPackageJson,
  createLambdaTestFromTemplate,
  installLambdaDependencies,
  installLambdaDevDependencies,
  modifyPackageFile
} from '../project/init'
import { Config, Options } from '../types/types'
import { initializeProjectTasks } from './project'

const createTerraformScripts = async (options: Options, config: Config, path: string, task: any) => {
  await createProjectDir(`${path}/terraform`)
  const resources = ['aws_lambda_function', 'aws_s3_bucket', 'aws_s3_bucket_object', 'aws_iam_role', 'provider', 'variables', 'aws_iam_role_policy_attachment', 'aws_iam_policy']

  return task.newListr([
    {
      title: 'Copying lambda files',
      task: async () => {
        for (const resource of resources) {
          await writeTerraformScript({ ...options, path }, resource, config)
        }
      }
    }
  ])
}

export const createLambdaTasks = (options: Options, config: Config) => {
  let lambdaPath = `${process.cwd()}/${options.lambda}`
  let terraformPath = process.cwd()

  if (options.new) {
    terraformPath = `${process.cwd()}/${options.projectName}`
    lambdaPath = `${process.cwd()}/${options.projectName}/packages/${
      options.lambda
    }`
  }

  if (options.currentProjectDir) {
    lambdaPath = `${process.cwd()}/packages/${options.lambda}`
  }

  return new Listr([
    {
      title: 'Creating lambda directory',
      task: async (p, project) => {
        project.output = 'I will push an output. [0]'
        if (!options.lambda) {
          project.skip()
        }
        await createProjectDir(lambdaPath)

        const lambdaTasks = project.newListr([
          {
            title: 'Creating package.json',
            task: async () => {
              await createLambdaPackageJson(options, lambdaPath, config)
            }
          },
          {
            title: 'Creating .babelrc file',
            task: async () => {
              await createBabelConfig(lambdaPath, config)
            }
          },
          {
            title: 'Creating src directory',
            task: async (_, src) => {
              await createProjectDir(`${lambdaPath}/src`)

              await src
                .newListr([
                  {
                    title: 'Creating handlers.js file',
                    task: async () => {
                      await createLambdaFromTemplate(
                        options,
                        lambdaPath,
                        config
                      )
                    }
                  }
                ])
                .run()
            }
          },
          {
            title: 'Creating terraform directory and scripts',
            task: async (t, terraformTask) => {
              const task = await createTerraformScripts(options, config, terraformPath, terraformTask)

              await task.run()
            }
          },
          {
            title: 'Creating test directory',
            task: async () => {
              await createProjectDir(`${lambdaPath}/test`)
            }
          },
          {
            title: 'Copying lambda test files',
            task: async () => {
              await createLambdaTestFromTemplate(options, lambdaPath, config)
            }
          },
          {
            title: 'Installing lambda dependencies',
            task: async () => {
              await installLambdaDependencies(lambdaPath)
            }
          },
          {
            title: 'Installing lambda dev dependencies',
            task: async () => {
              await installLambdaDevDependencies(lambdaPath)
            }
          }
        ])

        await lambdaTasks.run()
      }
    }
  ])
}

export const moveLambdasIntoOneProject = (lambdas: string[], options: Options, config: Config) => {
  return new Listr([
    {
      title: 'Moving lambdas into one project',
      skip: () => {
        if (lambdas.length === 0) {
          return 'No lambdas found'
        }
        return false
      },
      task: async (t, task) => {
        await createProjectDir(`${process.cwd()}/${options.projectName}/packages`)
        await execa('mv', [`${process.cwd()}/terraform`, `${process.cwd()}/${options.projectName}/`])

        const initProjectTasks = await initializeProjectTasks(task, options, config)

        await initProjectTasks.run()

        for (const lambda of lambdas) {
          const result = await execa('mv', [`${process.cwd()}/${lambda}`, `${process.cwd()}/${options.projectName}/packages/`])

          if (result.failed) {
            throw new Error('Failed to move lambda')
          }

          await moveTerraScript(`${process.cwd()}/${options.projectName}/terraform/aws_lambda_function.tf`, `../${lambda}`, '../packages/')
          await moveTerraScript(`${process.cwd()}/${options.projectName}/terraform/aws_s3_bucket_object.tf`, `../${lambda}`, '../packages/')
          await modifyPackageFile(`${process.cwd()}/${options.projectName}/packages`, options.projectName || '', lambda)
        }
      }
    }
  ])
}
