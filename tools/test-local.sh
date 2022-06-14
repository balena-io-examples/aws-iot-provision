# Create or delete device provisioning with AWS IoT Core.
#
#    $ test-local.sh [-u UUID] [-s service_name] <POST|DELETE>
#
# Options:
#    -s service_name -- Name of fleet service for cert/key credential vars
#    -u UUID -- UUID of device to test
#
# Args:
#    method -- POST (to create), or DELETE

# Setup options
BALENA_DEVICE_UUID=
BALENA_SERVICE_NAME=

usage="$0 [-u UUID] [-s service_name] <POST|DELETE>"
while getopts "hs:u:" Option
do
  case $Option in
    s ) BALENA_SERVICE_NAME="$OPTARG";;
    u ) BALENA_DEVICE_UUID="$OPTARG";;
    h | * )
        echo "${usage}"
        exit 1;;
  esac
done
shift $(($OPTIND - 1))

if [ -z "$1" ]; then
  echo "Missing HTTP method parameter"
  echo "${usage}"
  exit 1
fi

# Write data files
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

# Let's go!
npx node-lambda run --configFile run.env --eventFile event.json \
   --contextFile context.json
