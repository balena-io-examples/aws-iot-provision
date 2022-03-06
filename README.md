# AWS Lambda for IoT Device Provisioning

This Lambda function allows you to provision and synchronize a balena device with AWS IoT Core in a secure and automated way via an HTTP endpoint. The Lambda may be called by a balena device, as seen in the [cloud-relay](https://github.com/balena-io-examples/cloud-relay) example.

| Command | Actions |
|-------------|--------|
| POST | Provisions a balena device with IoT Core. First the function verifies the device UUID with balenaCloud. Then it creates a public key certificate, attaches a security policy, and registers an AWS Thing for the device. Finally the function pushes identifiers for these entities to balena device environment variables. |
| DELETE | Removes the AWS Thing and certificate for the balena device and removes the balena device environment variables. Essentially reverses the actions from provisioning with POST. |

## Setup and Testing
### AWS IoT Core setup
These instructions assume you are somewhat familiar with AWS. See the AWS IoT Core [Getting Started](https://docs.aws.amazon.com/iot/latest/developerguide/iot-gs.html) guide for background.

You must define an AWS IoT policy that describes the permissible messaging operations between IoT Core and a balena device, and provide its name as the AWS_IOT_POLICY variable in the table below. Provisioning attaches this policy to the public key certificate created for a device. See the statements in the example `doc/policy.json` and a [screenshot](doc/iot-messaging-policy.png), and the IoT Core policy [documentation](https://docs.aws.amazon.com/iot/latest/developerguide/iot-policies.html) for background.

You also must define an AWS IAM Role with permissions to run the Lambda function as described by the AWS_ROLE_ARN entry in the table below. See an [example screenshot](doc/iam-provision-role.png).

### Development setup
First clone the [balena-io-examples/aws-iot-provision](https://github.com/balena-io-examples/aws-iot-provision) repository. Then install the [node-lambda](https://www.npmjs.com/package/node-lambda) tool for local testing and deployment to AWS Lambda. It's simplest to install it globally:

```
   npm install -g node-lambda
```

You will provide the environment variables below in files used by node-lambda. We include example files to help you get started.

| Variable    |    Value    |
|-------------|-------------|
| AWS_ACCESS_KEY_ID | For IAM User with permissions policies to deploy the Lambda function |
| AWS_SECRET_ACCESS_KEY | For access key |
| AWS_REGION | AWS region for registry, like `us-east-1` |
| AWS_IOT_POLICY | Name of AWS policy with permissions for messaging with IoT Core |
| AWS_ROLE_ARN | For IAM Role to execute the Lambda. This role must include the `AWSIoTLogging` and `AWSIoTConfigAccess` permissions policies. |
| BALENA_EMAIL | For balena account |
| BALENA_PASSWORD | For balena account |

### HTTP API
The HTTP endpoint expects a POST request containing a JSON body with these attributes:

| Attribute | Value |
|-----------|-------|
| uuid | UUID of device  |
| method | "POST" to add device to cloud registry, "DELETE" to remove  |
| balena_service | (optional) Name of service container on balena device. If defined, creates service level variables; otherwise creates device level variables. Service level variables are more secure. |

### Test locally
To test the Lambda function without deploying it, see `tools/test-local.sh`. The comments for that file include instructions on how to use it. You must provide environment variables from the table above in a file with contents like `tools/run.env`.

After a successful POST, you should see the device appear in your IoT Core registry, and `AWS_CERT` and `AWS_PRIVATE_KEY` variables appear in balenaCloud for the device. After a successful DELETE, those variables disappear.

## Deploy
To deploy to AWS Lambda, see `tools/deploy-func.sh`.The comments for that file include instructions on how to use it. You must provide environment variables from the table above in a file with contents like `tools/.env` to deploy the function to AWS Lambda. You also must provide the balena specific environment variables in a separate `tools/deploy.env` file, which are used when running the Lambda function.

After deployment, login to the AWS console and visit the Lambda console to you Lambda function. Next add an API Gateway trigger from the link on that page. Make sure the Method for the route is POST and Security is open (though you could add this later). The result should be a Lambda and API Gateway like below.

![Alt text](doc/lambda-trigger.png)

### Test the Lambda
To test the Lambda, see `tools/test-remote.sh`. You must update the script to provide a balena device UUID and the URL for the API endpoint you created in the Lambda console. Execution of the script requires a POST/DELETE parameter.

After a successful POST, you should see the device appear in your IoT Core registry and `AWS_CERT` and `AWS_PRIVATE_KEY` variables appear in balenaCloud for the device. After a successful DELETE, those variables disappear.
