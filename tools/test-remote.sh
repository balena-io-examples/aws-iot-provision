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
# From AWS API Gateway endpoint
PROVISION_URL=<your-url>

curl -X POST $PROVISION_URL -H "Content-Type:application/json" \
   -d '{ "uuid": "'$BALENA_DEVICE_UUID'", "method": "'$1'" }' -v
