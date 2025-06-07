// testDb.js
import dotenv from 'dotenv'
dotenv.config()

import axios from 'axios'
import mongoose from 'mongoose'
import LoanRequest from './models/LoanRequest.js'

async function main() {
  const baseURL = 'http://localhost:3000'

  // 1. Create a sample loan request via your API
  console.log('👉 POST /loan-requests')
  const sample = {
    studentAddress:   'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    studentName:      'Alice Test',
    schoolAddress:    'rU2RuLbjZL41DgrJQLWJm9TUqSFC5u3VyJ',
    program:          'CompSci',
    totalAmountDrops: '500000000',
    feeSchedule: [
      { amountDrops: '250000000', dueDate: '2025-09-01' },
      { amountDrops: '250000000', dueDate: '2026-01-01' }
    ],
    graduationDate: '2027-06-01',
    industry:       'Tech',
    description:    'Test loan request'
  }
  const postRes = await axios.post(
    `${baseURL}/loan-requests`,
    sample
  )
  console.log('POST response:', postRes.data)

  // 2. Read them back via your API (note the /api/ prefix)
  console.log('\n👉 GET /api/loan-requests')
  const getRes = await axios.get(`${baseURL}/api/loan-requests`)
  console.log('GET response:', getRes.data)

  // 3. Directly connect to MongoDB to verify
  console.log('\n🔌 Connecting directly to MongoDB…')
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  const docs = await LoanRequest.find().lean()
  console.log('MongoDB documents in LoanRequest collection:\n', docs)

  await mongoose.disconnect()
}

main()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err)
    process.exit(1)
  })
