import { Listr } from 'listr2'
import { addScriptToPackageJson, createBabelConfig, createLambdaFromTemplate, createLambdaPackageJson, createLambdaTestFromTemplate, createPackageJson, installDependencies, installLambdaDependencies } from './project-init.js'
import { createProjectDir, initGit, writeTerraformScript } from './utils.js'

export async function runTasks (options) {
  const tasks = new Listr([
    {
      title: 'Setting up project',
      task: (_, task) => {
        const subTasks = task.newListr([
          {
            title: 'Creating project directory',
            task: async (t, project) => {
              if (!options.projectName) {
                project.skip()
              }
              await createProjectDir(`${process.cwd()}/${options.projectName}`)
            }
          },
          {
            title: 'Creating lambda directory',
            task: async (t, project) => {
              if (!options.lambda) {
                project.skip()
              }
              await createProjectDir(
                `${process.cwd()}/${options.projectName}/${options.lambda}`
              )

              const lambdaTasks = project.newListr([
                {
                  title: 'Creating package.json',
                  task: async (t, lambda) => {
                    await createLambdaPackageJson(options)
                  }
                },
                {
                  title: 'Creating .babelrc file',
                  task: async (t, lambda) => {
                    await createBabelConfig(options)
                  }
                },
                {
                  title: 'Creating src directory',
                  task: async () => {
                    await createProjectDir(
                      `${process.cwd()}/${options.projectName}/${options.lambda}/src`
                    )
                  }
                },
                {
                  title: 'Copying lambda files',
                  task: async () => {
                    await createLambdaFromTemplate(options)
                  }
                },
                {
                  title: 'Creating test directory',
                  task: async () => {
                    await createProjectDir(
                      `${process.cwd()}/${options.projectName}/${options.lambda}/test`
                    )
                  }
                },
                {
                  title: 'Copying lambda test files',
                  task: async () => {
                    await createLambdaTestFromTemplate(options)
                  }
                },
                {
                  title: 'Installing lambda dependencies',
                  task: async () => {
                    await installLambdaDependencies(options)
                  }
                }
              ])

              await lambdaTasks.run()
            }
          },
          {
            title: 'Creating terraform directory',
            task: async (t, project) => {
              await createProjectDir(
                `${process.cwd()}/${options.projectName}/terraform`
              )

              const terraformScriptTask = project.newListr([
                {
                  title: 'Creating aws lambda function terraform script',
                  task: async () => writeTerraformScript(options, 'lambda')
                },
                {
                  title: 'Creating aws iam role terraform script',
                  task: async () => writeTerraformScript(options, 'iam')
                }
              ])

              terraformScriptTask.run()
            }
          },
          {
            title: 'Creating project package.json',
            task: async () => {
              await createPackageJson(options)
            }
          },
          {
            title: 'Updating scripts',
            task: async () => {
              await addScriptToPackageJson(options)
            }
          },
          {
            title: 'Installing dependencies',
            task: async () => {
              await installDependencies(options)
            }
          },
          {
            title: 'Initializing git',
            task: async () => {
              await initGit(options)
            }
          }
        ])

        subTasks.run()
      }
    }
  ])

  return tasks.run()
}
