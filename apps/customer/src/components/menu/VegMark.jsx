export default function VegMark({ isVeg = true, size = 14, className = '' }) {
  const isVegetarian = isVeg !== false;
  const strokeColor = isVegetarian ? '#1B7A3E' : '#C93A1C';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-[4px] border-[1.5px] bg-white p-[2px] shrink-0 shadow-2xs ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderColor: strokeColor,
      }}
      title={isVegetarian ? '100% Vegetarian' : 'Non-Vegetarian'}
      aria-label={isVegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
    >
      {isVegetarian ? (
        <span
          className="rounded-full bg-[#1B7A3E]"
          style={{
            width: `${Math.max(5, Math.round(size * 0.44))}px`,
            height: `${Math.max(5, Math.round(size * 0.44))}px`,
          }}
        />
      ) : (
        <span
          style={{
            width: 0,
            height: 0,
            borderLeft: `${Math.max(3, Math.round(size * 0.22))}px solid transparent`,
            borderRight: `${Math.max(3, Math.round(size * 0.22))}px solid transparent`,
            borderBottom: `${Math.max(5, Math.round(size * 0.44))}px solid #C93A1C`,
          }}
        />
      )}
    </span>
  );
}
