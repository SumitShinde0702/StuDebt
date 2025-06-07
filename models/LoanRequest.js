// models/LoanRequest.js
import mongoose from 'mongoose'

const FeeScheduleSchema = new mongoose.Schema({
  amountDrops: { type: String, required: true },
  dueDate:     { type: Date,   required: true }
})

const LoanRequestSchema = new mongoose.Schema({
  studentAddress:   { type: String, required: function() { return this.status !== 'DRAFT'; } },
  studentName:      { type: String, required: function() { return this.status !== 'DRAFT'; } },
  schoolAddress:    { type: String, required: function() { return this.status !== 'DRAFT'; } },
  program:          { type: String, required: function() { return this.status !== 'DRAFT'; } },
  totalAmountDrops: { type: String, required: function() { return this.status !== 'DRAFT'; } },
  currency:         { type: String, enum: ['XRP','USDC'], default: 'XRP' },
  feeSchedule: {
    type: [FeeScheduleSchema],
    required: function() { return this.status !== 'DRAFT'; }
  },
  graduationDate:   { type: Date, required: function() { return this.status !== 'DRAFT'; } },
  industry:         { type: String, required: function() { return this.status !== 'DRAFT'; } },
  description:      { type: String },
  status: {
    type: String,
    enum: ['DRAFT','OPEN','UNDER_NEGOTIATION','ACCEPTED','CLOSED'],
    default: 'OPEN'
  },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('LoanRequest', LoanRequestSchema)
