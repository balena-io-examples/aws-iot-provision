# Create or delete provisioning with AWS IoT Core. Requires NodeJS 14+.
#
# Params:
#    * method -- POST (to create), or DELETE
#
#    $ test-local.sh <POST|DELETE>
#
# Usage:
#    * Create some working directory.
#    * Copy this file, run.env, the repository index.js and package*.json to the
#      working directory.
#    * Use your values for variables of the form "<your-*>" in this file and
#      run.env.
#    * In the working directory, run 'npm install'.
#    * Then run this file, including the method parameter as shown above.

BALENA_DEVICE_UUID=<your-uuid>
# Service name must be valid for the fleet the device is in; otherwise leave it blank.
BALENA_SERVICE_NAME=<your=service-name-or-blank>

if [ -z "$1" ]; then
  echo "Missing HTTP method parameter"
  echo "$0 <POST|DELETE>"
  exit 1
fi

echo '{
    "body": {
        "uuid": "'$BALENA_DEVICE_UUID'",
        "balena_service": "'$BALENA_SERVICE_NAME'"
    },
    "requestContext": {
        "http": {
            "method": "'$1'"
        }
    }
}' >event.json

echo '{}' >context.json

node-lambda run --configFile run.env --eventFile event.json \
   --contextFile context.json
