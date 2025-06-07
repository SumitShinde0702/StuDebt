// xrplHelpers.js

import { Client, Wallet } from 'xrpl'
import moment from 'moment-timezone'
import dotenv from 'dotenv'
dotenv.config()

// 1) Utility to connect to XRPL Testnet
export async function getXrplClient() {
  const client = new Client(process.env.XRPL_SERVER)
  await client.connect()
  return client
}

// 2) Prepare NFTokenMint (not used by test script directly)
export async function prepareMintDebtNFT({ studentSeed, metadataURI }) {
  const client = await getXrplClient()
  const studentWallet = Wallet.fromSeed(studentSeed)
  const uriHex = Buffer.from(metadataURI, 'utf8')
    .toString('hex')
    .toUpperCase()
  const tx = {
    TransactionType: 'NFTokenMint',
    Account:         studentWallet.address,
    URI:             uriHex,
    Flags:           8,    // tfTransferable | tfBurnable
    NFTokenTaxon:    0
  }
  const prepared = await client.autofill(tx)
  const signed   = studentWallet.sign(prepared)
  await client.disconnect()
  return { txUnsignedJSON: prepared, txSignedBlob: signed.tx_blob }
}

// 3) Prepare NFTokenCreateOffer at 0 XRP
export async function prepareSellOfferZero({ studentSeed, nftTokenID }) {
  const client = await getXrplClient()
  const studentWallet = Wallet.fromSeed(studentSeed)
  const tx = {
    TransactionType: 'NFTokenCreateOffer',
    Account:         studentWallet.address,
    NFTokenID:       nftTokenID,
    Amount:          '0',
    Flags:           1    // tfSellToken
  }
  const prepared = await client.autofill(tx)
  const signed   = studentWallet.sign(prepared)
  await client.disconnect()
  return { txUnsignedJSON: prepared, txSignedBlob: signed.tx_blob }
}

// 4) Prepare NFTokenAcceptOffer
export async function prepareAcceptOffer({ companySeed, sellOfferIndex }) {
  const client = await getXrplClient()
  const companyWallet = Wallet.fromSeed(companySeed)
  const tx = {
    TransactionType:  'NFTokenAcceptOffer',
    Account:          companyWallet.address,
    NFTokenSellOffer: sellOfferIndex
  }
  const prepared = await client.autofill(tx)
  const signed   = companyWallet.sign(prepared)
  await client.disconnect()
  return { txUnsignedJSON: prepared, txSignedBlob: signed.tx_blob }
}

// // 5) Prepare EscrowCreate with Ripple-epoch FinishAfter - FOR PRODUCTION
// export async function prepareEscrowCreate({
//   companySeed,
//   schoolAddress,
//   amountDrops,
//   dueDateIso
// }) {
//   // Unix seconds for dueDate at midnight SGT
//   const unixSeconds = moment
//     .tz(dueDateIso + ' 00:00:00', 'YYYY-MM-DD HH:mm:ss', 'Asia/Singapore')
//     .unix()
//   // Convert to Ripple-epoch (since 2000-01-01)
//   const finishAfter = unixSeconds - 946684800

//   const client = await getXrplClient()
//   const companyWallet = Wallet.fromSeed(companySeed)
//   const tx = {
//     TransactionType: 'EscrowCreate',
//     Account:         companyWallet.address,
//     Destination:     schoolAddress,
//     Amount:          amountDrops,
//     FinishAfter:     finishAfter
//   }
//   const prepared = await client.autofill(tx)
//   await client.disconnect()
//   return { txUnsignedJSON: prepared }
// }

// 5) Prepare EscrowCreate with a FinishAfter timestamp
export async function prepareEscrowCreate({
  companySeed,
  schoolAddress,
  amountDrops
}) {
  const client = await getXrplClient()
  const companyWallet = Wallet.fromSeed(companySeed)

  // Compute FinishAfter = now + 1s in Ripple epoch
  const unixSec     = Math.floor(Date.now() / 1000)
  const rippleNow   = unixSec - 946684800            // ripple epoch offset
  const finishAfter = rippleNow + 1                  // allow finish immediately

  const tx = {
    TransactionType: 'EscrowCreate',
    Account:         companyWallet.address,
    Destination:     schoolAddress,
    Amount:          amountDrops,
    FinishAfter:     finishAfter     // <-- satisfies "FinishAfter" requirement
  }

  const prepared = await client.autofill(tx)
  await client.disconnect()
  return { txUnsignedJSON: prepared }
}

// 6) Prepare EscrowFinish (must include the original creator as Owner)
export async function prepareEscrowFinish({
  schoolSeed,
  escrowSequence,
  ownerAddress
}) {
  const client = await getXrplClient()
  const schoolWallet = Wallet.fromSeed(schoolSeed)
  const tx = {
    TransactionType: 'EscrowFinish',
    Account:         schoolWallet.address,
    Owner:           ownerAddress,
    OfferSequence:   escrowSequence
  }
  const prepared = await client.autofill(tx)
  const signed   = schoolWallet.sign(prepared)
  await client.disconnect()
  return { txSignedBlob: signed.tx_blob }
}

// 7) Prepare NFTokenBurn
export async function prepareBurnNFT({ companySeed, nftTokenID }) {
  const client = await getXrplClient()
  const companyWallet = Wallet.fromSeed(companySeed)
  const tx = {
    TransactionType: 'NFTokenBurn',
    Account:         companyWallet.address,
    NFTokenID:       nftTokenID
  }
  const prepared = await client.autofill(tx)
  const signed   = companyWallet.sign(prepared)
  await client.disconnect()
  return { txUnsignedJSON: prepared, txSignedBlob: signed.tx_blob }
}
