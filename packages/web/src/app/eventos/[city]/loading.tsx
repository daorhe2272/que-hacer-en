export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-card overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200" />
            <div className="p-6 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-24" />
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-10 bg-gray-200 rounded w-full mt-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


