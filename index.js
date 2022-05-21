/*
 * Using CommonJS style for imports/exports due to limitations of node-lambda
 * testing/deployment framework, which does not support ES6 style.
 */
const sdk = require('balena-sdk');
const balena = sdk.fromSharedOptions()
const { IoTClient, AttachPolicyCommand, AttachThingPrincipalCommand, CreateKeysAndCertificateCommand,
        CreateThingCommand, DeleteCertificateCommand, DeleteThingCommand, DescribeThingCommand,
        DetachPolicyCommand, DetachThingPrincipalCommand, ListThingPrincipalsCommand,
        ResourceNotFoundException, UpdateCertificateCommand } = require('@aws-sdk/client-iot')

// AWS IoT Client
let iot = null

/**
 * Provides creation and deletion of AWS IoT Core device, and updates balena environment
 * vars. Expects JSON formatted event like: { uuid: <device-uuid>, method: <POST|DELETE>,
 * balena_service: <service-name> }.
 */
exports.handler = async function(event, context) {
    try {
        const badBodyCode = 'provision.request.bad-body'
        await balena.auth.loginWithToken(process.env.BALENA_API_KEY)

        // Validate and prepare request contents
        console.debug('event:', JSON.stringify(event))
        if (!event || !event.body) {
            throw { code: 'provision.request.no-body' }
        }
        let body
        // context.local provided by node-lambda tool for local testing.
        if (context.local) {
            body = event.body
        } else {
            // event.body passed as a string to AWS Lambda
            body = JSON.parse(event.body)
        }

        // Determine HTTP method. Accommodate Lambda proxy versioning:
        // https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
        let method
        if (!event.requestContext) {
            throw { code: 'provision.request.no-http' }
        }
        if (event.requestContext.http && event.requestContext.http.method) {  // v2.0
            method = event.requestContext.http.method
        } else if (event.requestContext.httpMethod) {   // v1.0
            method = event.requestContext.httpMethod
        } else {
            throw { code: 'provision.request.no-http' }
        }

        // Validate device with balenaCloud
        if (!body.uuid) {
            throw { code: badBodyCode }
        }
        // lookup device; throws error if not found
        const device = await balena.models.device.get(body.uuid)

        // lookup balena service if name provided
        let service
        if (body.balena_service) {
            const allServices = await balena.models.service.getAllByApplication(device.belongs_to__application.__id)
            for (service of allServices) {
                //console.debug("service_name:", service.service_name)
                if (service.service_name == body.balena_service) {
                    break
                }
            }
            if (!service) {
                throw { code: badBodyCode }
            }
        }

        // Initialize globals for AWS IoT client
        iot = new IoTClient({ region: process.env.AWS_REGION });

        let deviceText = `${body.uuid} for service ${body.balena_service}`
        switch (method) {
            case 'POST':
                console.log(`Creating device: ${deviceText} ...`)
                return await handlePost(device, service)
            case 'DELETE':
                console.log(`Deleting device: ${deviceText} ...`)
                return await handleDelete(device, service)
            default:
                throw { code: 'provision.request.bad-body' }
        }
    } catch (error) {
        console.warn("Error:", error)
        let statusCode = 500
        let errorCode = String(error.code)
        if (errorCode) {
            if (errorCode === balena.errors.BalenaDeviceNotFound.prototype.code
                    || errorCode === balena.errors.BalenaInvalidLoginCredentials.prototype.code
                    || errorCode.startsWith('provision.request')) {
                statusCode = 400
            }
        }
        return {
            statusCode: statusCode,
            body: error
        }
    }
}

/**
 * Adds device to AWS IoT registry with new key pair and certificate, attaches security
 * policy, and finally sets balena environment vars.
 *
 * service: Service on the balena device for which variables are created. If service
 * is undefined, creates device level environment variables.
 *
 * Returns a 400 response if thing already exists. Throws an error on failure to
 * create the device.
 */
