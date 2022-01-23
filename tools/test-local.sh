# Create or delete provisioning with AWS IoT Core. Requires NodeJS 14+.
#
# Params:
#    * method -- POST (to create), or DELETE
#
#    $ test-provision.sh <POST|DELETE>
#
# Usage:
#    * Create some working directory.
#    * Copy this file, run.env, and the repository /src directory to the
#      working directory.
#    * Use your values for variables of the form "<your-*>" in this file and
#      deploy.env.
#    * In the working directory, run 'npm install'.
#    * Then run this file, including the method parameter as shown above.

BALENA_DEVICE_UUID=<your-uuid>

echo '{
    "method": "'$1'",
    "uuid": "'$BALENA_DEVICE_UUID'"
}' >event.json

echo '{}' >context.json

node-lambda run --apiGateway --configFile deploy.env --eventFile event.json \
   --contextFile context.json
