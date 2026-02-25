import React from 'react';

function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse bg-minimal-gray-100 rounded ${className}`} />;
}

export function SkeletonCollection() {
  return (
    <div className="container mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">Discogs Collection Analyzer</h1>
        <Shimmer className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Shimmer key={i} className="h-24" />
        ))}
      </div>
      <Shimmer className="h-64 w-full" />
    </div>
  );
}
