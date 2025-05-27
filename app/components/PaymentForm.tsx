'use client';

import React, { useState } from 'react';

const PaymentForm: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Handle payment logic
    console.log('Submitting payment info:', formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-amber-200 shadow-md rounded-xl p-6 w-full max-w-md mx-auto space-y-5"
    >
      <h2 className="text-xl font-semibold text-gray-800 mb-2 text-center">Payment Details</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-700 mb-1">Full Name</label>
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
            type="text"
            placeholder="John Doe"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-700 mb-1">Card Number</label>
          <input
            name="cardNumber"
            value={formData.cardNumber}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
            type="text"
            placeholder="1234 5678 9012 3456"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Expiry Date</label>
            <input
              name="expiry"
              value={formData.expiry}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
              type="text"
              placeholder="MM/YY"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">CVV</label>
            <input
              name="cvv"
              value={formData.cvv}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300"
              type="password"
              placeholder="•••"
              required
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-amber-300 text-gray-900 font-semibold py-2 rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-amber-400"
      >
        Confirm Payment
      </button>
    </form>
  );
};

export default PaymentForm;
