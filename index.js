const express = require('express');
const bodyParser = require('body-parser');
const { AptosClient, AptosAccount, HexString } = require('aptos');

const app = express();
const port = 5000;

const client = new AptosClient('https://api.testnet.aptoslabs.com/v1');
const moduleAddress = "0xde5d94dac0db9e017d907b6e02a6d4274e0e2fbbe018e3a698d81e8da2028477";

app.use(bodyParser.json());

function getAptosAccount(privateKeyHex) {
  // Remove the '0x' prefix if it exists
  if (privateKeyHex.startsWith('0x')) {
      privateKeyHex = privateKeyHex.slice(2);
  }

  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  if (privateKeyBytes.length !== 32) {
      throw new Error('Private key must be 32 bytes long.');
  }

  return new AptosAccount(privateKeyBytes);
}


async function listExists(account) {
    try {
        const resource = await client.getAccountResource(account.address(), `${moduleAddress}::vortexengine::EntityList`);
        return !!resource;
    } catch (error) {
        if (error.status === 404) {
            return false;
        }
        throw error;
    }
}

async function createList(account) {
    const payload = {
        function: `${moduleAddress}::vortexengine::create_list`,
        type_arguments: [],
        arguments: [],
    };
    const txnRequest = await client.generateTransaction(account.address(), payload);
    const signedTxn = await client.signTransaction(account, txnRequest);
    const response = await client.submitTransaction(signedTxn);
    await client.waitForTransaction(response.hash);
    return response.hash;
}

app.post('/api/create-entry', async (req, res) => {
    const { ipfscontent, timestamp, privateKey } = req.body;

    try {
        const account = getAptosAccount(privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey);

        const exists = await listExists(account);
        if (!exists) {
            console.log("List does not exist, creating list...");
            await createList(account);
            console.log("List created.");
        }

        const payload = {
            function: `${moduleAddress}::vortexengine::create_entry`,
            type_arguments: [],
            arguments: [ipfscontent, timestamp],
        };

        const txnRequest = await client.generateTransaction(account.address(), payload);
        const signedTxn = await client.signTransaction(account, txnRequest);
        const response = await client.submitTransaction(signedTxn);

        await client.waitForTransaction(response.hash);
        res.status(200).json({ message: "Entry created successfully", hash: response.hash });
    } catch (error) {
        console.error("Error creating entry:", error);
        res.status(500).json({ error: "Error creating entry", details: error.message });
    }
});

app.get('/', (req, res) => {
    res.send('Server is working!');
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});