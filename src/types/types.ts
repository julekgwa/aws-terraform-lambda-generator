/* eslint-disable camelcase */
export interface LooseObject {
  [key: string]: any
}

export interface Options {
  lambda: string,
  remove?: string,
  projectName: string,
  sfn?: boolean,
  new?: string,
  help?: string,
  org?: string,
  debug?: string,
  sfnList: LooseObject[],
  region: string,
  targetDir?: string,
  currentProjectDir?: boolean,
  path?: string
}

export enum Numbers {
  Zero,
  One,
  Two,
  Three,
  Four,
  Five,
  Six,
  Seven,
  Eight,
  Nine,
  Ten
}

export interface Project {
  directory: string,
    babelConfig: string,
    lambda: string,
    lambdaTest: string,
    projectPackageJson: string,
    lambdaPackageJson: string
}

export interface Terraform {
  aws_s3_bucket_object: string,
    aws_s3_bucket: string,
    aws_sfn_state_machine: string,
    aws_iam_role_policy_attachment_sfn: string,
    aws_iam_policy_sfn: string,
    aws_iam_policy_document_sfn: string,
    aws_iam_policy_document: string,
    aws_iam_role_policy_attachment: string,
    aws_iam_policy: string,
    aws_cloudwatch_log_group: string,
    aws_iam_role_sfn: string,
    aws_iam_role: string,
    aws_lambda_function: string,
    archive: string,
    provider: string,
    variables: string
    [key: string]: string
}

interface Region {
  region: string
}

export interface Config {
  aws: Region,
  help: string,
  project: Project,
  terraform: Terraform,
  lernaJson: string,
  gitignore: string
}
