export default function DrugPageLoading() {
  return (
    <div className="bg-gradient-to-br from-white to-gray-50/50">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Header Skeleton */}
        <header className="mb-12" role="banner">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div className="flex-1">
              <div className="animate-pulse">
                {/* Drug Name */}
                <div className="h-12 bg-gray-200 rounded-lg mb-3 w-2/3"></div>
                {/* Generic Name */}
                <div className="h-6 bg-gray-200 rounded mb-6 w-1/2"></div>
                {/* Manufacturer and badges */}
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-4 bg-gray-200 rounded w-48"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>

            {/* Quick Info Panel Skeleton */}
            <div className="lg:w-80">
              <div className="border rounded-xl p-6 bg-white shadow-sm">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded mb-4 w-1/2"></div>
                  <div className="space-y-3">
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                      <div className="flex gap-2">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="h-6 bg-gray-200 rounded w-12"></div>
                      </div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-12 mb-1"></div>
                      <div className="h-6 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div>
                      <div className="h-4 bg-gray-200 rounded w-20 mb-1"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="xl:col-span-2 space-y-6">
            <div className="animate-pulse">
              {/* Essential Information Accordion */}
              <div className="border rounded-xl p-4 bg-white shadow-sm mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="flex gap-2">
                    <div className="h-5 bg-gray-200 rounded w-8"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="space-y-6">
                  {/* Indications */}
                  <div className="border rounded-lg p-4 bg-green-50/50">
                    <div className="h-5 bg-gray-200 rounded w-24 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    </div>
                  </div>

                  {/* Dosing */}
                  <div className="border rounded-lg p-4">
                    <div className="h-5 bg-gray-200 rounded w-32 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>

                  {/* Warnings */}
                  <div className="border rounded-lg p-4 bg-yellow-50/50">
                    <div className="h-5 bg-gray-200 rounded w-20 mb-3"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-full"></div>
                      <div className="h-4 bg-gray-200 rounded w-4/5"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Accordions */}
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-xl p-4 bg-white shadow-sm mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-6 bg-gray-200 rounded w-40"></div>
                    <div className="flex gap-2">
                      <div className="h-5 bg-gray-200 rounded w-6"></div>
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                    </div>
                  </div>
                  <div className="h-32 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <div className="animate-pulse">
              {/* Drug Identifiers */}
              <div className="border rounded-xl p-6 bg-white shadow-sm mb-6">
                <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-4 bg-gray-200 rounded w-12"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Drugs */}
              <div className="border rounded-xl p-6 bg-white shadow-sm mb-6">
                <div className="h-6 bg-gray-200 rounded w-28 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-40 mb-4"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="h-5 bg-gray-200 rounded w-32"></div>
                        <div className="h-5 bg-gray-200 rounded w-16"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Information */}
              <div className="border rounded-xl p-6 bg-white shadow-sm mb-6">
                <div className="h-6 bg-gray-200 rounded w-36 mb-4"></div>
                <div className="space-y-4">
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-20"></div>
                      <div className="h-6 bg-gray-200 rounded w-14"></div>
                    </div>
                  </div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-16 mb-2"></div>
                    <div className="flex gap-2">
                      <div className="h-6 bg-gray-200 rounded w-12"></div>
                      <div className="h-6 bg-gray-200 rounded w-18"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="border rounded-xl p-6 bg-white shadow-sm">
                <div className="h-6 bg-gray-200 rounded w-20 mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i}>
                      <div className="h-4 bg-gray-200 rounded w-24 mb-1"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Skeleton */}
        <footer className="mt-12 text-center border-t pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-96 mx-auto"></div>
          </div>
        </footer>
      </div>
    </div>
  )
}
