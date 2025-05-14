import React from "react";

const faqs = [
  {
    question: "How do I book a flight and hotel together?",
    answer: "Simply enter your budget, destination, and dates, then browse the curated packages. You can book both in one seamless process!",
  },
  {
    question: "Is my payment secure?",
    answer: "Yes, all payments are processed securely with industry-standard encryption.",
  },
  {
    question: "Can I cancel or change my booking?",
    answer: "Most bookings offer flexible cancellation or change policies. Please check the package details before booking.",
  },
  {
    question: "Do you offer customer support?",
    answer: "Absolutely! Our support team is available 24/7 to help with any issues or questions.",
  },
];

const FAQSection: React.FC = () => (
  <section className="max-w-2xl mx-auto py-12 px-4">
    <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">Frequently Asked Questions</h2>
    <div className="space-y-6">
      {faqs.map((faq, idx) => (
        <div key={idx} className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-lg mb-2 text-[#FF8C00]">{faq.question}</h3>
          <p className="text-gray-600">{faq.answer}</p>
        </div>
      ))}
    </div>
  </section>
);

export default FAQSection;
