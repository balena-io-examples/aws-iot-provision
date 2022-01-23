/*
 * Using CommonJS style for imports/exports due to limitations of node-lambda
 * testing/deployment framework, which does not support ES6 style.
 */
const sdk = require('balena-sdk');
const balena = sdk.fromSharedOptions()
const { IoTClient, AttachPolicyCommand, AttachThingPrincipalCommand, CreateKeysAndCertificateCommand,
        CreateThingCommand, DeleteCertificateCommand, DeleteThingCommand, DetachPolicyCommand,
        DetachThingPrincipalCommand, ListThingPrincipalsCommand, UpdateCertificateCommand } = require('@aws-sdk/client-iot')

// AWS IoT Client
let iot = null

/**
 * Provides creation and deletion of AWS IoT Core device, and updates balena environment
 * vars. Expects JSON formatted event like: { uuid: <device-uuid>, method: <POST|DELETE> }.
 */
exports.handler = async function(event, context) {
    try {
        const creds = { email: process.env.RESIN_EMAIL, password: process.env.RESIN_PASSWORD }
        await balena.auth.login(creds)

        // Validate device with balenaCloud
        console.log('event:', JSON.stringify(event))
        if (!event || !event.body) {
            throw { code: 'provision.request.no-body' }
        }
        const body = JSON.parse(event.body);
        if (!body.uuid) {
            throw { code: 'provision.request.no-uuid' }
        }
        await balena.models.device.get(body.uuid)

        // Initialize globals for AWS IoT client
        iot = new IoTClient({ region: process.env.AWS_REGION });

        switch (body.method) {
            case 'POST':
                console.log(`Creating device: ${body.uuid} ...`)
                return await handlePost(body.uuid)
            case 'DELETE':
                console.log(`Deleting device: ${body.uuid} ...`)
                return await handleDelete(body.uuid)
            default:
                throw { code: 'provision.request.bad-method' }
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
 * policy, and finally sets balena device environment vars.
 *
 * Throws an error on failure to create the device.
 */
async function handlePost(uuid) {
    let params = {
      thingName: uuid
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


    await balena.models.device.envVar.set(uuid, 'AWS_CERT',
            Buffer.from(thingCert.certificatePem).toString('base64'))
    await balena.models.device.envVar.set(uuid, 'AWS_PRIVATE_KEY',
            Buffer.from(thingCert.keyPair.PrivateKey).toString('base64'))

    console.log(`Created device ${uuid}`)
    return {
        statusCode: 201,
        body: "device created"
    }
}

/**
 * Removes device and certificate from AWS IoT registry, and also removes balena
 * device environment vars.
 * 
 * Throws an error on failure to delete the device or certificate.
 */
async function handleDelete(uuid) {
    // find certificate for thing
    let params = {
      thingName: uuid
    }
    const metadata = await iot.send(new ListThingPrincipalsCommand(params))
    // Need both cert ARN and ID later; collect both of them here. Not concerned
    // about ARN mis-formatted so ID not found.
    let certArn = null
    let certId = null
    for(let p of metadata.principals) {
        if (p.includes('cert') && p.includes('/')) {
            certArn = p
            certId = p.substring( p.lastIndexOf('/')+1, p.length )
            console.log("Found certificate:", certArn)
            break
        }
    }

    if (certId) {
        // detach certificate from policy and thing, then delete it
        params = {
          thingName: uuid,
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
        console.warn("Certificate not found for thing")
    }

    params = {
      thingName: uuid
    }
    await iot.send(new DeleteThingCommand(params));


    await balena.models.device.envVar.remove(uuid, 'AWS_CERT')
    await balena.models.device.envVar.remove(uuid, 'AWS_PRIVATE_KEY')

    console.log("Deleted device")
    return {
        statusCode: 200,
        body: "device deleted"
    }
}
