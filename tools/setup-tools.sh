#!/usr/bin/env bash
# Setup test/deploy tools.
#
#    $ setup-tools.sh

# Setup options
# Name of file containing variable values
template_fname=tools.env
if [ ! -f "${template_fname}" ]; then
  echo "Template file not found: ${template_fname}"
  exit 1
fi

# Name of directory with aws-iot-provision source code
source_dir=source
if [ ! -d "${source_dir}" ]; then
  echo "Source directory not found: ${source_dir}"
  exit 1
fi

# Setup workspace
cp ${source_dir}/index.js .
cp ${source_dir}/package*.json .
cp ${source_dir}/tools/*.sh .

# Init run.env, for local test
cat > run.env <<EOF
# Static values
AWS_ENVIRONMENT=
AWS_SESSION_TOKEN=
AWS_FUNCTION_NAME=provision
AWS_HANDLER=index.handler
AWS_MEMORY_SIZE=128
AWS_TIMEOUT=10
AWS_DESCRIPTION="Provision a balena device to IoT Core"
AWS_RUNTIME=nodejs14.x
AWS_VPC_SUBNETS=
AWS_VPC_SECURITY_GROUPS=
EXCLUDE_GLOBS="event.json"
PACKAGE_DIRECTORY=build

# User values
EOF

# Init .env, for deployment test
cat > .env <<EOF
# Static values
AWS_ENVIRONMENT=
AWS_SESSION_TOKEN=
AWS_FUNCTION_NAME=provision
AWS_HANDLER=index.handler
AWS_MEMORY_SIZE=128
AWS_TIMEOUT=10
AWS_DESCRIPTION="Provision a balena device to IoT Core"
AWS_RUNTIME=nodejs14.x
AWS_VPC_SUBNETS=
AWS_VPC_SECURITY_GROUPS=
EXCLUDE_GLOBS="event.json"
PACKAGE_DIRECTORY=build

# User values
EOF

# Init deploy.env, for deployment test
cat > deploy.env <<EOF
# User values
EOF

# Allocate values from template env file to specific env files
while IFS= read -r line; do
  if [ $(expr match "${line}" "AWS_ACCESS_KEY_ID=") = 18 ]; then
    echo "${line}" >> run.env
    echo "${line}" >> .env
  elif [ $(expr match "${line}" "AWS_SECRET_ACCESS_KEY=") = 22 ]; then
    echo "${line}" >> run.env
    echo "${line}" >> .env
  elif [ $(expr match "${line}" "AWS_ROLE_ARN=") = 13 ]; then
    echo "${line}" >> run.env
    echo "${line}" >> .env
  elif [ $(expr match "${line}" "AWS_REGION=") = 11 ]; then
    echo "${line}" >> run.env
    echo "${line}" >> .env
  elif [ $(expr match "${line}" "BALENA_API_KEY=") = 15 ]; then
    echo "${line}" >> run.env
    echo "${line}" >> deploy.env
  elif [ $(expr match "${line}" "AWS_IOT_POLICY=") = 15 ]; then
    echo "${line}" >> run.env
    echo "${line}" >> deploy.env
  fi
done <"${template_fname}"

# Setup tools
echo "Installing dependencies..."
npm install
