import React from 'react';

interface CustomButtonProps {
  onClick: () => void;
  active: boolean;
  children: React.ReactNode;
  className?: string; // Optional className prop
}

const CustomButton: React.FC<CustomButtonProps> = ({ onClick, active, children, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`py-3 rounded-xl font-medium transition focus:outline-none focus:ring-2 focus:ring-[#FFA500] border-2 border-[#FFA500] ${
        active ? 'bg-[#FFA500] text-white' : 'bg-[#FFF1D6] text-[#FFA500] hover:bg-[#FFA500] hover:text-white'
      } ${className} hover:shadow-md`}
    >
      {children}
    </button>
  );
};

export default CustomButton;
