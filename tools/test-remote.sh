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
BALENA_SERVICE_NAME=<your=service-name-or-blank>
# From AWS API Gateway endpoint
PROVISION_URL=<your-url>

curl -X POST $PROVISION_URL -H "Content-Type:application/json" \
   -d '{ "balena_service": "'$BALENA_SERVICE_NAME'", "method": "'$1'", "uuid": "'$BALENA_DEVICE_UUID'" }' -v
