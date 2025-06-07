// testFlow.js
import dotenv from 'dotenv'
dotenv.config()

import fetch from 'node-fetch'
import { pinJSONToIPFS } from './pinata.js'
import {
  getXrplClient,
  prepareMintDebtNFT,
  prepareSellOfferZero,
  prepareAcceptOffer
} from './xrplHelpers.js'

async function main() {
  // 1. Connect & fund two Testnet wallets
  const client = await getXrplClient()
  console.log('🔗 Connected to XRPL TESTNET')

  const studentFund = await client.fundWallet()
  const student     = studentFund.wallet
  console.log('🎓 Student:', student.address, student.seed)

  const companyFund = await client.fundWallet()
  const company     = companyFund.wallet
  console.log('🏢 Company:', company.address, company.seed)

  // 2. Pin sample loan metadata to IPFS via Pinata
  const metadata = {
    student:           'Test Student',
    studentAddress:    student.address,
    schoolAddress:     process.env.SCHOOL_ADDRESS,
    program:           'Blockchain Engineering',
    principalDrops:    '1000000000',    // 1,000 XRP
    interestRate:      0.05,            // 5%
    totalOwedDrops:    '1050000000',    // 1,050 XRP
    feeSchedule: [
      { amountDrops: '500000000', dueDate: '2025-08-01' },
      { amountDrops: '550000000', dueDate: '2026-01-01' }
    ],
    workObligationYears: 4,
    tAndC_URI:          'https://example.com/terms',
    createdAt:          new Date().toISOString()
  }
  console.log('📌 Pinning metadata to IPFS...')
  const metadataURI = await pinJSONToIPFS(metadata)
  console.log('✅ metadataURI =', metadataURI)

  // 3. Mint the NFT (student mints to themselves)
  console.log('🖨️  Preparing mint transaction...')
  const { txSignedBlob: mintBlob } = await prepareMintDebtNFT({
    studentSeed: student.seed,
    metadataURI
  })
  console.log('🚀 Submitting mint...')
  const mintResult = await client.submitAndWait(mintBlob)
  console.log('🔖 Mint result:', mintResult.result.meta.TransactionResult)

  // 4. Fetch the NFT back and verify its URI
  const nfts = (await client.request({
    command: 'account_nfts',
    account: student.address
  })).result.account_nfts

  const nft = nfts.find(n =>
    Buffer.from(n.URI, 'hex').toString('utf8') === metadataURI
  )
  if (!nft) throw new Error('Minted NFT not found in account_nfts!')
  const tokenID = nft.NFTokenID
  console.log('💡 Minted NFT TokenID:', tokenID)

  // 5. Fetch metadata via YOUR Pinata gateway
  console.log('🌐 Fetching metadata via Pinata gateway...')
  // Hard-coded gateway domain:
  const gatewayHost = 'scarlet-written-zebra-215.mypinata.cloud'
  const cid         = metadataURI.replace('ipfs://', '')
  const url         = `https://${gatewayHost}/ipfs/${cid}`
  console.log('🔗 GET', url)
  const res  = await fetch(url)
  const text = await res.text()
  let fetchedMetadata
  try {
    fetchedMetadata = JSON.parse(text)
  } catch (e) {
    console.error('❌ Failed to parse JSON from IPFS response:', text)
    throw e
  }
  console.log('📂 Fetched metadata:', fetchedMetadata)

  // 6. Create a zero-price SellOffer
  console.log('💸 Preparing SellOffer(0)...')
  const { txSignedBlob: sellBlob } = await prepareSellOfferZero({
    studentSeed: student.seed,
    nftTokenID:  tokenID
  })
  console.log('🚀 Submitting SellOffer...')
  const sellResult = await client.submitAndWait(sellBlob)
  console.log('🎟 SellOffer result:', sellResult.result.meta.TransactionResult)

  // 7. Look up the new offerIndex via nft_sell_offers
  const offersResponse = await client.request({
    command: 'nft_sell_offers',
    nft_id:   tokenID
  })
  const offersList = offersResponse.result.offers
  if (!offersList || offersList.length === 0) {
    throw new Error('No sell offers returned for NFT ' + tokenID)
  }
  const zeroOffer = offersList.find(o => o.amount === '0')
  if (!zeroOffer) {
    throw new Error('Zero-price offer not found')
  }
  const offerIndex = zeroOffer.nft_offer_index
  console.log('🔢 OfferIndex =', offerIndex)

  // 8. Company accepts the offer
  console.log('🛒 Preparing AcceptOffer...')
  const { txSignedBlob: acceptBlob } = await prepareAcceptOffer({
    companySeed:    company.seed,
    sellOfferIndex: offerIndex
  })
  console.log('🚀 Submitting AcceptOffer...')
  const acceptResult = await client.submitAndWait(acceptBlob)
  console.log('✅ AcceptOffer result:', acceptResult.result.meta.TransactionResult)

  // Done
  await client.disconnect()
  console.log('🎉 Test flow complete!')
}

main().catch(err => {
  console.error('❌ Test flow error:', err)
  process.exit(1)
})
