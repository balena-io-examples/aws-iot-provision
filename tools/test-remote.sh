# Create or delete provisioning with AWS IoT Core using HTTP endpoint for
# deployed Lambda function.
#
#    $ test-remote.sh [-u UUID] [-s service_name] <POST|DELETE> <provision_url>
#
# Options:
#    -s service_name -- Name of fleet service for cert/key credential vars
#    -u UUID -- UUID of device to test
#
# Args:
#    method -- POST (to create), or DELETE
#    provision_url -- HTTP endpoint for Lambda function

# Setup options
BALENA_DEVICE_UUID=
BALENA_SERVICE_NAME=

usage="$0 [-u UUID] [-s service_name] <POST|DELETE> <provision_url>"
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

if [ -z "$2" ]; then
  echo "Missing provision URL"
  echo "${usage}"
  exit 1
fi

# Let's go!
curl -X $1 $2 -H "Content-Type:application/json" \
   -d '{ "uuid": "'$BALENA_DEVICE_UUID'", "balena_service": "'$BALENA_SERVICE_NAME'" }' -v
