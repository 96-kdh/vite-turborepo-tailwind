provider "aws" {
  region                  = "us-east-1"  # You can set this to any AWS region
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  endpoints {
    sqs       = "http://localhost:4566"
    dynamodb  = "http://localhost:4566"
  }
}
