// pinata.js
import pinataSDK from '@pinata/sdk'
import dotenv from 'dotenv'
dotenv.config()

const pinata = new pinataSDK(
    process.env.PINATA_API_KEY,
    process.env.PINATA_SECRET_API_KEY
)
  
export async function pinJSONToIPFS(jsonBody) {
  try {
    const result = await pinata.pinJSONToIPFS(jsonBody)
    // result.IpfsHash is the CID, e.g. "QmXyz..."
    return `ipfs://${result.IpfsHash}`
  } catch (err) {
    console.error('Pinata pin error:', err)
    throw new Error('Failed to pin JSON to IPFS')
  }
}
