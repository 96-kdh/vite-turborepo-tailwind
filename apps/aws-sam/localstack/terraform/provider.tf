provider "aws" {
  region                  = "ap-northeast-2"  # You can set this to any AWS region
  access_key              = "test"         # 더미 Access Key
  secret_key              = "test"         # 더미 Secret Key
  skip_credentials_validation = true
  skip_metadata_api_check     = true
  skip_requesting_account_id  = true
  endpoints {
    sqs       = "http://localstack:4566"
    dynamodb  = "http://localstack:4566"
  }
}
