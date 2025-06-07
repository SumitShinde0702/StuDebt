// models/LoanAgreement.js
import mongoose from 'mongoose'

const EscrowScheduleSchema = new mongoose.Schema({
  amountDrops: { type: String, required: true },   // e.g. "2000000000" = 2000 XRP
  dueDate:     { type: Date,   required: true },
  escrowIndex: { type: String, default: null },    // XRPL Escrow index once created
  isReleased:  { type: Boolean, default: false }   // true after EscrowFinish
})

const LoanAgreementSchema = new mongoose.Schema({
  requestId:        { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  offerId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Offer',       required: true },
  studentAddress:   { type: String, required: true },
  companyAddress:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  schoolAddress:    { type: String, required: true },
  interestRate:     { type: Number, required: true },
  principalDrops:   { type: String, required: true }, // original principal in drops
  totalOwedDrops:   { type: String, required: true }, // principal + interest
  amountPaidDrops:  { type: String, default: '0' },   // track repayments
  feeSchedule:      { type: [EscrowScheduleSchema], required: true },
  nftTokenID:       { type: String, default: null },  // set once minted
  sellOfferIndex:   { type: String, default: null },  // set when student creates a SellOffer(0)
  status: {
    type: String,
    enum: ['AWAITING_FUNDING','FUNDED','REPAYING','REPAID','CLOSED'],
    default: 'AWAITING_FUNDING'
  },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('LoanAgreement', LoanAgreementSchema)
