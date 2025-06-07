// server.js

import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import dotenv from 'dotenv'
import cors from 'cors'
import User from './models/User.js'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
dotenv.config()

// Import our Mongoose models
import LoanRequest from './models/LoanRequest.js'
import Offer        from './models/Offer.js'
import LoanAgreement from './models/LoanAgreement.js'

// Import our XRPL helper functions
import {
  prepareMintDebtNFT,
  prepareSellOfferZero,
  prepareAcceptOffer,
  prepareEscrowCreate,
  prepareEscrowFinish,
  prepareBurnNFT,
  getXrplClient
} from './xrplHelpers.js'

// for the NFT metadata
import { pinJSONToIPFS } from './pinata.js'

const app = express()
app.use(cors())
app.use(bodyParser.json()) // parse JSON bodies

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser:    true,
  useUnifiedTopology: true
})
  .then(async () => {
    console.log('✅ Connected to MongoDB')
    await seedDemoData()
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1)
  })

// ---------------
// 2. Route: Student creates a LoanRequest
// POST /loan-requests
// Body: {
//    studentAddress, studentName, schoolAddress,
//    program, totalAmountDrops, feeSchedule: [{ amountDrops, dueDate }], graduationDate, industry, description
// }
app.post('/api/loan-requests', async (req, res) => {
  try {
    const {
      studentAddress,
      studentName,
      schoolAddress,
      program,
      totalAmountDrops,
      feeSchedule,
      graduationDate,
      industry,
      description,
      status
    } = req.body

    // Create a new LoanRequest document
    const newRequest = new LoanRequest({
      studentAddress,
      studentName,
      schoolAddress,
      program,
      totalAmountDrops,
      feeSchedule,
      graduationDate,
      industry,
      description,
      status: status || 'OPEN'
    })
    await newRequest.save()

    // Return the new requestId to the client
    return res.status(201).json({ requestId: newRequest._id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to create LoanRequest' })
  }
})

// ---------------
// 3. Route: Company lists all OPEN LoanRequests (with optional filter by industry)
// GET /loan-requests?industry=Tech
app.get('/api/loan-requests', async (req, res) => {
  try {
    const filter = { status: 'OPEN' }
    if (req.query.industry) {
      filter.industry = req.query.industry
    }
    const requests = await LoanRequest.find(filter).lean()
    return res.json(requests)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch loan requests' })
  }
})

// Get a single loan request by ID
app.get('/api/loan-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const loanRequest = await LoanRequest.findById(id);
    if (!loanRequest) {
      return res.status(404).json({ error: 'Loan request not found' });
    }
    res.json(loanRequest);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch loan request' });
  }
});

// ---------------
// 4. Route: Company creates an Offer for a particular LoanRequest
// POST /loan-requests/:requestId/offers
// Body: { companyAddress, interestRate, workObligationYears, tAndC_URI }
app.post('/api/loan-requests/:requestId/offers', async (req, res) => {
  try {
    const { requestId } = req.params
    const { companyAddress, interestRate, workObligationYears, tAndC_URI } = req.body

    // Verify that the LoanRequest exists and is OPEN
    const loanReq = await LoanRequest.findById(requestId)
    if (!loanReq || loanReq.status !== 'OPEN') {
      return res.status(400).json({ error: 'LoanRequest not found or not OPEN' })
    }

    // Create a new Offer document
    const newOffer = new Offer({
      requestId,
      companyAddress,
      interestRate,
      workObligationYears,
      tAndC_URI
    })
    await newOffer.save()

    // Mark the LoanRequest as UNDER_NEGOTIATION
    loanReq.status = 'UNDER_NEGOTIATION'
    await loanReq.save()

    return res.status(201).json({ offerId: newOffer._id })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to create Offer' })
  }
})

// ---------------
// 5. Route: Student views all PENDING Offers on their LoanRequest
// GET /loan-requests/:requestId/offers
app.get('/api/loan-requests/:requestId/offers', async (req, res) => {
  try {
    const { requestId } = req.params
    const offers = await Offer.find({ requestId, status: 'PENDING' }).lean()
    return res.json(offers)
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to fetch offers' })
  }
})

