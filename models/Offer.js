// models/Offer.js
import mongoose from 'mongoose'

const OfferSchema = new mongoose.Schema({
  requestId:         { type: mongoose.Schema.Types.ObjectId, ref: 'LoanRequest', required: true },
  companyAddress:    { type: String, required: true },  // XRPL address of the company
  interestRate:      { type: Number, required: true },  // e.g. 0.035 for 3.5%
  workObligationYears: { type: Number, default: 0 },    // e.g. 4 years of work after graduation
  tAndC_URI:         { type: String, required: true },  // an IPFS link or plain text with terms
  status: {
    type: String,
    enum: ['PENDING','REJECTED','ACCEPTED','CANCELLED'],
    default: 'PENDING'
  },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('Offer', OfferSchema)
