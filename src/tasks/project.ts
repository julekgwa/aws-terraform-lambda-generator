import { Listr } from 'listr2'
import { createProjectDir, initGit } from '../helpers/utils'
import { addScriptToPackageJson, createGitIgnore, createLernaFile, createPackageJson, installDependencies } from '../project/init'
import { Config, Options } from '../types/types'

export const initializeProjectTasks = async (task: any, options: Options, config: Config) => {
  return task.newListr([
    {
      title: 'Creating .gitignore file',
      task: async () => {
        await createGitIgnore(options, config)
      }
    },
    {
      title: 'Creating lerna json file',
      task: async () => {
        await createLernaFile(options, config)
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
}

export const createProjectTasks = (options: Options, config: Config) => {
  return new Listr([
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

              const projectTasks = await initializeProjectTasks(project, options, config)

              await projectTasks.run()
            }
          },
          {
            title: 'Creating packages directory',
            task: async (t, project) => {
              if (!options.projectName) {
                project.skip()
              }
              await createProjectDir(
                `${process.cwd()}/${options.projectName}/packages`
              )
            }
          },
          {
            title: 'Creating terraform directory',
            task: async (t, project) => {
              await createProjectDir(
                `${process.cwd()}/${options.projectName}/terraform`
              )
            }
          }
        ])

        subTasks.run()
      }
    }
  ])
}