// ---------------
// 6. Route: Student accepts an Offer → create LoanAgreement + prepare NFT mint
// POST /loan-requests/:requestId/accept-offer
// Body: { offerId, studentSeed, metadataURI }
app.post('/api/loan-requests/:requestId/accept-offer', async (req, res) => {
  try {
    const { requestId } = req.params
    const { offerId, studentSeed } = req.body

    // 6.1 Verify LoanRequest + Offer
    const loanReq = await LoanRequest.findById(requestId)
    if (!loanReq) {
      return res.status(404).json({ error: 'LoanRequest not found' })
    }
    const offer = await Offer.findById(offerId)
    if (!offer || offer.requestId.toString() !== requestId || offer.status !== 'PENDING') {
      return res.status(400).json({ error: 'Offer invalid or not PENDING' })
    }
    // (In production, also verify that the caller actually "owns" loanReq.studentAddress,
    // e.g. via a signed challenge, JWT, or XUMM wallet integration.)

    // 6.2 Build the LoanAgreement document
    const principalDrops = loanReq.totalAmountDrops
    // Calculate interest amount in drops (rounded down)
    const interestAmountDrops = String(
      Math.floor(Number(principalDrops) * Number(offer.interestRate))
    )
    const totalOwedDrops = String(Number(principalDrops) + Number(interestAmountDrops))

    // Copy the fee schedule from LoanRequest
    const feeSchedule = loanReq.feeSchedule.map(item => ({
      amountDrops: item.amountDrops,
      dueDate:     item.dueDate,
      escrowIndex: null,
      isReleased:  false
    }))

    const newLoan = new LoanAgreement({
      requestId,
      offerId,
      studentAddress: loanReq.studentAddress,
      companyAddress: offer.companyAddress,
      schoolAddress:  loanReq.schoolAddress,
      interestRate:   offer.interestRate,
      principalDrops,
      totalOwedDrops,
      amountPaidDrops: '0',
      feeSchedule,
      status: 'AWAITING_FUNDING'
    })
    await newLoan.save()

    // 6.3 Update statuses of Offer + LoanRequest
    offer.status = 'ACCEPTED'
    await offer.save()

    loanReq.status = 'ACCEPTED'
    await loanReq.save()

    // === NEW: Pin the loan metadata JSON to IPFS via Pinata ===
    // Build your metadata object:
    const metadata = {
      requestId: newLoan._id.toString(),
      student:   loanReq.studentName,
      studentAddress: loanReq.studentAddress,
      schoolAddress:  loanReq.schoolAddress,
      program:        loanReq.program,
      principalDrops: newLoan.principalDrops,
      interestRate:   newLoan.interestRate,
      totalOwedDrops: newLoan.totalOwedDrops,
      feeSchedule:    newLoan.feeSchedule.map(f => ({
        amountDrops: f.amountDrops,
        dueDate:     f.dueDate.toISOString().slice(0,10)
      })),
      workObligationYears: offer.workObligationYears,
      tAndC_URI:           offer.tAndC_URI,
      createdAt:           newLoan.createdAt.toISOString()
    }
    // Pin it:
    const metadataURI = await pinJSONToIPFS(metadata)

    // 6.4 Now prepare the NFT‐mint TX, using the IPFS URI
    const { txUnsignedJSON: mintTxJSON } = await prepareMintDebtNFT({
      studentSeed,
      metadataURI
    })

    return res.json({
      loanId: newLoan._id,
      mintTxJSON
      // Front-end should now push this JSON into XUMM or any XRPL wallet to sign & submit.
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed in accept-offer' })
  }
})

// ---------------
// 7. Route: After the student's client successfully submits the mint, 
//          they will have the new nftTokenID. We let them call an endpoint
//          to build the SellOffer(0) TX so the company can accept.
// GET /loan-agreements/:loanId/prepare-sell-offer?studentSeed=…&nftTokenID=…
app.get('/api/loan-agreements/:loanId/prepare-sell-offer', async (req, res) => {
  try {
    const { loanId } = req.params
    const { studentSeed, nftTokenID } = req.query

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'AWAITING_FUNDING') {
      return res.status(400).json({ error: 'Loan not in AWAITING_FUNDING state' })
    }

    // Build the SellOffer(0) for that NFT
    const { txUnsignedJSON: sellOfferJSON } = await prepareSellOfferZero({
      studentSeed,
      nftTokenID
    })

    return res.json({ sellOfferJSON })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to prepare sell-offer' })
  }
})

// ---------------
// 8. Route: Once the student's SellOffer(0) succeeds on-chain, the client
//          will get an OfferIndex (like a unique integer or hex). They
//          notify us so we can store it.
// POST /loan-agreements/:loanId/record-sell-offer
// Body: { sellOfferIndex }
app.post('/api/loan-agreements/:loanId/record-sell-offer', async (req, res) => {
  try {
    const { loanId } = req.params
    const { sellOfferIndex } = req.body

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'AWAITING_FUNDING') {
      return res.status(400).json({ error: 'Loan not in AWAITING_FUNDING' })
    }
    loan.sellOfferIndex = sellOfferIndex
    await loan.save()
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to record sell-offer' })
  }
})

