import React from "react";

const AvailabilityBadge = ({ availability }) => {
  return (
    <div className="flex items-center space-x-2">
      <div className="relative">
        <label
          className={`block w-20 h-[20px] rounded-lg cursor-pointer transition-colors ${
            availability ? "bg-[#03CF30]/25" : "bg-[#CF0303]/15"
          }`}
        >
          <span
            className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold ${
              availability ? "text-[#03CF30]" : "text-[#CF0303]"
            }`}
          >
            {availability ? "Disponible" : "No disponible"}
          </span>
        </label>
      </div>
    </div>
  );
};

export default AvailabilityBadge;
