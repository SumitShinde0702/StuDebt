// models/LoanRequest.js
import mongoose from 'mongoose'

const FeeScheduleSchema = new mongoose.Schema({
  amountDrops: { type: String, required: true }, // e.g. "500000000" = 500 XRP in drops
  dueDate:     { type: Date,   required: true }  // due date at midnight (ISO format)
})

const LoanRequestSchema = new mongoose.Schema({
  studentAddress:   { type: String, required: true }, // XRPL classic address (r...)
  studentName:      { type: String, required: true },
  schoolAddress:    { type: String, required: true }, // XRPL classic address for school
  program:          { type: String, required: true },
  totalAmountDrops: { type: String, required: true }, // e.g. "8000000000" = 8,000 XRP
  currency:         { type: String, enum: ['XRP','USDC'], default: 'XRP' },
  feeSchedule:      { type: [FeeScheduleSchema], required: true },
  graduationDate:   { type: Date,   required: true },
  industry:         { type: String, required: true },
  description:      { type: String },
  status: {
    type: String,
    enum: ['OPEN','UNDER_NEGOTIATION','ACCEPTED','CLOSED'],
    default: 'OPEN'
  },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('LoanRequest', LoanRequestSchema)
