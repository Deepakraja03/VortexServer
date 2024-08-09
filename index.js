const express = require('express');
const bodyParser = require('body-parser');
const { AptosClient, AptosAccount, HexString } = require('aptos');
const cors = require('cors');

const app = express();
const port = 5000;

const client = new AptosClient('https://api.testnet.aptoslabs.com/v1');
const moduleAddress = "0x9e296820201eb907297da80e0e666552bdaa63dccedaf5d98b94dce4c9183f65";

app.use(cors("*"));

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

async function getEntryById(accountAddress, entryId) {
  try {
    const functionName = "get_entry_by_id";
    const url = `https://api.testnet.aptoslabs.com/v1/view`;

    const payload = {
      function: `${moduleAddress}::vortexengine::${functionName}`,
      type_arguments: [],
      arguments: [accountAddress, entryId.toString()],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log(`View Function Response for entryId ${entryId}:`, responseData);

    if (Array.isArray(responseData) && responseData.length > 0) {
      const entryData = responseData[0];
      return {
        entry_id: Number(entryData.entry_id),
        Walletaddress: String(entryData.Walletaddress),
        ipfscontent: String(entryData.ipfscontent),
        timestamp: String(entryData.timestamp),
      };
    } else {
      return { error: "Entry not found" };
    }
  } catch (error) {
    console.error(`Error fetching entry ${entryId} from Move:`, error);
    return { error: "Error fetching entry", details: error.message };
  }
}

// Endpoint to get all entries from 1 to entry_counter
app.post('/api/get-function-value', async (req, res) => {
  const { accountAddress } = req.body;

  try {
    const resourceType = `${moduleAddress}::vortexengine::EntityList`;
    const response = await client.getAccountResource(accountAddress, resourceType);

    console.log("Response from getAccountResource:", response);

    if (response && response.data && response.data.entry_counter) {
      const entryCounter = Number(response.data.entry_counter);
      console.log("Total Entries:", entryCounter);

      const entries = [];

      // Loop from 1 to entryCounter to fetch all entries
      for (let entryId = 1; entryId <= entryCounter; entryId++) {
        const entryData = await getEntryById(accountAddress, entryId);
        if (!entryData.error) {
          entries.push(entryData);
        } else {
          console.error(`Error fetching entry ${entryId}:`, entryData.error);
        }
      }

      // Return all entries
      res.status(200).json(entries);
    } else {
      res.status(404).json({ error: "Resource or entry_counter not found" });
    }
  } catch (error) {
    console.error("Error fetching function value:", error);
    res.status(500).json({ error: "Error fetching function value", details: error.message });
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
      const contractAddress = '0x2f6567B0dA00d1E16003f65af8eFFCBa2597218A'; // Replace with your contract address
      const contractABI = [
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_dataUri",
              "type": "string"
            }
          ],
          "name": "addEntity",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
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
          "inputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "entities",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "id",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "user",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "dataUri",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            }
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
                {
                  "internalType": "uint256",
                  "name": "id",
                  "type": "uint256"
                },
                {
                  "internalType": "address",
                  "name": "user",
                  "type": "address"
                },
                {
                  "internalType": "string",
                  "name": "dataUri",
                  "type": "string"
                },
                {
                  "internalType": "uint256",
                  "name": "timestamp",
                  "type": "uint256"
                }
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
            {
              "internalType": "address",
              "name": "_user",
              "type": "address"
            }
          ],
          "name": "getEntitiesByAddress",
          "outputs": [
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "id",
                  "type": "uint256"
                },
                {
                  "internalType": "address",
                  "name": "user",
                  "type": "address"
                },
                {
                  "internalType": "string",
                  "name": "dataUri",
                  "type": "string"
                },
                {
                  "internalType": "uint256",
                  "name": "timestamp",
                  "type": "uint256"
                }
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
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "name": "userEntities",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ] // Replace with your contract ABI
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