/**
Archive
	transactionHash (partition key)
	logIndexChainId (sort key)

	msgSender (GSI, pk)
	eventSig (GSI, pk)
	timestamp (GSI, sort key)

    chainId
	contractAddress
	topics
	data
 */
resource "aws_dynamodb_table" "Archive" {
  name         = "Archive"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "transactionHash"
  range_key    = "logIndexChainId"

  attribute {
    name = "transactionHash"
    type = "S"
  }
  attribute {
    name = "logIndexChainId"
    type = "S"
  }
  attribute {
    name = "msgSender"
    type = "S"
  }
  attribute {
    name = "eventSig"
    type = "S"
  }
  attribute {
    name = "timestamp"
    type = "N"
  }

  global_secondary_index {
    name            = "GSI_msgSender_timestamp"
    hash_key        = "msgSender"
    range_key       = "timestamp"
    projection_type    = "INCLUDE"
    non_key_attributes = ["transactionHash", "chainId"]
  }
  global_secondary_index {
    name            = "GSI_eventSig_timestamp"
    hash_key        = "eventSig"
    range_key       = "timestamp"
    projection_type    = "INCLUDE"
    non_key_attributes = ["transactionHash", "chainId", "msgSender", "topics", "data"]
  }
}

/**
OrderTable
	orderId (partition key)
	chainId (sort key)

	maker (GSI, pk)
	taker (GSI, pk)
	orderStatus (GSI, pk)
	createdAt (GSI, sort key)

	depositAmount
	desiredAmount
	updatedAt
	blockNumber
 */
resource "aws_dynamodb_table" "Order" {
  name         = "Order"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderId"
  range_key    = "chainId"

  attribute {
    name = "orderId"
    type = "S"
  }
  attribute {
    name = "chainId"
    type = "N"
  }
  attribute {
    name = "maker"
    type = "S"
  }
  attribute {
    name = "taker"
    type = "S"
  }
  attribute {
    name = "orderStatus"
    type = "N"
  }
  attribute {
    name = "createdAt"
    type = "N"
  }

  global_secondary_index {
    name            = "GSI_maker_createdAt"
    hash_key        = "maker"
    range_key       = "createdAt"
    projection_type    = "INCLUDE"
    non_key_attributes = ["orderId", "chainId", "taker", "depositAmount", "desiredAmount", "orderStatus"]
  }
  global_secondary_index {
    name            = "GSI_taker_createdAt"
    hash_key        = "taker"
    range_key       = "createdAt"
    projection_type    = "INCLUDE"
    non_key_attributes = ["orderId", "chainId", "maker", "depositAmount", "desiredAmount", "orderStatus"]
  }
  global_secondary_index {
    name            = "GSI_orderStatus_createdAt"
    hash_key        = "orderStatus"
    range_key       = "createdAt"
    projection_type    = "INCLUDE"
    non_key_attributes = ["orderId", "chainId", "maker", "taker", "depositAmount", "desiredAmount"]
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
