// xrplHelpers.js

import { Client, Wallet } from 'xrpl'
import moment from 'moment-timezone'
import dotenv from 'dotenv'
dotenv.config()

// 1. Connect to XRPL (Testnet)
async function getXrplClient() {
  const client = new Client(process.env.XRPL_SERVER)
  await client.connect()
  return client
}

/**
 * 2. Prepare (and sign) an NFTokenMint transaction:
 *    - The student will mint an NFT to themselves containing the loan metadata URI.
 *    - metadataURI: string, e.g. "ipfs://QmXYZ..."
 *    - studentSeed: the student’s XRPL secret (never share this in production; 
 *      normally you’d return the unsigned tx to the front end to be signed by XUMM).
 */
export async function prepareMintDebtNFT({ studentSeed, metadataURI }) {
  const client = await getXrplClient()
  const studentWallet = Wallet.fromSeed(studentSeed)

  // Convert the UTF-8 URI (like "ipfs://…") into hex for the XRPL field
  const uriHex = Buffer.from(metadataURI, 'utf8').toString('hex').toUpperCase()

  // Build the NFTokenMint transaction payload
  const mintTx = {
    TransactionType: 'NFTokenMint',
    Account:         studentWallet.address,
    URI:             uriHex,
    Flags:           8,    // tfTransferable + tfBurnable (bitmask 0x8)
    NFTokenTaxon:    0     // arbitrary category (we don’t need categories here)
  }

  // Automatically fill in Fee, Sequence, LastLedgerSequence
  const prepared = await client.autofill(mintTx)
  // Sign it with the student’s seed (in production, you’d let XUMM do this step!)
  const signed = studentWallet.sign(prepared)

  await client.disconnect()
  return {
    txUnsignedJSON: prepared,  // for a real front-end to sign
    txSignedBlob: signed.tx_blob
  }
}

/**
 * 3. Prepare (and sign) an NFTokenCreateOffer with Amount = "0":
 *    - After minting, the student lists the NFT for “sale” at 0 XRP, 
 *      so that when the company accepts, the NFT moves from student → company.
 */
export async function prepareSellOfferZero({ studentSeed, nftTokenID }) {
  const client = await getXrplClient()
  const studentWallet = Wallet.fromSeed(studentSeed)

  const sellOfferTx = {
    TransactionType: 'NFTokenCreateOffer',
    Account:         studentWallet.address,
    NFTokenID:       nftTokenID,
    Amount:          '0',       // 0 drops = free transfer
    Flags:           1          // tfSellToken = 1 (list for sale)
  }

  const prepared = await client.autofill(sellOfferTx)
  const signed = studentWallet.sign(prepared)

  await client.disconnect()
  return {
    txUnsignedJSON: prepared,
    txSignedBlob: signed.tx_blob
  }
}

/**
 * 4. Prepare (and sign) an NFTokenAcceptOffer:
 *    - The company uses this to “buy” the NFT from the student (for 0 XRP).
 */
export async function prepareAcceptOffer({ companySeed, sellOfferIndex }) {
  const client = await getXrplClient()
  const companyWallet = Wallet.fromSeed(companySeed)

  const acceptTx = {
    TransactionType:    'NFTokenAcceptOffer',
    Account:            companyWallet.address,
    NFTokenSellOffer:   sellOfferIndex
  }

  const prepared = await client.autofill(acceptTx)
  const signed = companyWallet.sign(prepared)

  await client.disconnect()
  return {
    txUnsignedJSON: prepared,
    txSignedBlob: signed.tx_blob
  }
}

/**
 * 5. Prepare EscrowCreate:
 *    - Company locks up a specified amount of XRP for the school,
 *      to be released automatically at fee-due date.
 *    - We compute FinishAfter as UNIX timestamp at 00:00 Asia/Singapore on dueDateIso.
 */
export async function prepareEscrowCreate({ companySeed, schoolAddress, amountDrops, dueDateIso }) {
  // Convert "YYYY-MM-DD" in Asia/Singapore to a UNIX timestamp
  const finishAfter = moment
    .tz(dueDateIso + ' 00:00:00', 'YYYY-MM-DD HH:mm:ss', 'Asia/Singapore')
    .unix()

  const client = await getXrplClient()
  const companyWallet = Wallet.fromSeed(companySeed)

  const escrowTx = {
    TransactionType: 'EscrowCreate',
    Account:         companyWallet.address,
    Destination:     schoolAddress,
    Amount:          amountDrops,
    FinishAfter:     finishAfter
  }

  const prepared = await client.autofill(escrowTx)
  const signed = companyWallet.sign(prepared)

  await client.disconnect()
  return {
    txUnsignedJSON: prepared,
    txSignedBlob: signed.tx_blob
  }
}

/**
 * 6. Prepare EscrowFinish:
 *    - Once FinishAfter has passed, the school (or anyone) can call this to release the funds.
 *    - escrowSequence: the Sequence number from the original EscrowCreate (or the Escrow's index).
 */
export async function prepareEscrowFinish({ schoolSeed, escrowSequence }) {
  const client = await getXrplClient()
  const schoolWallet = Wallet.fromSeed(schoolSeed)

  const finishTx = {
    TransactionType: 'EscrowFinish',
    Account:         schoolWallet.address,
    Owner:           schoolWallet.address,
    OfferSequence:   escrowSequence
  }

  const prepared = await client.autofill(finishTx)
  const signed = schoolWallet.sign(prepared)

  await client.disconnect()
  return {
    txUnsignedJSON: prepared,
    txSignedBlob: signed.tx_blob
  }
}

/**
 * 7. Prepare NFTokenBurn:
 *    - When the loan is fully repaid, the company burns the NFT to signal “loan closed.”
 */
export async function prepareBurnNFT({ companySeed, nftTokenID }) {
  const client = await getXrplClient()
  const companyWallet = Wallet.fromSeed(companySeed)

  const burnTx = {
    TransactionType: 'NFTokenBurn',
    Account:         companyWallet.address,
    NFTokenID:       nftTokenID
  }

  const prepared = await client.autofill(burnTx)
  const signed = companyWallet.sign(prepared)

  await client.disconnect()
  return {
    txUnsignedJSON: prepared,
    txSignedBlob: signed.tx_blob
  }
}

export { getXrplClient }