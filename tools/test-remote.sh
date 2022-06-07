# Create or delete provisioning with AWS IoT Core using deployed Lambda function.
#
# Params:
#    * HTTP method -- POST or DELETE
#
#    test-remote.sh <POST|DELETE>
#
# Usage:
#    * Use your values for variables of the form "<your-*>" in this file.

BALENA_DEVICE_UUID=<your-uuid>
# Service name must be valid for the fleet the device is in; otherwise leave it blank.
BALENA_SERVICE_NAME=<your=service-name-or-blank>
# From AWS API Gateway endpoint
PROVISION_URL=<your-url>

if [ -z "$1" ]; then
  echo "Missing HTTP method parameter"
  echo "$0 <POST|DELETE>"
  exit 1
fi

curl -X $1 $PROVISION_URL -H "Content-Type:application/json" \
   -d '{ "uuid": "'$BALENA_DEVICE_UUID'", "balena_service": "'$BALENA_SERVICE_NAME'" }' -v