// ---------------
// 9. Route: Company prepares an NFTokenAcceptOffer to "grab" that NFT
// GET /loan-agreements/:loanId/prepare-accept-offer?companySeed=…
app.get('/api/loan-agreements/:loanId/prepare-accept-offer', async (req, res) => {
  try {
    const { loanId } = req.params
    const { companySeed } = req.query

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'AWAITING_FUNDING' || !loan.sellOfferIndex) {
      return res.status(400).json({ error: 'Loan not ready for funding' })
    }

    const { txUnsignedJSON: acceptJSON } = await prepareAcceptOffer({
      companySeed,
      sellOfferIndex: loan.sellOfferIndex
    })
    return res.json({ acceptJSON })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to prepare accept-offer' })
  }
})

// ---------------
// 10. Route: Once the company submits the NFTokenAcceptOffer on-chain,
//           they send us the nftTokenID so we can mark "FUNDED".
// POST /loan-agreements/:loanId/record-accepted
// Body: { nftTokenID }
app.post('/api/loan-agreements/:loanId/record-accepted', async (req, res) => {
  try {
    const { loanId } = req.params
    const { nftTokenID } = req.body

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'AWAITING_FUNDING') {
      return res.status(400).json({ error: 'Loan not in AWAITING_FUNDING' })
    }

    loan.nftTokenID = nftTokenID
    loan.status = 'FUNDED'
    await loan.save()
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to record accepted' })
  }
})

// ---------------
// 11. Route: Company asks for EscrowCreate TXs for each installment
// GET /loan-agreements/:loanId/prepare-escrows?companySeed=…
app.get('/api/loan-agreements/:loanId/prepare-escrows', async (req, res) => {
  try {
    const { loanId } = req.params
    const { companySeed } = req.query

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'FUNDED') {
      return res.status(400).json({ error: 'Loan not in FUNDED state' })
    }

    const escrowTxs = []
    for (let i = 0; i < loan.feeSchedule.length; i++) {
      const feeItem = loan.feeSchedule[i]
      // If we already created an EscrowFor this installment, skip it
      if (feeItem.escrowIndex || feeItem.isReleased) continue

      // Prepare an EscrowCreate for this item
      const { txUnsignedJSON } = await prepareEscrowCreate({
        companySeed,
        schoolAddress: loan.schoolAddress,
        amountDrops: feeItem.amountDrops,
        dueDateIso: feeItem.dueDate.toISOString().slice(0, 10) // "YYYY-MM-DD"
      })
      escrowTxs.push({ installmentIndex: i, escrowTxJSON: txUnsignedJSON })
    }
    return res.json({ escrowTxs })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to prepare escrows' })
  }
})

// ---------------
// 12. Route: Once the company submits each EscrowCreate on-chain,
//           they return the escrowSequence so we store it.
// POST /loan-agreements/:loanId/record-escrow
// Body: { installmentIndex, escrowSequence }
app.post('/api/loan-agreements/:loanId/record-escrow', async (req, res) => {
  try {
    const { loanId } = req.params
    const { installmentIndex, escrowSequence } = req.body

    const loan = await LoanAgreement.findById(loanId)
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' })
    }
    loan.feeSchedule[installmentIndex].escrowIndex = escrowSequence
    await loan.save()
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to record escrow' })
  }
})

// ---------------
// 13. Background job: finish matured escrows automatically
// (Run every hour or so; here, we'll just define the function and kick it off with setInterval)

