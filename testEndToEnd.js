// testEndToEnd.js

import dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'
import { Client } from 'xrpl'
import {
  prepareSellOfferZero,
  prepareAcceptOffer,
  prepareEscrowCreate,
  prepareEscrowFinish,
  prepareBurnNFT
} from './xrplHelpers.js'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getBalance(client, account) {
  const resp = await client.request({ command: 'account_info', account })
  return Number(resp.result.account_data.Balance) / 1_000_000
}

async function main() {
  const REST = 'http://localhost:3000'
  const API  = REST + '/api'
  const client = new Client(process.env.XRPL_SERVER)
  await client.connect()

  // 1) Fund wallets
  const { wallet: student } = await client.fundWallet()
  console.log('🎓 Student:', student.address)
  const { wallet: company } = await client.fundWallet()
  console.log('🏢 Company:', company.address)
  const { wallet: school }  = await client.fundWallet()
  console.log('🏫 School:',  school.address)
  await sleep(500)

  // 1b) Clear DepositAuth on school so escrow finish succeeds
  const clearTx = {
    TransactionType: 'AccountSet',
    Account:         school.address,
    ClearFlag:       9
  }
  const preparedClear = await client.autofill(clearTx)
  const signedClear   = school.sign(preparedClear)
  const clearRes      = await client.submitAndWait(signedClear.tx_blob)
  console.log('🛠️ Cleared DepositAuth on school:', clearRes.result.meta.TransactionResult)
  await sleep(500)

  // 2) Student posts LoanRequest
  const loanReqBody = {
    studentAddress:   student.address,
    studentName:      'Tiny Loan Tester',
    schoolAddress:    school.address,
    program:          'Blockchain',
    totalAmountDrops: '4000000',
    feeSchedule: [
      { amountDrops: '2000000', dueDate: '2020-01-01' },
      { amountDrops: '2000000', dueDate: '2020-01-02' }
    ],
    graduationDate: '2026-06-01',
    industry:       'Tech',
    description:    'Small loan for escrow test'
  }
  const { requestId } = (await axios.post(
    `${REST}/loan-requests`,
    loanReqBody
  )).data
  console.log('✔️ LoanRequest created:', requestId)

  // 3) Company lists open requests
  const open = (await axios.get(`${API}/loan-requests`)).data
  console.log('✔️ Company sees request?', open.some(r => r._id === requestId))

  // 4) Company makes an offer
  const { offerId } = (await axios.post(
    `${API}/loan-requests/${requestId}/offers`,
    {
      companyAddress:      company.address,
      interestRate:        0.02,
      workObligationYears: 1,
      tAndC_URI:           'https://example.com/terms'
    }
  )).data
  console.log('✔️ Offer created:', offerId)

  // 5) Student views offers
  const offers = (await axios.get(
    `${API}/loan-requests/${requestId}/offers`
  )).data
  console.log('✔️ Offers count:', offers.length)

  // 6) Student accepts offer
  const { loanId, mintTxJSON } = (await axios.post(
    `${API}/loan-requests/${requestId}/accept-offer`,
    { offerId, studentSeed: student.seed }
  )).data
  console.log('✔️ Offer accepted. LoanAgreement:', loanId)

  // 7) Show metadata link
  const metadataURI = Buffer.from(mintTxJSON.URI, 'hex').toString()
  console.log('🔗 metadataURI:', metadataURI)
  const cid = metadataURI.replace('ipfs://','')
  console.log('🌐 View metadata:', `https://scarlet-written-zebra-215.mypinata.cloud/ipfs/${cid}`)

  // 8) Mint NFT
  await client.submitAndWait(student.sign(mintTxJSON).tx_blob)
  console.log('✔️ NFT minted')
  await sleep(500)

  // 9) Retrieve tokenID & explorer link
  const studentNFTs = (await client.request({
    command: 'account_nfts',
    account: student.address
  })).result.account_nfts
  const nft = studentNFTs.find(n => Buffer.from(n.URI,'hex').toString() === metadataURI)
  const tokenID = nft.NFTokenID
  console.log('💡 TokenID:', tokenID)
  console.log('🌐 https://test.bithomp.com/nft/' + tokenID)

  // 10) List for 0 XRP
  await client.submitAndWait(
    (await prepareSellOfferZero({
      studentSeed: student.seed,
      nftTokenID:  tokenID
    })).txSignedBlob
  )
  console.log('✔️ SellOffer(0) submitted')
  await sleep(500)

  // 11) Company buys NFT
  const sellOffers = (await client.request({
    command: 'nft_sell_offers',
    nft_id:  tokenID
  })).result.offers
  const zeroOffer = sellOffers.find(o => o.amount === '0')
  await client.submitAndWait(
    (await prepareAcceptOffer({
      companySeed:    company.seed,
      sellOfferIndex: zeroOffer.nft_offer_index
    })).txSignedBlob
  )
  console.log('✔️ NFT transferred to company')
  await sleep(500)

  // 12) Record acceptance
  await axios.post(
    `${API}/loan-agreements/${loanId}/record-accepted`,
    { nftTokenID: tokenID }
  )
  console.log('✔️ Backend recorded acceptance')

  // 13) Real escrow on-chain
  console.log('🔒 Executing real escrow on-chain…')
  let compBal = await getBalance(client, company.address)
  console.log('🏢 Company balance before escrow:', compBal.toFixed(6))
  let schoolBal = await getBalance(client, school.address)
  console.log('🏫 School balance before escrow:', schoolBal.toFixed(6))

  for (let i = 0; i < loanReqBody.feeSchedule.length; i++) {
    const { amountDrops } = loanReqBody.feeSchedule[i]

    // EscrowCreate
    const { txUnsignedJSON: escCreate } = await prepareEscrowCreate({
      companySeed:   company.seed,
      schoolAddress: school.address,
      amountDrops
    })
    const signedEsc = company.sign(escCreate)
    await client.submitAndWait(signedEsc.tx_blob)
    const compBalAfter = await getBalance(client, company.address)
    console.log(`✔️ EscrowCreate #${i}: Δ company = ${(compBalAfter - compBal).toFixed(6)} XRP`)
    compBal = compBalAfter

    // EscrowFinish
    const { txSignedBlob: finishBlob } = await prepareEscrowFinish({
      schoolSeed:     school.seed,
      escrowSequence: escCreate.Sequence,
      ownerAddress:   company.address
    })
    await client.submitAndWait(finishBlob)
    const schoolBalAfter = await getBalance(client, school.address)
    console.log(`✔️ EscrowFinish #${i}: Δ school = ${(schoolBalAfter - schoolBal).toFixed(6)} XRP`)
    schoolBal = schoolBalAfter
  }
  console.log('🏫 School balance after escrow:', schoolBal.toFixed(6))

  // 14) Repay in 2 installments
  let compBalBefore = await getBalance(client, company.address)
  console.log('🏢 Company balance before repayment:', compBalBefore.toFixed(6))
  for (let i = 0; i < loanReqBody.feeSchedule.length; i++) {
    const { amountDrops } = loanReqBody.feeSchedule[i]
    const payTx = {
      TransactionType: 'Payment',
      Account:         student.address,
      Destination:     company.address,
      Amount:          amountDrops,
      Memos: [{ Memo: {
        MemoType: Buffer.from('LoanRepayment','utf8').toString('hex'),
        MemoData: Buffer.from(loanId,'utf8').toString('hex')
      }}]
    }
    await client.submitAndWait(student.sign(await client.autofill(payTx)).tx_blob)
    const compBalAfter = await getBalance(client, company.address)
    console.log(`💸 After payment ${i+1}: Δ = ${(compBalAfter - compBalBefore).toFixed(6)} XRP`)
    compBalBefore = compBalAfter
  }
  console.log('🏢 Company balance after repayment:', compBalBefore.toFixed(6))

  await axios.post(`${API}/loan-agreements/${loanId}/record-payment`)
  console.log('✔️ Backend recorded payment')

  // 15) Poll until REPAID
  console.log('⏳ Waiting for status → REPAID…')
  for (let i = 0; i < 10; i++) {
    await sleep(2000)
    const { status } = (await axios.get(`${API}/loan-agreements/${loanId}`)).data
    if (status === 'REPAID') {
      console.log('✔️ Loan status = REPAID')
      break
    }
    console.log(`  status = ${status}`)
  }

  // 16) Burn NFT & link
  console.log('🔥 Burning NFT…')
  const { txUnsignedJSON: burnJSON } = await prepareBurnNFT({
    companySeed: company.seed,
    nftTokenID:  tokenID
  })
  const signedBurn = company.sign(burnJSON)
  await client.submitAndWait(signedBurn.tx_blob)
  // use the signed object's hash
  const burnHash = signedBurn.hash || signedBurn.id
  console.log('✔️ NFT burned on-chain')
  console.log('🌐 View burn tx:', `https://test.bithomp.com/tx/${burnHash}`)

  await axios.post(`${API}/loan-agreements/${loanId}/record-burn`)
  console.log('🎉 E2E SUCCESS!')

  await client.disconnect()
}

main().catch(err => {
  console.error('❌ E2E test failed:', err.message || err)
  process.exit(1)
})
