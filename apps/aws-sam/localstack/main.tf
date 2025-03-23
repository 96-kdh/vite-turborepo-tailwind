resource "aws_dynamodb_table" "my_table" {
  name         = "MyTestTable"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

resource "aws_sqs_queue" "my_queue" {
  name = "MyTestQueue"
}
