/**
Archive
	msgSender (partition key)
	encodedCompositeKey (sort key) -->> coder.encode(['uint32', 'string', 'uint32'], [chainId, transactionHash, logIndex])

	chainId (LSI, sort key)
	timestamp (LSI, sort key)

    transactionHash
    eventSig
	contractAddress
	topics
	data
 */
resource "aws_dynamodb_table" "Archive" {
  name         = "Archive"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "msgSender"
  range_key    = "encodedCompositeKey"

  attribute {
    name = "msgSender"
    type = "S"
  }
  attribute {
    name = "encodedCompositeKey"
    type = "S"
  }
  attribute {
    name = "chainId"
    type = "N"
  }
  attribute {
    name = "timestamp"
    type = "N"
  }

  local_secondary_index {
    name            = "LSI_orderStatus_chainId"
    range_key       = "chainId"
    projection_type    = "INCLUDE"
    non_key_attributes = ["timestamp", "transactionHash", "eventSig", "contractAddress"]
  }
  local_secondary_index {
    name            = "LSI_orderStatus_timestamp"
    range_key       = "timestamp"
    projection_type    = "INCLUDE"
    non_key_attributes = ["chainId", "transactionHash", "eventSig", "contractAddress"]
  }
}

resource "aws_sqs_queue" "eventQueue" {
  name = "eventQueue.fifo"
  delay_seconds = 0 // default 0
  receive_wait_time_seconds = 20 //
  visibility_timeout_seconds = 20 // default 30
  fifo_queue = true
  content_based_deduplication = true
}

resource "aws_lambda_function" "eventConsumer" {
  function_name = "EventConsumerFunction"
  filename      = "/dist/eventConsumer.zip"
  handler       = "app.eventConsumer"
  runtime       = "nodejs20.x"
  role          = "arn:aws:iam::000000000000:role/lambda-exec-role"

  environment {
    variables = {
      NODE_ENV = "dev"
    }
  }
}

resource "aws_lambda_event_source_mapping" "eventConsumerSqsTrigger" {
  event_source_arn = aws_sqs_queue.eventQueue.arn
  function_name    = aws_lambda_function.eventConsumer.arn
  batch_size       = 10
  enabled          = true
}
