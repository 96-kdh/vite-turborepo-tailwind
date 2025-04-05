#!/bin/sh
echo "Waiting for Terraform to finish..."
while [ ! -f /shared/terraform.done ]; do
  sleep 2
done
echo "Terraform is done. Starting pollingQueue."