async function processMaturedEscrows() {
  try {
    const client = await getXrplClient()

    // Find all loans in status=FUNDED where some feeSchedule items have:
    //    escrowIndex != null AND isReleased == false
    const loans = await LoanAgreement.find({
      status: 'FUNDED',
      'feeSchedule.escrowIndex': { $ne: null },
      'feeSchedule.isReleased': false
    })

    for (const loan of loans) {
      for (let i = 0; i < loan.feeSchedule.length; i++) {
        const feeItem = loan.feeSchedule[i]
        if (feeItem.isReleased || !feeItem.escrowIndex) continue

        // Fetch the school's account_objects of type "escrow"
        const resp = await client.request({
          command: 'account_objects',
          account: loan.schoolAddress,
          ledger_index: 'current',
          type: 'escrow'
        })
        const escrows = resp.result.account_objects

        // Find the matching escrow row
        const matching = escrows.find(e => String(e.index) === String(feeItem.escrowIndex))
        if (!matching) {
          // Already finished or missing; mark isReleased = true
          loan.feeSchedule[i].isReleased = true
          continue
        }

        const nowUnix = Math.floor(Date.now() / 1000)
        if (matching.FinishAfter <= nowUnix) {
          // Prepare & submit EscrowFinish (signed by the school)
          const { txSignedBlob } = await prepareEscrowFinish({
            schoolSeed: process.env.SCHOOL_SECRET,
            escrowSequence: Number(feeItem.escrowIndex)
          })
          const result = await client.submitAndWait(txSignedBlob)
          if (result.result.meta.TransactionResult === 'tesSUCCESS') {
            loan.feeSchedule[i].isReleased = true
          }
        }
      }
      // If all installments are released, move status to REPAYING
      if (loan.feeSchedule.every(f => f.isReleased)) {
        loan.status = 'REPAYING'
      }
      await loan.save()
    }

    await client.disconnect()
  } catch (err) {
    console.error('Error in processMaturedEscrows:', err)
  }
}

// Run every hour (3600000 ms):
setInterval(processMaturedEscrows, 60 * 60 * 1000)

// ---------------
// 14. WebSocket listener for student repayments
//    We want to watch for any Payment from student → company with MemoType="LoanRepayment"
//    and MemoData set to that loan's ID. For simplicity, we'll re-subscribe whenever the server starts.

async function startPaymentListener() {
  try {
    const client = await getXrplClient()

    // Find all loans that are in status=REPAYING
    const loans = await LoanAgreement.find({ status: 'REPAYING' })
    const accountsToWatch = loans.map(l => l.studentAddress)
    if (accountsToWatch.length === 0) {
      // No active repayment watchers
      await client.disconnect()
      return
    }

    // Subscribe to all those student accounts
    await client.request({
      command: 'subscribe',
      accounts: accountsToWatch
    })

    client.on('transaction', async (event) => {
      const tx = event.transaction
      if (tx.TransactionType !== 'Payment') return

      const from = tx.Account
      const to   = tx.Destination
      const amountDrops = tx.Amount
      const memos = tx.Memos || []

      if (memos.length === 0) return
      // Decode the first memo
      const memoType = Buffer.from(memos[0].Memo.MemoType, 'hex').toString('utf8')
      const memoData = Buffer.from(memos[0].Memo.MemoData, 'hex').toString('utf8')
      if (memoType !== 'LoanRepayment') return

      // Look up the LoanAgreement by ID (memoData)
      const loan = await LoanAgreement.findById(memoData)
      if (!loan) return

      // Check it's from the right student to the right company
      if (from === loan.studentAddress && to === loan.companyAddress) {
        loan.amountPaidDrops = String(Number(loan.amountPaidDrops) + Number(amountDrops))
        // Once fully repaid, mark REPAID
        if (Number(loan.amountPaidDrops) >= Number(loan.totalOwedDrops)) {
          loan.status = 'REPAID'
        }
        await loan.save()
      }
    })

    // We leave the connection open so it keeps listening
  } catch (err) {
    console.error('Error in startPaymentListener:', err)
  }
}

// Launch the payment listener once at startup
startPaymentListener()

// ---------------
// 15. Route: Company prepares NFT burn (loan closed) once status === REPAID
// GET /loan-agreements/:loanId/prepare-burn?companySeed=…
app.get('/api/loan-agreements/:loanId/prepare-burn', async (req, res) => {
  try {
    const { loanId } = req.params
    const { companySeed } = req.query

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'REPAID' || !loan.nftTokenID) {
      return res.status(400).json({ error: 'Loan not in REPAID state or missing NFT' })
    }

    const { txUnsignedJSON: burnJSON } = await prepareBurnNFT({
      companySeed,
      nftTokenID: loan.nftTokenID
    })
    return res.json({ burnJSON })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to prepare burn' })
  }
})

// 16. Route: Company notifies backend that burn succeeded → set status = CLOSED
// POST /loan-agreements/:loanId/record-burn
app.post('/api/loan-agreements/:loanId/record-burn', async (req, res) => {
  try {
    const { loanId } = req.params

    const loan = await LoanAgreement.findById(loanId)
    if (!loan || loan.status !== 'REPAID') {
      return res.status(400).json({ error: 'Loan not in REPAID state' })
    }
    loan.status = 'CLOSED'
    await loan.save()
    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: 'Failed to record burn' })
  }
})

