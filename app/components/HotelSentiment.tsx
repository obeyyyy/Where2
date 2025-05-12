import React from 'react';

interface HotelSentimentProps {
  sentiment: any | null;
}

const HotelSentiment: React.FC<HotelSentimentProps> = ({ sentiment }) => {
  if (!sentiment) return null;

  const { overallRating, numberOfRatings, numberOfReviews, sentiments } = sentiment;

  return (
    <div className="flex flex-col gap-1 mt-2 text-xs text-gray-600">
      <div>
        <span className="font-semibold">Overall Rating: </span>
        <span>{overallRating !== undefined ? `${overallRating}/100` : 'N/A'}</span>
      </div>
      <div>
        <span className="text-[10px] text-gray-500">
          {numberOfRatings !== undefined && `${numberOfRatings} ratings`}
          {numberOfReviews !== undefined && `, ${numberOfReviews} reviews`}
        </span>
      </div>
      {sentiments && typeof sentiments === 'object' && (
        <div>
          <span className="font-semibold">Categories:</span>
          <ul className="ml-2">
            {Object.entries(sentiments).map(([key, value]) => (
  <li key={key}>
    {key}: {typeof value === "number" ? `${value}/100` : "N/A"}
  </li>
))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HotelSentiment;
