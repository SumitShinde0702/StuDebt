# StuDebt (now known as XFund)

Empowering Students. Connecting Companies. Funding Futures.

---

XFund is a next-generation platform that connects students seeking educational funding with companies willing to sponsor their education in exchange for future work commitments. By leveraging blockchain technology (XRPL) and a transparent offer system, XFund creates a win-win ecosystem for students and companies alike.

## 🚀 Project Overview

**XFund** enables students to create loan requests for their education, and companies to make sponsorship offers. Students can review, accept, or reject offers, and once an agreement is reached, the process is managed transparently on-chain using XRPL escrow and NFT technology.

## 🌟 Key Features

- **Student Loan Requests:** Students can create, save as draft, edit, and manage loan requests for their education.
- **Company Sponsorships:** Companies can browse open requests, make offers, and manage active sponsorships.
- **Offer & Counter-Offer System:** Multiple companies can make offers; students can accept, reject, or let offers expire.
- **Agreement Management:** Once an offer is accepted, a blockchain-backed agreement is created, with payment and work terms tracked transparently.
- **Role-Based Dashboards:** Separate, intuitive dashboards for students and companies.
- **Profile Management:** Both students and companies can manage their profiles and upload relevant documents.
- **Modern UI/UX:** Built with React, Material UI, and responsive design for a seamless experience.

## 🛠️ Technology Stack

- **Frontend:** React + Vite, Material UI, React Router, React Query, Formik, Yup
- **Backend:** Node.js, Express, MongoDB, Mongoose
- **Blockchain:** XRPL (XRP Ledger), NFT & Escrow integration
- **Authentication:** JWT-based, role-aware

## ⚡ Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sumitshinde0702/studebt.git
   cd studebt
   ```
2. **Install dependencies:**
   ```bash
   cd frontend && npm install
   cd ../ && npm install
   ```
3. **Set up environment variables:**
   - Copy `.env.example` to `.env` in both root and frontend folders and fill in your config (MongoDB URI, JWT secret, XRPL server, etc).
4. **Run the backend:**
   ```bash
   npm run dev
   ```
5. **Run the frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
6. **Access the app:**
   - Open [http://localhost:5173](http://localhost:5173) in your browser.

## 📸 Screenshots

> _Coming Soon_

## 🤝 Contributing

Contributions are welcome! Please open issues or submit pull requests to help improve Xfund.

## 📄 License

MIT License

---

**XFund** — Funding education, building futures, powered by blockchain.