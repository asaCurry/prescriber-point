export default function Loading() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center animate-pulse">
          <svg className="w-6 h-6 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">Loading Prescriber Point</h2>
          <p className="text-muted-foreground">Please wait a moment...</p>
        </div>
      </div>
    </div>
  )
}
