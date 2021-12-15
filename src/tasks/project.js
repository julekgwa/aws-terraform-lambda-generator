import { Listr } from 'listr2'
import { createProjectDir, initGit } from '../helpers/utils.js'
import { addScriptToPackageJson, createGitIgnore, createMonoFile, createPackageJson, installDependencies } from '../project/init.js'

export const initializeProjectTasks = (task, options, config) => {
  return task.newListr([
    {
      title: 'Creating .gitignore file',
      task: async (t, lambda) => {
        await createGitIgnore(options, config)
      }
    },
    {
      title: 'Creating mono json file',
      task: async (t, lambda) => {
        await createMonoFile(options, config)
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

export const createProjectTasks = (options, config) => {
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

              const projectTasks = initializeProjectTasks(project, options, config)

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
