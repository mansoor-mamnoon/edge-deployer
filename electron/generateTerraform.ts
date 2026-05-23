import { EnvConfig } from '../src/types';

export function generateTerraform(config: EnvConfig, code: string): string {
  switch (config.cloudProvider) {
    case 'cloudflare':
      return generateCloudflare(config, code);
    case 'aws':
      return generateAWS(config, code);
    case 'vercel':
      return generateVercel(config, code);
    default:
      throw new Error(`Terraform export not yet supported for ${config.cloudProvider}`);
  }
}

function generateCloudflare(config: EnvConfig, _code: string): string {
  return `terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4"
    }
  }
}

variable "cloudflare_api_token" {
  type      = string
  sensitive = true
}

variable "cloudflare_account_id" {
  type = string
  default = "${config.cfAccountId ?? ''}"
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_worker_script" "worker" {
  account_id = var.cloudflare_account_id
  name       = "${config.cfScriptName ?? 'my-worker'}"
  content    = file("./worker.js")
}

resource "cloudflare_worker_route" "route" {
  zone_id     = var.cloudflare_zone_id
  pattern     = "*/*"
  script_name = cloudflare_worker_script.worker.name
}

output "worker_url" {
  value = "https://${config.cfScriptName ?? 'my-worker'}.workers.dev"
}
`;
}

function generateAWS(config: EnvConfig, _code: string): string {
  return `terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "${config.awsRegion ?? 'us-east-1'}"
}

provider "aws" {
  region = var.aws_region
}

resource "aws_iam_role" "lambda_exec" {
  name = "${config.awsLambdaName ?? 'my-function'}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "index.js"
  output_path = "lambda.zip"
}

resource "aws_lambda_function" "worker" {
  filename         = "lambda.zip"
  function_name    = "${config.awsLambdaName ?? 'my-function'}"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

resource "aws_lambda_function_url" "url" {
  function_name      = aws_lambda_function.worker.function_name
  authorization_type = "NONE"
}

output "function_url" {
  value = aws_lambda_function_url.url.function_url
}
`;
}

function generateVercel(config: EnvConfig, _code: string): string {
  return `terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1"
    }
  }
}

variable "vercel_api_token" {
  type      = string
  sensitive = true
}

provider "vercel" {
  api_token = var.vercel_api_token
}

resource "vercel_project" "project" {
  name      = "${config.vercelProjectId ?? 'my-project'}"
  framework = null
}

resource "vercel_deployment" "deployment" {
  project_id  = vercel_project.project.id
  files       = fileset("./", "api/**")
  path_prefix = "."
  production  = true
}

output "deployment_url" {
  value = vercel_deployment.deployment.url
}
`;
}
