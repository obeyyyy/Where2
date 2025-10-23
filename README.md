# ✈️ Where2 - Seamless Flight & Hotel Booking Platform

Where2 is a modern travel booking platform that revolutionizes the way users plan and book their trips by combining flight and hotel bookings into a single, seamless experience. No more switching between multiple websites or dealing with the hassle of coordinating separate bookings.

## 🎯 The Problem We Solve

Planning a trip typically involves:
- Searching multiple websites for flights
- Then searching again for hotels
- Manually cross-referencing locations and dates
- Juggling multiple tabs and price comparisons
- Risking availability issues when booking separately

**Where2 solves this** by providing an integrated platform where users can search, compare, and book both flights and hotels together, ensuring a cohesive travel experience.

## ✨ Key Features

### 🛫 Integrated Search & Booking
- Search for flights and hotels simultaneously
- View combined pricing for your entire trip
- Book everything in one transaction

### 🏨 Smart Hotel Matching
- Hotels automatically filtered by proximity to your arrival airport
- Real-time availability and pricing
- Detailed property information and amenities

### 🧳 Traveler-Centric Experience
- Save traveler information for faster bookings
- Manage all trip details in one place
- Get personalized recommendations based on your preferences

### 🔒 Secure & Reliable
- Secure payment processing
- Real-time pricing and availability
- Instant booking confirmations

## 🔄 User Flow

1. **Search**
   - Enter departure city and destination
   - Select travel dates and number of travelers
   - Choose between round-trip or one-way options

2. **Explore Options**
   - View flight options with key details (duration, stops, price)
   - See matched hotels with distance from airport
   - Filter and sort based on preferences

3. **Customize Your Trip**
   - Add extras like baggage, seat selection
   - Choose room types and hotel amenities
   - See real-time price updates

4. **Book with Confidence**
   - Enter passenger details
   - Secure payment processing
   - Receive instant confirmation

## 🛠️ Technical Highlights

- **Frontend**: Next.js 13+ with React 18
- **Styling**: Tailwind CSS with custom design system
- **State Management**: React Context API
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Custom component library with accessibility in mind
- **API**: Next.js API routes for secure server-side operations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- API keys for flight and hotel providers

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/obeyyyy/where2.git
   cd where2
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   ```

3. Set up environment variables
   ```bash
   cp .env.local.example .env.local
   # Update the values in .env.local
   ```

4. Run the development server
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📝 License

This project is proprietary and confidential. All rights reserved.

---

*Where2 - Your journey begins with a single search.*
