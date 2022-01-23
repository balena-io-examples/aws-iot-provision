# AWS Lambda for IoT Device Provisioning

This Lambda function allows you to provision and synchronize a belana device with AWS IoT Core in a secure and automated way. The Lambda may be called by a balena device, as seen in the [cloud-relay](https://github.com/balena-io-examples/cloud-relay) example.

| Command | Actions |
|-------------|--------|
| POST | Provisions a balena device with IoT Core. First the function verifies the device UUID with balenaCloud. Then it creates a public key certificate, attaches a security policy, and registers an AWS Thing for the device. Finally the function pushes identifiers for these entities to balena device environment variables. |
| DELETE | Removes the AWS Thing and certificate for the balena device and removes the balena device environment variables. Essentially reverses the actions from provisioning with POST. |

## Setup and Testing
### AWS IoT Core setup
You must define an AWS policy that describes the permissible messaging between IoT Core and the balena device. See the IoT Core policy [documentation](https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html), and `doc/policy.json` for an example.

You also must define an AWS Role with permissions to run the Lambda function

### Development setup
Clone the [balena-io-examples/aws-iot-provision](https://github.com/balena-io-examples/aws-iot-provision) repository.

The sections below show how to use the [node-lambda](https://github.com/motdotla/node-lambda) project to test the provisioning function locally and deploy to AWS Lambda. You must provide the environment variables in the table below as described in the sections below for the test/deployment.

| Key         |    Value    |
|-------------|-------------|
| AWS_ACCESS_KEY_ID | For IAM User with permissions policies to deploy the Lambda function |
| AWS_SECRET_ACCESS_KEY | For access key |
| AWS_ROLE_ARN | For IAM Role to execute the Lambda. This role must include the `AWSIoTLogging` and `AWSIoTConfigAccess` permissions policies. |
| AWS_REGION | AWS region for registry, like `us-east-1` |
| RESIN_EMAIL | For balena login |
| RESIN_PASSWORD | For the email address |
| AWS_IOT_POLICY | Name of AWS policy defined for messaging with IoT Core |


### Test locally
To test the Lambda function without deploying it, see `tools/test-local.sh`. The comments for that file include instructions on how to use it. You must provide the environment variables from the table above in the `run.env` file.

After a successful POST, you should see the device appear in your IoT Core registry and `AWS_CERT` and `AWS_PRIVATE_KEY` variables appear in balenaCloud for the device. After a successful DELETE, those variables disappear.

## Deploy
To deploy to AWS Lambda, see `tools/deploy-func.sh`.The comments for that file include instructions on how to use it. You must provide the environment variables from the table above as specified in the `tools/.env` file to deploy the function to AWS Lambda. You also must provide the environment variables as specified in `tools/deploy.env` file, which are used when running the Lambda function.

After deployment, login to the AWS console and visit the Lambda console. You should see the Lambda function you deployed. Next add an API Gateway trigger. Make sure the Method for the route is POST and Security is open (though you could add this later). The result is a Lambda like below.

![Alt text](doc/lambda-trigger.png)

### Test the Lambda
To test the Lambda, see `tools/test-remote.sh`. You must update the script to provide a balena device UUID and the URL for the API endpoint you created in the Lambda console. Execution of the script requires a parameter with POST or DELETE.

After a successful POST, you should see the device appear in your IoT Core registry and `AWS_CERT` and `AWS_PRIVATE_KEY` variables appear in balenaCloud for the device. After a successful DELETE, those variables disappear.
