#!/bin/bash

set -e

RESOLVER_DIR="graphql/resolvers"

find $RESOLVER_DIR -name "*.js" | while read file; do
  filename=$(basename "$file")

  echo "====================================================="
  echo "Testing $file"
  echo "====================================================="

  case "$filename" in
    "getOrder.js")
      context='{"arguments": {"orderId": "abc", "chainId": 1}}'
      ;;
    "listOrdersByMaker.js")
      context='{"arguments": {"maker": "0xabc", "createdAtFrom": 0, "createdAtTo": 9999999999}}'
      ;;
    "listOrdersByTaker.js")
      context='{"arguments": {"taker": "0xabc", "createdAtFrom": 0, "createdAtTo": 9999999999}}'
      ;;
    "listOrdersByStatus.js")
      context='{"arguments": {"orderStatus": 1, "createdAtFrom": 0, "createdAtTo": 9999999999}}'
      ;;
    *)
      echo "❌ Unknown resolver: $filename"
      exit 1
      ;;
  esac

  echo "Context: $context"
  echo

  aws appsync evaluate-code \
    --runtime name=APPSYNC_JS,runtimeVersion=1.0.0 \
    --code file://$file \
    --function request \
    --context "$context"

  echo "✅ $file passed"
  echo
done
