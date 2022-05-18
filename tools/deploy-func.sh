# Deploys the function to AWS IoT Core.
#
#    $ deploy-func.sh
#
# Usage:
#    * Create some working directory.
#    * Copy this file, .env, deploy.env, the repository index.js and package*.json
#      to the working directory.
#    * Use your values for variables of the form "<your-*>" in .env and deploy.env.
#    * In the working directory, run 'npm install'.
#    * Then run this file, as shown above.

node-lambda deploy --configFile deploy.env