// ---------------
// 17. Start the Express server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`)
})

// Registration Route
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, school, program, graduationYear, industry, companySize, location } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }
    const user = new User({
      name,
      email,
      password,
      role,
      // Only add these if present
      ...(role === 'student' ? { school, program, graduationYear } : { industry, companySize, location })
    });
    await user.save();
    // Create JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/validate', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    // Optionally, fetch user from DB to check if still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// Student Profile & Dashboard Endpoints
app.get('/api/student/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/student/loan-requests', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const requests = await LoanRequest.find({ studentAddress: decoded.id })
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/student/offers', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    // Get all loan requests by this student
    const requests = await LoanRequest.find({ studentAddress: decoded.id });
    const requestIds = requests.map(r => r._id);
    // Get all offers for these requests
    const offers = await Offer.find({ requestId: { $in: requestIds } })
      .populate('companyAddress', 'name industry location')
      .sort({ createdAt: -1 });
    res.json({ offers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/student/agreements', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'student') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const agreements = await LoanAgreement.find({ studentAddress: decoded.id })
      .populate('companyAddress', 'name industry location')
      .sort({ createdAt: -1 });
    res.json({ agreements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Company Profile & Dashboard Endpoints
app.get('/api/company/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'company') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/company/offers', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'company') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const offers = await Offer.find({ companyAddress: decoded.id })
      .populate({
        path: 'requestId',
        populate: { path: 'studentAddress', select: 'name school program graduationYear' }
      })
      .sort({ createdAt: -1 });
    res.json({ offers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/company/agreements', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'company') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const agreements = await LoanAgreement.find({ companyAddress: decoded.id })
      .populate('studentAddress', 'name school program graduationYear')
      .sort({ createdAt: -1 });
    res.json({ agreements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all available loan requests for companies to view
app.get('/api/company/available-requests', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    if (decoded.role !== 'company') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const requests = await LoanRequest.find({ status: 'OPEN' })
      .populate('studentAddress', 'name school program graduationYear')
      .sort({ createdAt: -1 });
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DEMO DATA SEEDING ---
async function seedDemoData() {
  // Demo student
  const studentEmail = 'student@gmail.com';
  const companyEmail = 'company@gmail.com';
  const studentPassword = 'pass';
  const companyPassword = 'pass';

  // 1. Create demo student if not exists
  let student = await User.findOne({ email: studentEmail });
  if (!student) {
    student = new User({
      name: 'Demo Student',
      email: studentEmail,
      password: studentPassword,
      role: 'student',
      school: 'NUS',
      program: 'Information Systems',
      graduationYear: '2025',
    });
    await student.save();
    console.log('✅ Demo student created');
  }

  // 2. Create demo company if not exists
  let company = await User.findOne({ email: companyEmail });
  if (!company) {
    company = new User({
      name: 'MicroHard',
      email: companyEmail,
      password: companyPassword,
      role: 'company',
      industry: 'Technology',
      companySize: '51-200',
      location: 'Singapore',
    });
    await company.save();
    console.log('✅ Demo company created');
  }

  // 3. Create a demo loan request for the student if not exists
  let loanRequest = await LoanRequest.findOne({ studentAddress: student._id });
  if (!loanRequest) {
    loanRequest = new LoanRequest({
      studentAddress: student._id,
      studentName: student.name,
      schoolAddress: 'NUS',
      program: 'Information Systems',
      totalAmountDrops: '5000',
      feeSchedule: [
        { amountDrops: '2500', dueDate: new Date('2025-01-01') },
        { amountDrops: '2500', dueDate: new Date('2025-06-01') },
      ],
      graduationDate: new Date('2025-06-01'),
      industry: 'Technology',
      description: 'Funding for final year tuition',
      status: 'OPEN',
    });
    await loanRequest.save();
    console.log('✅ Demo loan request created');
  }

  // 4. Create a demo offer from the company to the student's loan request if not exists
  let offer = await Offer.findOne({ requestId: loanRequest._id, companyAddress: company._id });
  if (!offer) {
    offer = new Offer({
      requestId: loanRequest._id,
      companyAddress: company._id,
      interestRate: 0.05,
      workObligationYears: 2,
      tAndC_URI: 'Demo T&C',
      status: 'PENDING',
    });
    await offer.save();
    console.log('✅ Demo offer created');
  }
}

app.put('/api/loan-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await LoanRequest.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update loan request' });
  }
});

app.delete('/api/loan-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await LoanRequest.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete loan request' });
  }
});
