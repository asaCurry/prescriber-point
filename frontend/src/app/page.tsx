export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          PrescriberPoint
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-Enhanced Drug Information Platform for Healthcare Professionals
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-3">Drug Database</h2>
            <p className="text-gray-600">
              Comprehensive FDA-approved drug information with AI-enhanced content
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-3">Search & Filter</h2>
            <p className="text-gray-600">
              Advanced search capabilities across drugs and medical conditions
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-3">SEO Optimized</h2>
            <p className="text-gray-600">
              High-performance pages optimized for search engines and Core Web Vitals
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}