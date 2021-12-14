import { getLambdaDirectories } from '../helpers/utils.js'
import { createLambdaTasks, moveLambdasIntoOneProject } from './lambda.js'
import { createProjectTasks } from './project.js'
import { createStateMachineTasks } from './step-fn.js'

export async function runTasks (options, config) {
  const tasks = []

  if (!options.currentProjectDir && options.new && !options.sfn) {
    tasks.push(createProjectTasks(options, config))
  }

  if (options.lambda && !options.sfn) {
    tasks.push(createLambdaTasks(options, config))
  }

  if (options.sfn && options.sfnList.length) {
    tasks.push(createStateMachineTasks(options, config))
  }

  if (options.org) {
    const lambdas = await getLambdaDirectories(process.cwd())

    tasks.push(moveLambdasIntoOneProject(lambdas, options, config))
  }

  for (const task of tasks) {
    await task.run()
  }
}