async function handlePost(device, service) {
    // First explicitly verify thing has not yet been created. Otherwise CreateThingCommand
    // accepts a UUID even if thing for it already has been created.
    try {
        let params = {
          thingName: device.uuid
        }
        await iot.send(new DescribeThingCommand(params));
        return {
            statusCode: 400,
            body: "thing already exists"
        }
    } catch(error) {
        // Expecting thing not found; otherwise we don't know how to handle
        if (!error.name || error.name != 'ResourceNotFoundException') {
            throw error
        }
    }

    let params = {
      thingName: device.uuid
    }
    let thing = await iot.send(new CreateThingCommand(params));

    params = {
      setAsActive: true
    }
    let thingCert = await iot.send(new CreateKeysAndCertificateCommand(params));

    params = {
      policyName: process.env.AWS_IOT_POLICY,
      target: thingCert.certificateArn
    }
    await iot.send(new AttachPolicyCommand(params));

    params = {
      thingName: thing.thingName,
      principal: thingCert.certificateArn
    }
    await iot.send(new AttachThingPrincipalCommand(params));

    if (service) {
        await balena.models.device.serviceVar.set(device.id, service.id, 'AWS_CERT',
                Buffer.from(thingCert.certificatePem).toString('base64'))
        await balena.models.device.serviceVar.set(device.id, service.id, 'AWS_PRIVATE_KEY',
                Buffer.from(thingCert.keyPair.PrivateKey).toString('base64'))
    } else {
        await balena.models.device.envVar.set(device.uuid, 'AWS_CERT',
                Buffer.from(thingCert.certificatePem).toString('base64'))
        await balena.models.device.envVar.set(device.uuid, 'AWS_PRIVATE_KEY',
                Buffer.from(thingCert.keyPair.PrivateKey).toString('base64'))
    }

    console.log(`Created device ${device.uuid}`)
    return {
        statusCode: 201,
        body: "device created"
    }
}

/**
 * Removes device and certificate from AWS IoT registry, and also removes balena
 * environment vars. Cleans up resources as available; accommodates missing resources.
 *
 * service: Service on the balena device for which variables are removed. If service
 * is undefined, removes device level environment variables.
 * 
 * Throws an error on failure to delete the device or certificate.
 */
async function handleDelete(device, service) {
    // find certificate for thing
    let certId, certArn
    try {
        let params = {
          thingName: device.uuid
        }
        const metadata = await iot.send(new ListThingPrincipalsCommand(params))
        // Need both cert ARN and ID later; collect both of them here. Not concerned
        // about ARN mis-formatted so ID not found.
        for(let p of metadata.principals) {
            if (p.includes('cert') && p.includes('/')) {
                certArn = p
                certId = p.substring( p.lastIndexOf('/')+1, p.length )
                console.log("Found certificate:", certArn)
                break
            }
        }
    } catch (error) {
        if (!error.name || error.name != "ResourceNotFoundException") {
            throw error
        } else {
            // certId still null; handled below
        }
    }

    if (certId) {
        // detach certificate from policy and thing, then delete it
        let params = {
          thingName: device.uuid,
          principal: certArn
        }
        await iot.send(new DetachThingPrincipalCommand(params));

        params = {
          policyName: process.env.AWS_IOT_POLICY,
          target: certArn
        }
        await iot.send(new DetachPolicyCommand(params));

        params = {
          certificateId: certId,
          newStatus: 'INACTIVE'
        }
        await iot.send(new UpdateCertificateCommand(params));

        params = {
          certificateId: certId
        }
        await iot.send(new DeleteCertificateCommand(params));
        console.log(`Deleted certificate`)
    } else {
        console.warn("Certificate not found for Thing")
    }

    try {
        let params = {
          thingName: device.uuid
        }
        await iot.send(new DeleteThingCommand(params));
    } catch (error) {
        if (!error.name || error.name != "ResourceNotFoundException") {
            throw error
        } else {
            console.log("Thing for device not found in AWS registry")
        }
    }

    if (service) {
        await balena.models.device.serviceVar.remove(device.uuid, service.id, 'AWS_CERT')
        await balena.models.device.serviceVar.remove(device.uuid, service.id, 'AWS_PRIVATE_KEY')
    } else {
        await balena.models.device.envVar.remove(device.uuid, 'AWS_CERT')
        await balena.models.device.envVar.remove(device.uuid, 'AWS_PRIVATE_KEY')
    }

    console.log("Deleted device")
    return {
        statusCode: 200,
        body: "device deleted"
    }
}
