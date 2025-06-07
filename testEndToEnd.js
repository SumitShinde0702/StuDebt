// testEndToEnd.js
import dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'
import { Client } from 'xrpl'

// sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Import your XRPL helper wrappers:
import {
  prepareMintDebtNFT,
  prepareSellOfferZero,
  prepareAcceptOffer
} from './xrplHelpers.js'

async function main() {
  const baseURL = 'http://localhost:3000'

  // 1) Connect & fund student + company
  const client = new Client(process.env.XRPL_SERVER)
  await client.connect()

  const { wallet: student } = await client.fundWallet()
  console.log('🎓 Student address:', student.address)
  const { wallet: company } = await client.fundWallet()
  console.log('🏢 Company address:', company.address)

  // 2) Student posts loan request
  const post = await axios.post(`${baseURL}/loan-requests`, {
    studentAddress:   student.address,
    studentName:      'Eve Auto',
    schoolAddress:    process.env.SCHOOL_ADDRESS,
    program:          'CS',
    totalAmountDrops: '1000000000',
    feeSchedule: [
      { amountDrops: '500000000', dueDate: '2025-09-01' },
      { amountDrops: '500000000', dueDate: '2026-01-01' }
    ],
    graduationDate: '2027-06-01',
    industry:       'Tech',
    description:    'Auto E2E test'
  })
  const requestId = post.data.requestId
  console.log('➤ LoanRequest ID:', requestId)

  // 3) Company sees it
  const all = await axios.get(`${baseURL}/api/loan-requests`)
  console.log('➤ Company sees request?', all.data.some(r=>r._id===requestId))

  // 4) Company makes offer
  const off = await axios.post(
    `${baseURL}/api/loan-requests/${requestId}/offers`,
    { companyAddress: company.address, interestRate:0.05, workObligationYears:2, tAndC_URI:'https://terms' }
  )
  const offerId = off.data.offerId
  console.log('➤ Offer ID:', offerId)

  // 5) Student accepts and gets mintTxJSON
  const acc = await axios.post(
    `${baseURL}/api/loan-requests/${requestId}/accept-offer`,
    { offerId, studentSeed: student.seed }
  )
  const { loanId, mintTxJSON } = acc.data
  console.log('➤ LoanAgreement ID:', loanId)

  // Decode IPFS URI
  const metadataURI = Buffer.from(mintTxJSON.URI, 'hex').toString('utf8')
  console.log('🔗 Metadata URI:', metadataURI)

  // 6) Mint NFT
  const signedMint = student.sign(mintTxJSON)
  const mintRes = await client.submitAndWait(signedMint.tx_blob)
  console.log('✔️ Mint:', mintRes.result.meta.TransactionResult)

  // 7) Find tokenID in student account
  await sleep(1000)
  const nftsStudent = (await client.request({
    command: 'account_nfts',
    account: student.address
  })).result.account_nfts
  const nft = nftsStudent.find(n => Buffer.from(n.URI,'hex').toString() === metadataURI)
  if (!nft) throw new Error('NFT not in student account!')
  const tokenID = nft.NFTokenID
  console.log('💡 TokenID:', tokenID)

  // --- NEW: LIST & TRANSFER to company

  // 8) Student lists it for free
  const { txSignedBlob: sellBlob } = await prepareSellOfferZero({
    studentSeed: student.seed,
    nftTokenID:  tokenID
  })
  const sellRes = await client.submitAndWait(sellBlob)
  console.log('✔️ SellOffer:', sellRes.result.meta.TransactionResult)

  // 9) Fetch the offerIndex
  const offers = (await client.request({
    command: 'nft_sell_offers',
    nft_id:   tokenID
  })).result.offers
  const zero = offers.find(o => o.amount==='0')
  if (!zero) throw new Error('Zero-price offer not found')
  const offerIndex = zero.nft_offer_index
  console.log('🔢 OfferIndex:', offerIndex)

  // 10) Company accepts it
  const { txSignedBlob: acceptBlob } = await prepareAcceptOffer({
    companySeed: company.seed,
    sellOfferIndex: offerIndex
  })
  const acceptRes = await client.submitAndWait(acceptBlob)
  console.log('✔️ AcceptOffer:', acceptRes.result.meta.TransactionResult)

  // 11) Verify company now owns the NFT
  await sleep(1000)
  const nftsCompany = (await client.request({
    command: 'account_nfts',
    account: company.address
  })).result.account_nfts
  const received = nftsCompany.find(n => n.NFTokenID === tokenID)
  if (!received) throw new Error('NFT not found in company account!')
  console.log('✅ NFT successfully transferred to company!')

  await client.disconnect()
  console.log('\n🎉 Full E2E passed through NFT transfer!')
}

main().catch(err => {
  console.error('❌ E2E test failed:', err.message || err)
  process.exit(1)
})
