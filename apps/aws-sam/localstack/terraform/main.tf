/**
Archive 1
	transactionHash (partition key)
	logIndexChainId (sort key)

	msgSender (GSI, pk)
	timestamp (GSI, sort key)

    eventSig
    chainId
	contractAddress
	topics
	data
 */
/**
Archive 2
	chainId (partition key)
	encodedCompositeKey (sort key) -->> coder.encode(['string', 'uint32'], [transactionHash, logIndex])

	msgSender (LSI, pk)
	timestamp (LSI, sort key)

    eventSig
    chainId
	contractAddress
	topics
	data
 */
/**
Archive 3
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

/**
OrderTable 1
	chainId (partition key) // deposit chainId,
	orderId (sort key)
	dstChainId (LSI, sort key) // desire chainId,

	maker (GSI, pk)
	taker (GSI, pk)
	orderStatus (GSI, pk)
	createdAt (GSI, sort key)
	depositAmount (GSI, sort key)
	desiredAmount (GSI, sort key)

	updatedAt
	blockNumber
 */
/**
OrderTable 2
    orderStatus (partition key)
    encodedCompositeKey (sort key) -->> coder.encode(['uint32', 'uint256'], [chainId, orderId])

	chainId (LSI, sort key)
	dstChainId (LSI, sort key)
    maker (LSI, sort key)
    createdAt (LSI, sort key)

	orderId
	taker
	depositAmount
	desiredAmount
	updatedAt
	blockNumber
 */
/**
OrderTable 3
	chainId (partition key)
	orderId (sort key)

    orderStatus (GSI, partition key)
      createdAt (GSI, sort key)
      dstChainId (GSI, sort key)
      maker (GSI, sort key)

    orderStatus (LSI, sort key)

	orderId
	taker
	depositAmount
	desiredAmount
	updatedAt
	blockNumber
 */
resource "aws_dynamodb_table" "Order" {
  name         = "Order"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "orderStatus"
  range_key    = "encodedCompositeKey"

  attribute {
    name = "orderStatus"
    type = "N"
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
    name = "dstChainId"
    type = "N"
  }
  attribute {
    name = "maker"
    type = "S"
  }
  attribute {
    name = "createdAt"
    type = "N"
  }

  local_secondary_index {
    name            = "LSI_orderStatus_chainId"
    range_key       = "chainId"
    projection_type    = "INCLUDE"
    non_key_attributes = ["dstChainId", "orderId", "createdAt", "maker", "taker", "depositAmount", "desiredAmount"]
  }
  local_secondary_index {
    name            = "LSI_orderStatus_dstChainId"
    range_key       = "dstChainId"
    projection_type    = "INCLUDE"
    non_key_attributes = ["chainId", "orderId", "createdAt", "maker", "taker", "depositAmount", "desiredAmount"]
  }
  local_secondary_index {
    name            = "LSI_orderStatus_maker"
    range_key       = "maker"
    projection_type    = "INCLUDE"
    non_key_attributes = ["dstChainId", "chainId", "orderId", "createdAt", "taker", "depositAmount", "desiredAmount"]
  }
  local_secondary_index {
    name            = "LSI_orderStatus_createdAt"
    range_key       = "createdAt"
    projection_type    = "INCLUDE"
    non_key_attributes = ["dstChainId", "chainId", "orderId", "maker", "taker", "depositAmount", "desiredAmount"]
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
