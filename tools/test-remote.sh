# Create or delete provisioning with AWS IoT Core using deployed Lambda function.
#
# Params:
#    * HTTP method -- POST or DELETE
#
#    test-remote.sh <POST|DELETE>

BALENA_DEVICE_UUID=<your-uuid>
PROVISION_URL=<your-url>

curl -X POST $PROVISION_URL -H "Content-Type:application/json" \
   -d '{ "uuid": "'$BALENA_DEVICE_UUID'", "method": "'$1'" }' -v
