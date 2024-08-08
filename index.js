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
////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.post('/addEntity', async (req, res) => {
  const { dataUri, privateKey } = req.body;

  if (!dataUri || !privateKey) {
      return res.status(400).json({ error: 'dataUri and privateKey are required' });
  }

  try {
      // Set up ethers provider and wallet dynamically
      const provider = new ethers.JsonRpcProvider("https://polygon-amoy.g.alchemy.com/v2/_AF2CpEjoBSz_aDWGsy-7KRb4ZrE0gl0"); // Replace with your RPC URL
      const wallet = new ethers.Wallet(privateKey, provider); // Create a wallet with the provided private key

      // Set up the contract
      const contractAddress = '0xa64d6e6C490fea5cd187080CC32811F07C455356'; // Replace with your contract address
      const contractABI = [
        {
          "inputs": [
            { "internalType": "string", "name": "_dataUri", "type": "string" }
          ],
          "name": "addEntity",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "dataUri",
              "type": "string"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            }
          ],
          "name": "EntityAdded",
          "type": "event"
        },
        {
          "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "name": "entities",
          "outputs": [
            { "internalType": "uint256", "name": "id", "type": "uint256" },
            { "internalType": "address", "name": "user", "type": "address" },
            { "internalType": "string", "name": "dataUri", "type": "string" },
            { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "getAllEntities",
          "outputs": [
            {
              "components": [
                { "internalType": "uint256", "name": "id", "type": "uint256" },
                { "internalType": "address", "name": "user", "type": "address" },
                { "internalType": "string", "name": "dataUri", "type": "string" },
                { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
              ],
              "internalType": "struct VortexStorage.VortexEntity[]",
              "name": "",
              "type": "tuple[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            { "internalType": "address", "name": "_user", "type": "address" }
          ],
          "name": "getEntitiesByAddress",
          "outputs": [
            {
              "components": [
                { "internalType": "uint256", "name": "id", "type": "uint256" },
                { "internalType": "address", "name": "user", "type": "address" },
                { "internalType": "string", "name": "dataUri", "type": "string" },
                { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
              ],
              "internalType": "struct VortexStorage.VortexEntity[]",
              "name": "",
              "type": "tuple[]"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "nextId",
          "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [{ "internalType": "address", "name": "", "type": "address" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            { "internalType": "address", "name": "", "type": "address" },
            { "internalType": "uint256", "name": "", "type": "uint256" }
          ],
          "name": "userEntities",
          "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
          "stateMutability": "view",
          "type": "function"
        }
      ]; // Replace with your contract ABI
      const contract = new ethers.Contract(contractAddress, contractABI, wallet); // Connect the wallet to the contract

      // Call the addEntity method on the contract
      const tx = await contract.addEntity(dataUri);
      await tx.wait(); // Wait for the transaction to be mined

      res.json({ transactionHash: tx.hash });
  } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Internal Server Error' });
  }
});


//////////////////////////////////////////////////////////////////////////////////////////////////////////


app.get('/', (req, res) => {
    res.send('Server is working!');
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});