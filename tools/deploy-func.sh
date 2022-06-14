# Deploys the function to AWS IoT Core.
#
#    $ deploy-func.sh

# deploy only necessary files
rm -rf deploy-source
mkdir deploy-source
cp index.js package*.json deploy-source

npx node-lambda deploy --configFile deploy.env --sourceDirectory deploy-source
